-- Ensure pgcrypto for gen_random_uuid
create extension if not exists "pgcrypto";

-- Defaults for ids and timestamps
alter table "Account"
  alter column "id" set default gen_random_uuid()::text,
  alter column "createdAt" set default now(),
  alter column "updatedAt" set default now();

alter table "Category"
  alter column "id" set default gen_random_uuid()::text,
  alter column "createdAt" set default now(),
  alter column "updatedAt" set default now();

alter table "User"
  alter column "id" set default gen_random_uuid()::text,
  alter column "createdAt" set default now(),
  alter column "updatedAt" set default now();

alter table "Workspace"
  alter column "id" set default gen_random_uuid()::text,
  alter column "createdAt" set default now(),
  alter column "updatedAt" set default now();

alter table "WorkspaceInvite"
  alter column "id" set default gen_random_uuid()::text,
  alter column "createdAt" set default now();

alter table "WorkspaceMember"
  alter column "id" set default gen_random_uuid()::text,
  alter column "createdAt" set default now();

alter table "EmailVerificationCode"
  alter column "id" set default gen_random_uuid()::text,
  alter column "createdAt" set default now();

alter table "PasswordResetToken"
  alter column "id" set default gen_random_uuid()::text,
  alter column "createdAt" set default now();

-- updatedAt trigger helper
create or replace function set_updated_at()
returns trigger as $$
begin
  new."updatedAt" = now();
  return new;
end;
$$ language plpgsql;

-- updatedAt triggers
drop trigger if exists set_account_updated_at on "Account";
create trigger set_account_updated_at
before update on "Account"
for each row execute function set_updated_at();

drop trigger if exists set_category_updated_at on "Category";
create trigger set_category_updated_at
before update on "Category"
for each row execute function set_updated_at();

drop trigger if exists set_user_updated_at on "User";
create trigger set_user_updated_at
before update on "User"
for each row execute function set_updated_at();

drop trigger if exists set_workspace_updated_at on "Workspace";
create trigger set_workspace_updated_at
before update on "Workspace"
for each row execute function set_updated_at();

drop trigger if exists set_transaction_updated_at on "Transaction";
create trigger set_transaction_updated_at
before update on "Transaction"
for each row execute function set_updated_at();
