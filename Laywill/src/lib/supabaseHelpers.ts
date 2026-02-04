import { supabase } from "./supabase";

export async function getCurrentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user?.id ?? null;
}

export async function getWorkspaceIdForUser(userId: string) {
  const { data, error } = await supabase
    .from("WorkspaceMember")
    .select("workspaceId")
    .eq("userId", userId)
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data?.workspaceId ?? null;
}

async function createWorkspaceForUser(userId: string) {
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

  if (workspaceError || !workspace?.id) return null;

  const { error: memberError } = await supabase.from("WorkspaceMember").insert({
    workspaceId: workspace.id,
    userId,
    role: "OWNER",
  });

  if (memberError) {
    const existing = await getWorkspaceIdForUser(userId);
    return existing ?? workspace.id;
  }

  return workspace.id;
}

export async function getCurrentWorkspaceId() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  const existing = await getWorkspaceIdForUser(userId);
  if (existing) return existing;
  return createWorkspaceForUser(userId);
}
