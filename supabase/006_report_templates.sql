-- QAScope migration 006: Saved report templates
-- Run in Supabase SQL Editor. Idempotent.

-- -----------------------------------------------------------
-- 1. report_templates: per-client saved report configurations.
--    The config column is a structured JSON document that the
--    template-execution engine reads at run time. No LLM call
--    is needed once a template is saved.
-- -----------------------------------------------------------
create table if not exists public.report_templates (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  description text,
  config jsonb not null,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists report_templates_client_idx
  on public.report_templates(client_id);

-- updated_at trigger
create or replace function public.report_templates_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists report_templates_touch on public.report_templates;
create trigger report_templates_touch
  before update on public.report_templates
  for each row execute function public.report_templates_touch_updated_at();

-- -----------------------------------------------------------
-- 2. RLS — tenant-scoped via client_id.
-- -----------------------------------------------------------
alter table public.report_templates enable row level security;

drop policy if exists "tenant_report_templates_select" on public.report_templates;
drop policy if exists "tenant_report_templates_insert" on public.report_templates;
drop policy if exists "tenant_report_templates_update" on public.report_templates;
drop policy if exists "tenant_report_templates_delete" on public.report_templates;

create policy "tenant_report_templates_select"
  on public.report_templates for select
  using (client_id = public.current_client_id());

create policy "tenant_report_templates_insert"
  on public.report_templates for insert
  with check (client_id = public.current_client_id());

create policy "tenant_report_templates_update"
  on public.report_templates for update
  using (client_id = public.current_client_id());

create policy "tenant_report_templates_delete"
  on public.report_templates for delete
  using (client_id = public.current_client_id());
