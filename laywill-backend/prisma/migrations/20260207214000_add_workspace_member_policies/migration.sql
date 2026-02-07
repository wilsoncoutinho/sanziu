DROP POLICY IF EXISTS "WorkspaceMember select own" ON "WorkspaceMember";
DROP POLICY IF EXISTS "WorkspaceMember insert own" ON "WorkspaceMember";

CREATE POLICY "WorkspaceMember select own"
ON "WorkspaceMember"
FOR SELECT
TO authenticated
USING ("userId" = auth.uid()::text);

CREATE POLICY "WorkspaceMember insert own"
ON "WorkspaceMember"
FOR INSERT
TO authenticated
WITH CHECK ("userId" = auth.uid()::text);
