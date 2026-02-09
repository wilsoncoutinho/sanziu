import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

const CURRENT_WORKSPACE_KEY = "@meuappfinancas:currentWorkspaceId";
const MEMBER_INSERT_MAX_ATTEMPTS = 4;
const MEMBER_INSERT_RETRY_MS = 600;
const DEFAULT_CATEGORIES: Array<{ name: string; type: "EXPENSE" }> = [
  { name: "Lanches", type: "EXPENSE" },
  { name: "Mercado", type: "EXPENSE" },
  { name: "Transporte", type: "EXPENSE" },
  { name: "Serviços", type: "EXPENSE" },
  { name: "Lazer", type: "EXPENSE" },
  { name: "Saúde", type: "EXPENSE" },
  { name: "Educação", type: "EXPENSE" },
  { name: "Eletrônicos", type: "EXPENSE" },
  { name: "Vestuário", type: "EXPENSE" },
  { name: "Casa", type: "EXPENSE" },
  { name: "Outros", type: "EXPENSE" },
];
const LEGACY_CATEGORIES_TO_CLEAN = new Set(["Alimentacao", "Moradia", "Saude", "Salario", "Extras"]);

export type WorkspaceResult = {
  workspaceId: string | null;
  error?: string;
  stage?: string;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function bootstrapWorkspaceViaRpc(workspaceName: string): Promise<WorkspaceResult> {
  const { data, error } = await supabase.rpc("bootstrap_workspace_for_current_user", {
    p_workspace_name: workspaceName,
  });

  if (error) {
    return { workspaceId: null, error: error.message, stage: "bootstrapWorkspaceViaRpc.rpc" };
  }

  const workspaceId = typeof data === "string" ? data : data?.toString?.() ?? null;
  if (!workspaceId) {
    return { workspaceId: null, error: "RPC sem workspaceId", stage: "bootstrapWorkspaceViaRpc.emptyResult" };
  }

  await AsyncStorage.setItem(CURRENT_WORKSPACE_KEY, workspaceId);
  return { workspaceId };
}

async function ensureWorkspaceDefaults(workspaceId: string): Promise<{ ok: boolean; error?: string; stage?: string }> {
  const { data: accounts, error: accountSelectError } = await supabase
    .from("Account")
    .select("id")
    .eq("workspaceId", workspaceId)
    .limit(1);
  if (accountSelectError) {
    return { ok: false, error: accountSelectError.message, stage: "ensureWorkspaceDefaults.selectAccount" };
  }

  if (!accounts || accounts.length === 0) {
    const { error: accountInsertError } = await supabase.from("Account").insert({
      workspaceId,
      name: "Carteira",
      type: "WALLET",
      initialBal: 0,
    });
    if (accountInsertError) {
      return { ok: false, error: accountInsertError.message, stage: "ensureWorkspaceDefaults.insertAccount" };
    }
  }

  const { data: categories, error: categorySelectError } = await supabase
    .from("Category")
    .select("id, name, type")
    .eq("workspaceId", workspaceId);
  if (categorySelectError) {
    return { ok: false, error: categorySelectError.message, stage: "ensureWorkspaceDefaults.selectCategory" };
  }

  const categoryList = categories || [];
  const existingKeys = new Set(categoryList.map((c: any) => `${c.name}::${c.type}`));
  const missing = DEFAULT_CATEGORIES.filter((c) => !existingKeys.has(`${c.name}::${c.type}`)).map((c) => ({
    workspaceId,
    name: c.name,
    type: c.type,
  }));

  if (missing.length > 0) {
    const { error: categoryInsertError } = await supabase.from("Category").insert(missing);
    if (categoryInsertError) {
      return { ok: false, error: categoryInsertError.message, stage: "ensureWorkspaceDefaults.insertCategory" };
    }
  }

  const legacyCandidates = categoryList.filter(
    (c: any) => LEGACY_CATEGORIES_TO_CLEAN.has(String(c.name)) || c.type === "INCOME"
  );
  if (legacyCandidates.length > 0) {
    const candidateIds = legacyCandidates.map((c: any) => c.id);
    const { data: usedTx, error: usedTxError } = await supabase
      .from("Transaction")
      .select("categoryId")
      .eq("workspaceId", workspaceId)
      .in("categoryId", candidateIds);

    if (!usedTxError) {
      const usedIds = new Set((usedTx || []).map((t: any) => t.categoryId).filter(Boolean));
      const safeToDelete = candidateIds.filter((id: string) => !usedIds.has(id));
      if (safeToDelete.length > 0) {
        await supabase.from("Category").delete().in("id", safeToDelete);
      }
    }
  }

  return { ok: true };
}

async function ensureUserProfile(userId: string): Promise<{ ok: boolean; error?: string; stage?: string }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUser = sessionData.session?.user ?? null;

  let authUser = sessionUser;
  if (!authUser) {
    const { data: userData, error: authError } = await supabase.auth.getUser();
    if (authError) {
      return { ok: false, error: authError.message, stage: "ensureUserProfile.authGetUser" };
    }
    authUser = userData.user ?? null;
  }

  const email = authUser?.email?.trim().toLowerCase();
  if (!email) {
    return { ok: false, error: "Email do usuario ausente", stage: "ensureUserProfile.missingEmail" };
  }
  const name = ((authUser?.user_metadata as any)?.full_name || "").trim() || null;

  for (let attempt = 1; attempt <= MEMBER_INSERT_MAX_ATTEMPTS; attempt++) {
    const { data: existing, error: existingError } = await supabase
      .from("User")
      .select("id")
      .eq("id", userId)
      .maybeSingle();

    if (existingError) {
      return { ok: false, error: existingError.message, stage: "ensureUserProfile.selectUser" };
    }
    if (existing?.id) return { ok: true };

    const { error: insertError } = await supabase.from("User").insert({
      id: userId,
      email,
      name,
    });

    if (!insertError) return { ok: true };
    if (attempt < MEMBER_INSERT_MAX_ATTEMPTS) {
      await delay(MEMBER_INSERT_RETRY_MS);
      continue;
    }
    return { ok: false, error: insertError.message, stage: "ensureUserProfile.insertUser" };
  }

  return { ok: false, error: "Falha ao garantir perfil", stage: "ensureUserProfile" };
}

