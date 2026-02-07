import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";
import { getCurrentWorkspaceId } from "../lib/supabaseHelpers";

type WorkspaceContextData = {
  workspaceId: string | null;
  loading: boolean;
  refreshWorkspace: () => Promise<string | null>;
};

const WorkspaceContext = createContext<WorkspaceContextData>({
  workspaceId: null,
  loading: true,
  refreshWorkspace: async () => null,
});

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshWorkspace = useCallback(async () => {
    if (!user) {
      setWorkspaceId(null);
      setLoading(false);
      return null;
    }
    setLoading(true);
    const wsResult = await getCurrentWorkspaceId();
    if (!wsResult.workspaceId && wsResult.error) {
      console.log("[workspace]", wsResult.stage, wsResult.error);
    }
    setWorkspaceId(wsResult.workspaceId);
    setLoading(false);
    return wsResult.workspaceId;
  }, [user]);

  useEffect(() => {
    refreshWorkspace();
  }, [refreshWorkspace]);

  const value = useMemo(
    () => ({ workspaceId, loading, refreshWorkspace }),
    [workspaceId, loading, refreshWorkspace]
  );

  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspace() {
  return useContext(WorkspaceContext);
}
