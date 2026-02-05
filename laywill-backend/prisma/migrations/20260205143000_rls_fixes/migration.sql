-- Allow inserting user profile tied to auth.uid()
DROP POLICY IF EXISTS "User can insert own profile" ON "User";
CREATE POLICY "User can insert own profile"
ON "User" FOR INSERT
WITH CHECK (auth.uid()::text = id OR auth.role() = 'service_role');

-- Allow a user to become the first member of a newly created workspace
DROP POLICY IF EXISTS "User can join empty workspace" ON "WorkspaceMember";
CREATE POLICY "User can join empty workspace"
ON "WorkspaceMember" FOR INSERT
WITH CHECK (
  "WorkspaceMember"."userId" = auth.uid()::text
  AND NOT EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "WorkspaceMember"."workspaceId"
  )
);
