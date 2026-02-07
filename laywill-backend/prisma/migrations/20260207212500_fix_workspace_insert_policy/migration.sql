DROP POLICY IF EXISTS "Workspace insert" ON "Workspace";
DROP POLICY IF EXISTS "Workspace insert authenticated" ON "Workspace";

CREATE POLICY "Workspace insert authenticated"
ON "Workspace"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);
