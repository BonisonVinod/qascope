-- QAScope migration 013: User choice memory
-- Run in Supabase SQL Editor. Idempotent.

-- -----------------------------------------------------------
-- 1. user_preferences_log table — immutable audit log of user
--    choices and form configurations. Used to surface "pick up where
--    you left off" recommendations.
-- -----------------------------------------------------------
create table if not exists public.user_preferences_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  workspace_id uuid not null references public.clients(id) on delete cascade,
  surface text not null,                -- e.g., 'report_filters', 'report_template'
  payload jsonb not null default '{}'::jsonb,  -- arbitrary config blob
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------
-- 2. Indexes for performance
-- -----------------------------------------------------------
create index if not exists user_preferences_log_user_surface_idx
  on public.user_preferences_log(user_id, surface, created_at desc);

create index if not exists user_preferences_log_workspace_idx
  on public.user_preferences_log(workspace_id);

-- -----------------------------------------------------------
-- 3. RLS — user-scoped isolation
-- -----------------------------------------------------------
alter table if exists public.user_preferences_log enable row level security;

drop policy if exists "tenant_user_preferences_log" on public.user_preferences_log;

create policy "tenant_user_preferences_log"
  on public.user_preferences_log for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -----------------------------------------------------------
-- 4. SQL RPC: get_user_preference_rollup
--    Returns the N most-recently-used preference configs for a
--    given surface, grouped by similarity (for dedup). Used to
--    power the "pick up where you left off" chip.
-- -----------------------------------------------------------
create or replace function public.get_user_preference_rollup(
  p_user_id uuid,
  p_workspace_id uuid,
  p_surface text,
  p_limit int default 5
)
returns table (
  payload jsonb,
  last_used timestamptz,
  usage_count int
) language sql stable security definer as $$
  select
    payload,
    max(created_at) as last_used,
    count(*) as usage_count
  from public.user_preferences_log
  where user_id = p_user_id
    and workspace_id = p_workspace_id
    and surface = p_surface
  group by payload
  order by last_used desc
  limit p_limit;
$$;
