-- QAScope migration 005: Per-rubric fatal rules
-- Run in Supabase SQL Editor on your existing database.
-- Safe to re-run: every statement is idempotent.

-- -----------------------------------------------------------
-- 1. fatal_rules: project-specific compliance rules attached
--    to a rubric. At scoring time the active rules are injected
--    into the critical-fail criterion prompt; ANY hit flips the
--    conversation to critical_fail.
-- -----------------------------------------------------------
create table if not exists public.fatal_rules (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null references public.qa_rubrics(id) on delete cascade,
  name text not null,
  description text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists fatal_rules_rubric_idx on public.fatal_rules(rubric_id);
create index if not exists fatal_rules_active_idx on public.fatal_rules(rubric_id) where active = true;

-- Touch updated_at on every update.
create or replace function public.fatal_rules_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists fatal_rules_touch on public.fatal_rules;
create trigger fatal_rules_touch
  before update on public.fatal_rules
  for each row execute function public.fatal_rules_touch_updated_at();

-- -----------------------------------------------------------
-- 2. RLS — tenant-scoped via the parent rubric's client_id.
-- -----------------------------------------------------------
alter table public.fatal_rules enable row level security;

drop policy if exists "tenant_fatal_rules_select" on public.fatal_rules;
drop policy if exists "tenant_fatal_rules_insert" on public.fatal_rules;
drop policy if exists "tenant_fatal_rules_update" on public.fatal_rules;
drop policy if exists "tenant_fatal_rules_delete" on public.fatal_rules;

create policy "tenant_fatal_rules_select"
  on public.fatal_rules for select
  using (
    exists (
      select 1 from public.qa_rubrics r
       where r.id = fatal_rules.rubric_id
         and r.client_id = public.current_client_id()
    )
  );

create policy "tenant_fatal_rules_insert"
  on public.fatal_rules for insert
  with check (
    exists (
      select 1 from public.qa_rubrics r
       where r.id = fatal_rules.rubric_id
         and r.client_id = public.current_client_id()
    )
  );

create policy "tenant_fatal_rules_update"
  on public.fatal_rules for update
  using (
    exists (
      select 1 from public.qa_rubrics r
       where r.id = fatal_rules.rubric_id
         and r.client_id = public.current_client_id()
    )
  );

create policy "tenant_fatal_rules_delete"
  on public.fatal_rules for delete
  using (
    exists (
      select 1 from public.qa_rubrics r
       where r.id = fatal_rules.rubric_id
         and r.client_id = public.current_client_id()
    )
  );
