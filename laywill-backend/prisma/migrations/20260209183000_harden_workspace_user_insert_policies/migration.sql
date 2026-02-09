-- Ensure authenticated users can bootstrap their own profile/workspace
-- in environments where previous policy migrations were not applied.

-- Workspace INSERT
DROP POLICY IF EXISTS "Workspace can be created by auth user" ON "Workspace";
DROP POLICY IF EXISTS "Workspace insert" ON "Workspace";
DROP POLICY IF EXISTS "Workspace insert authenticated" ON "Workspace";

CREATE POLICY "Workspace insert authenticated"
ON "Workspace"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

-- User INSERT (needed when auth->public sync trigger lags/fails)
DROP POLICY IF EXISTS "User can insert own profile" ON "User";
DROP POLICY IF EXISTS "User insert own profile" ON "User";

CREATE POLICY "User can insert own profile"
ON "User"
FOR INSERT
TO authenticated
WITH CHECK (auth.uid()::text = id);
