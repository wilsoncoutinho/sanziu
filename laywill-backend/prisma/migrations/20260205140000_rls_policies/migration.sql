-- Enable Row Level Security (RLS)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Workspace" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WorkspaceInvite" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailVerificationCode" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PasswordResetToken" ENABLE ROW LEVEL SECURITY;

-- User
DROP POLICY IF EXISTS "User can read own profile" ON "User";
CREATE POLICY "User can read own profile"
ON "User" FOR SELECT
USING (
  auth.uid()::text = id OR auth.role() = 'service_role'
);

DROP POLICY IF EXISTS "User can update own profile" ON "User";
CREATE POLICY "User can update own profile"
ON "User" FOR UPDATE
USING (auth.uid()::text = id OR auth.role() = 'service_role')
WITH CHECK (auth.uid()::text = id OR auth.role() = 'service_role');

-- Workspace
DROP POLICY IF EXISTS "Workspace member can read" ON "Workspace";
CREATE POLICY "Workspace member can read"
ON "Workspace" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Workspace".id
      AND wm."userId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Workspace member can update" ON "Workspace";
CREATE POLICY "Workspace member can update"
ON "Workspace" FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Workspace".id
      AND wm."userId" = auth.uid()::text
      AND wm.role IN ('OWNER', 'EDITOR')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Workspace".id
      AND wm."userId" = auth.uid()::text
      AND wm.role IN ('OWNER', 'EDITOR')
  )
);

DROP POLICY IF EXISTS "Workspace owner can delete" ON "Workspace";
CREATE POLICY "Workspace owner can delete"
ON "Workspace" FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Workspace".id
      AND wm."userId" = auth.uid()::text
      AND wm.role = 'OWNER'
  )
);

DROP POLICY IF EXISTS "Workspace can be created by auth user" ON "Workspace";
CREATE POLICY "Workspace can be created by auth user"
ON "Workspace" FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- WorkspaceMember
DROP POLICY IF EXISTS "Members can read workspace members" ON "WorkspaceMember";
CREATE POLICY "Members can read workspace members"
ON "WorkspaceMember" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "WorkspaceMember"."workspaceId"
      AND wm."userId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Owner can manage members" ON "WorkspaceMember";
CREATE POLICY "Owner can manage members"
ON "WorkspaceMember" FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND (
    -- Owner adding someone
    EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm
      WHERE wm."workspaceId" = "WorkspaceMember"."workspaceId"
        AND wm."userId" = auth.uid()::text
        AND wm.role = 'OWNER'
    )
    -- User accepting an invite
    OR (
      "WorkspaceMember"."userId" = auth.uid()::text
      AND EXISTS (
        SELECT 1 FROM "WorkspaceInvite" wi
        WHERE wi."workspaceId" = "WorkspaceMember"."workspaceId"
          AND wi."usedAt" IS NULL
          AND wi."expiresAt" > NOW()
          AND (
            wi.email IS NULL
            OR LOWER(wi.email) = LOWER(auth.jwt() ->> 'email')
          )
      )
    )
  )
);

DROP POLICY IF EXISTS "Owner can update members" ON "WorkspaceMember";
CREATE POLICY "Owner can update members"
ON "WorkspaceMember" FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "WorkspaceMember"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role = 'OWNER'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "WorkspaceMember"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role = 'OWNER'
  )
);

DROP POLICY IF EXISTS "Owner can remove members" ON "WorkspaceMember";
CREATE POLICY "Owner can remove members"
ON "WorkspaceMember" FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "WorkspaceMember"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role = 'OWNER'
  )
  OR "WorkspaceMember"."userId" = auth.uid()::text
);

-- Account
DROP POLICY IF EXISTS "Members can read accounts" ON "Account";
CREATE POLICY "Members can read accounts"
ON "Account" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Account"."workspaceId"
      AND wm."userId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Editors can write accounts" ON "Account";
CREATE POLICY "Editors can write accounts"
ON "Account" FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Account"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role IN ('OWNER', 'EDITOR')
  )
);

DROP POLICY IF EXISTS "Editors can update accounts" ON "Account";
CREATE POLICY "Editors can update accounts"
ON "Account" FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Account"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role IN ('OWNER', 'EDITOR')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Account"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role IN ('OWNER', 'EDITOR')
  )
);

