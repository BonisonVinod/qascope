-- QAScope migration 004b: Team invitations
-- IMPORTANT: Run 004a_user_role_enum.sql FIRST in a separate query tab,
-- otherwise this file will fail because the 'qa_reviewer' enum value
-- won't be visible inside this transaction.
-- Safe to re-run: every statement is idempotent.

-- -----------------------------------------------------------
-- 1. Invitations table
--    Admin creates one row per invited teammate.
--    The token is a random string; the invite URL is
--    /accept-invite?token=<token>. When the invitee signs up
--    via that link, public.users is created for the existing
--    client_id with the configured role.
-- -----------------------------------------------------------
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  email text not null,
  role user_role not null default 'qa_reviewer',
  team_name text,                  -- optional: which team the new user belongs to
  token text not null unique,
  invited_by uuid references public.users(id) on delete set null,
  accepted_at timestamptz,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index if not exists invitations_client_idx on public.invitations(client_id);
create index if not exists invitations_token_idx on public.invitations(token);
create index if not exists invitations_email_idx on public.invitations(lower(email));

-- -----------------------------------------------------------
-- 2. RLS so admins/qa_managers can manage invites for their
--    own client only. Acceptance lookups happen via service role
--    on the server, so anon access is not needed.
-- -----------------------------------------------------------
alter table public.invitations enable row level security;

drop policy if exists "tenant_invitations_select"  on public.invitations;
drop policy if exists "tenant_invitations_insert"  on public.invitations;
drop policy if exists "tenant_invitations_update"  on public.invitations;
drop policy if exists "tenant_invitations_delete"  on public.invitations;

create policy "tenant_invitations_select"
  on public.invitations for select
  using (client_id = public.current_client_id());

create policy "tenant_invitations_insert"
  on public.invitations for insert
  with check (client_id = public.current_client_id());

create policy "tenant_invitations_update"
  on public.invitations for update
  using (client_id = public.current_client_id());

create policy "tenant_invitations_delete"
  on public.invitations for delete
  using (client_id = public.current_client_id());

-- -----------------------------------------------------------
-- 3. Add team_name to public.users so invited members can be
--    associated with a team (matches agents.team_name semantic).
-- -----------------------------------------------------------
alter table public.users
  add column if not exists team_name text;
