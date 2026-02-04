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

export async function getCurrentWorkspaceId() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return getWorkspaceIdForUser(userId);
}