DROP POLICY IF EXISTS "Editors can delete accounts" ON "Account";
CREATE POLICY "Editors can delete accounts"
ON "Account" FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Account"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role IN ('OWNER', 'EDITOR')
  )
);

-- Category
DROP POLICY IF EXISTS "Members can read categories" ON "Category";
CREATE POLICY "Members can read categories"
ON "Category" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Category"."workspaceId"
      AND wm."userId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Editors can write categories" ON "Category";
CREATE POLICY "Editors can write categories"
ON "Category" FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Category"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role IN ('OWNER', 'EDITOR')
  )
);

DROP POLICY IF EXISTS "Editors can update categories" ON "Category";
CREATE POLICY "Editors can update categories"
ON "Category" FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Category"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role IN ('OWNER', 'EDITOR')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Category"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role IN ('OWNER', 'EDITOR')
  )
);

DROP POLICY IF EXISTS "Editors can delete categories" ON "Category";
CREATE POLICY "Editors can delete categories"
ON "Category" FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Category"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role IN ('OWNER', 'EDITOR')
  )
);

-- Transaction
DROP POLICY IF EXISTS "Members can read transactions" ON "Transaction";
CREATE POLICY "Members can read transactions"
ON "Transaction" FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Transaction"."workspaceId"
      AND wm."userId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "Editors can write transactions" ON "Transaction";
CREATE POLICY "Editors can write transactions"
ON "Transaction" FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Transaction"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role IN ('OWNER', 'EDITOR')
  )
);

DROP POLICY IF EXISTS "Editors can update transactions" ON "Transaction";
CREATE POLICY "Editors can update transactions"
ON "Transaction" FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Transaction"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role IN ('OWNER', 'EDITOR')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Transaction"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role IN ('OWNER', 'EDITOR')
  )
);

DROP POLICY IF EXISTS "Editors can delete transactions" ON "Transaction";
CREATE POLICY "Editors can delete transactions"
ON "Transaction" FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "Transaction"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role IN ('OWNER', 'EDITOR')
  )
);

-- WorkspaceInvite
DROP POLICY IF EXISTS "Members can read invites" ON "WorkspaceInvite";
CREATE POLICY "Members can read invites"
ON "WorkspaceInvite" FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    EXISTS (
      SELECT 1 FROM "WorkspaceMember" wm
      WHERE wm."workspaceId" = "WorkspaceInvite"."workspaceId"
        AND wm."userId" = auth.uid()::text
    )
    OR (
      "WorkspaceInvite".email IS NULL
      AND "WorkspaceInvite"."usedAt" IS NULL
      AND "WorkspaceInvite"."expiresAt" > NOW()
    )
    OR (
      "WorkspaceInvite".email IS NOT NULL
      AND LOWER("WorkspaceInvite".email) = LOWER(auth.jwt() ->> 'email')
      AND "WorkspaceInvite"."usedAt" IS NULL
      AND "WorkspaceInvite"."expiresAt" > NOW()
    )
  )
);

DROP POLICY IF EXISTS "Owner can write invites" ON "WorkspaceInvite";
CREATE POLICY "Owner can write invites"
ON "WorkspaceInvite" FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "WorkspaceInvite"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role = 'OWNER'
  )
);

DROP POLICY IF EXISTS "Owner can update invites" ON "WorkspaceInvite";
CREATE POLICY "Owner can update invites"
ON "WorkspaceInvite" FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "WorkspaceInvite"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role = 'OWNER'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "WorkspaceInvite"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role = 'OWNER'
  )
);

DROP POLICY IF EXISTS "Owner can delete invites" ON "WorkspaceInvite";
CREATE POLICY "Owner can delete invites"
ON "WorkspaceInvite" FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM "WorkspaceMember" wm
    WHERE wm."workspaceId" = "WorkspaceInvite"."workspaceId"
      AND wm."userId" = auth.uid()::text
      AND wm.role = 'OWNER'
  )
);

-- EmailVerificationCode / PasswordResetToken
DROP POLICY IF EXISTS "Service role only email verification" ON "EmailVerificationCode";
CREATE POLICY "Service role only email verification"
ON "EmailVerificationCode" FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Service role only password reset" ON "PasswordResetToken";
CREATE POLICY "Service role only password reset"
ON "PasswordResetToken" FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
