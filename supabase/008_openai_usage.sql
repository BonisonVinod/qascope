-- QAScope migration 008: OpenAI usage logging
-- IMPORTANT: Run 007_plan_enum.sql FIRST in its own SQL Editor tab.
-- This file is safe to re-run: every statement is idempotent.

-- -----------------------------------------------------------
-- 1. openai_usage: one row per OpenAI call we make on the
--    customer's behalf. Used to render a transparent "you owe
--    OpenAI ₹X this month" panel in /billing.
-- -----------------------------------------------------------
create table if not exists public.openai_usage (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  model text not null,
  feature text not null,                  -- 'scoring' | 'coaching' | 'report_template'
  prompt_tokens int not null default 0,
  completion_tokens int not null default 0,
  cost_inr_micro bigint not null default 0,  -- cost in 1e-6 INR ("micro-rupees") — keeps integer math tidy
  called_at timestamptz not null default now()
);

create index if not exists openai_usage_client_idx
  on public.openai_usage(client_id, called_at desc);

create index if not exists openai_usage_month_idx
  on public.openai_usage(client_id, date_trunc('month', called_at));

-- -----------------------------------------------------------
-- 2. RLS — tenant-scoped via client_id.
-- -----------------------------------------------------------
alter table public.openai_usage enable row level security;

drop policy if exists "tenant_openai_usage_select" on public.openai_usage;
drop policy if exists "tenant_openai_usage_insert" on public.openai_usage;

create policy "tenant_openai_usage_select"
  on public.openai_usage for select
  using (client_id = public.current_client_id());

create policy "tenant_openai_usage_insert"
  on public.openai_usage for insert
  with check (client_id = public.current_client_id());
