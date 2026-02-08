import { supabase } from "./supabase";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CURRENT_WORKSPACE_KEY = "@meuappfinancas:currentWorkspaceId";
const MEMBER_INSERT_MAX_ATTEMPTS = 4;
const MEMBER_INSERT_RETRY_MS = 600;

export type WorkspaceResult = {
  workspaceId: string | null;
  error?: string;
  stage?: string;
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function getCurrentUserId() {
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
  const { data: userData } = await supabase.auth.getUser();
  const displayName =
    (userData?.user?.user_metadata as any)?.full_name ||
    userData?.user?.email ||
    "Meu Workspace";
  const workspaceName =
    displayName === "Meu Workspace" ? displayName : `Workspace de ${displayName}`;

  const { data: workspace, error: workspaceError } = await supabase
    .from("Workspace")
    .insert({
      name: workspaceName,
      currency: "BRL",
    })
    .select("id")
    .single();

  if (workspaceError || !workspace?.id) {
    return {
      workspaceId: null,
      error: workspaceError?.message || "Falha ao criar workspace",
      stage: "createWorkspaceForUser",
    };
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

    memberError = { message: error.message };
    if (attempt < MEMBER_INSERT_MAX_ATTEMPTS) {
      await delay(MEMBER_INSERT_RETRY_MS);
    }
  }

  if (memberError) {
    const existing = await getWorkspaceIdForUser(userId);
    if (existing.workspaceId) return existing;
    return {
      workspaceId: null,
      error: memberError.message,
      stage: "createWorkspaceForUser.memberInsert",
    };
  }

  await AsyncStorage.setItem(CURRENT_WORKSPACE_KEY, workspace.id);

  // Cria uma conta padrão para evitar "Nenhuma conta"
  const { error: accountError } = await supabase.from("Account").insert({
    workspaceId: workspace.id,
    name: "Carteira",
    type: "WALLET",
    initialBal: 0,
  });
  if (accountError) {
    return {
      workspaceId: workspace.id,
      error: accountError.message,
      stage: "createWorkspaceForUser.accountInsert",
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
      return { workspaceId: stored };
    }
  }
  const existing = await getWorkspaceIdForUser(userId);
  if (existing.workspaceId) return existing;
  const created = await createWorkspaceForUser(userId);
  if (created.workspaceId) return created;

  const retry = await getWorkspaceIdForUser(userId);
  if (retry.workspaceId) return retry;
  return created;
}

export async function setCurrentWorkspaceId(workspaceId: string) {
  await AsyncStorage.setItem(CURRENT_WORKSPACE_KEY, workspaceId);
}