export async function getCurrentUserId() {
  const { data: sessionData } = await supabase.auth.getSession();
  const sessionUserId = sessionData.session?.user?.id ?? null;
  if (sessionUserId) return sessionUserId;

  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

export async function getWorkspaceIdForUser(userId: string): Promise<WorkspaceResult> {
  const { data, error } = await supabase
    .from("WorkspaceMember")
    .select("workspaceId")
    .eq("userId", userId)
    .order("createdAt", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return { workspaceId: null, error: error.message, stage: "getWorkspaceIdForUser" };
  return { workspaceId: data?.workspaceId ?? null };
}

async function createWorkspaceForUser(userId: string): Promise<WorkspaceResult> {
  const profile = await ensureUserProfile(userId);
  if (!profile.ok) {
    return {
      workspaceId: null,
      error: profile.error || "Falha ao preparar perfil do usuario",
      stage: profile.stage || "createWorkspaceForUser.ensureUserProfile",
    };
  }

  const { data: userData } = await supabase.auth.getUser();
  const displayName =
    (userData?.user?.user_metadata as any)?.full_name || userData?.user?.email || "Meu Workspace";
  const workspaceName = displayName === "Meu Workspace" ? displayName : `Workspace de ${displayName}`;

  let workspace: { id: string } | null = null;
  let workspaceError: { message: string } | null = null;
  for (let attempt = 1; attempt <= MEMBER_INSERT_MAX_ATTEMPTS; attempt++) {
    const { data, error } = await supabase
      .from("Workspace")
      .insert({ name: workspaceName, currency: "BRL" })
      .select("id")
      .single();

    if (!error && data?.id) {
      workspace = { id: data.id };
      workspaceError = null;
      break;
    }

    workspaceError = { message: error?.message || "Falha ao criar workspace" };
    if (attempt < MEMBER_INSERT_MAX_ATTEMPTS) {
      await supabase.auth.refreshSession().catch(() => null);
      await delay(MEMBER_INSERT_RETRY_MS);
    }
  }

  if (workspaceError || !workspace?.id) {
    const isRlsWorkspaceError = /row-level security/i.test(workspaceError?.message || "");
    if (isRlsWorkspaceError) {
      const rpcFallback = await bootstrapWorkspaceViaRpc(workspaceName);
      if (rpcFallback.workspaceId) {
        await ensureWorkspaceDefaults(rpcFallback.workspaceId);
        return rpcFallback;
      }
      return {
        workspaceId: null,
        error: "RLS bloqueou INSERT em Workspace e fallback RPC falhou: " + (rpcFallback.error || "erro desconhecido"),
        stage: "createWorkspaceForUser.workspaceInsertRls.rpcFallback",
      };
    }

    return { workspaceId: null, error: workspaceError?.message || "Falha ao criar workspace", stage: "createWorkspaceForUser" };
  }

  let memberError: { message: string } | null = null;
  for (let attempt = 1; attempt <= MEMBER_INSERT_MAX_ATTEMPTS; attempt++) {
    const { error } = await supabase.from("WorkspaceMember").insert({
      workspaceId: workspace.id,
      userId,
      role: "OWNER",
    });

    if (!error) {
      memberError = null;
      break;
    }

    await ensureUserProfile(userId);
    memberError = { message: error.message };
    if (attempt < MEMBER_INSERT_MAX_ATTEMPTS) await delay(MEMBER_INSERT_RETRY_MS);
  }

  if (memberError) {
    const existing = await getWorkspaceIdForUser(userId);
    if (existing.workspaceId) return existing;
    return { workspaceId: null, error: memberError.message, stage: "createWorkspaceForUser.memberInsert" };
  }

  await AsyncStorage.setItem(CURRENT_WORKSPACE_KEY, workspace.id);
  const defaults = await ensureWorkspaceDefaults(workspace.id);
  if (!defaults.ok) {
    return {
      workspaceId: workspace.id,
      error: defaults.error,
      stage: defaults.stage || "createWorkspaceForUser.ensureWorkspaceDefaults",
    };
  }

  return { workspaceId: workspace.id };
}

export async function getCurrentWorkspaceId(): Promise<WorkspaceResult> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { workspaceId: null, error: "Usuário não autenticado", stage: "getCurrentWorkspaceId" };
  }

  const stored = await AsyncStorage.getItem(CURRENT_WORKSPACE_KEY);
  if (stored) {
    const { data, error } = await supabase
      .from("WorkspaceMember")
      .select("id")
      .eq("userId", userId)
      .eq("workspaceId", stored)
      .maybeSingle();
    if (!error && data?.id) {
      await ensureWorkspaceDefaults(stored);
      return { workspaceId: stored };
    }
  }

  const existing = await getWorkspaceIdForUser(userId);
  if (existing.workspaceId) {
    await ensureWorkspaceDefaults(existing.workspaceId);
    return existing;
  }

  const created = await createWorkspaceForUser(userId);
  if (created.workspaceId) {
    await ensureWorkspaceDefaults(created.workspaceId);
    return created;
  }

  const retry = await getWorkspaceIdForUser(userId);
  if (retry.workspaceId) {
    await ensureWorkspaceDefaults(retry.workspaceId);
    return retry;
  }

  return created;
}

export async function setCurrentWorkspaceId(workspaceId: string) {
  await AsyncStorage.setItem(CURRENT_WORKSPACE_KEY, workspaceId);
}
