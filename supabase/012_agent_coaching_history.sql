-- QAScope migration 012: Per-agent coaching history
-- Run in Supabase SQL Editor. Idempotent.

-- -----------------------------------------------------------
-- 1. agent_coaching_history table — immutable log of per-criterion
--    scores per agent per ISO week. Used to surface performance trends
--    and coaching guidance to the scorer at eval time.
-- -----------------------------------------------------------
create table if not exists public.agent_coaching_history (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.clients(id) on delete cascade,
  agent_id uuid not null references public.agents(id) on delete cascade,
  criterion_id uuid not null references public.qa_criteria(id) on delete restrict,
  ai_score int not null check (ai_score in (0, 1, 2)),
  final_score int,                      -- populated post-review if overridden
  conversation_id uuid references public.conversations(id) on delete set null,
  week_iso text not null,               -- e.g., "2026-W18" (ISO 8601 format)
  notes text,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------
-- 2. Indexes for performance
-- -----------------------------------------------------------
create index if not exists agent_coaching_history_agent_criterion_week_idx
  on public.agent_coaching_history(agent_id, criterion_id, week_iso desc);

create index if not exists agent_coaching_history_workspace_idx
  on public.agent_coaching_history(workspace_id);

-- -----------------------------------------------------------
-- 3. RLS — workspace isolation
-- -----------------------------------------------------------
alter table if exists public.agent_coaching_history enable row level security;

drop policy if exists "tenant_agent_coaching_history" on public.agent_coaching_history;

create policy "tenant_agent_coaching_history"
  on public.agent_coaching_history for all
  using (workspace_id = public.current_client_id())
  with check (workspace_id = public.current_client_id());
