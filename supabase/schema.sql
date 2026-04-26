-- QAScope — Postgres schema for Supabase
-- Run this in Supabase: SQL Editor → New Query → paste → Run
-- Prereq: Supabase project created, auth enabled (default)
-- Safe to re-run: drops everything first, then recreates.

-- =========================================================
-- Reset — drops all QAScope objects if they exist
-- (Safe: only touches tables/types created by this file)
-- =========================================================
drop table if exists public.subscriptions      cascade;
drop table if exists public.weekly_reports     cascade;
drop table if exists public.review_queue       cascade;
drop table if exists public.qa_score_details   cascade;
drop table if exists public.qa_scores          cascade;
drop table if exists public.qa_criteria        cascade;
drop table if exists public.qa_rubrics         cascade;
drop table if exists public.conversations      cascade;
drop table if exists public.agents             cascade;
drop table if exists public.users              cascade;
drop table if exists public.clients            cascade;

drop function if exists public.seed_default_rubric(uuid);
drop function if exists public.current_client_id();
drop function if exists public.sweep_review_sla();

drop type if exists subscription_status           cascade;
drop type if exists plan_name                     cascade;
drop type if exists review_decision               cascade;
drop type if exists second_reviewer_decision_type cascade;
drop type if exists first_reviewer_decision_type  cascade;
drop type if exists review_state                  cascade;
drop type if exists score_status                  cascade;
drop type if exists channel_type                  cascade;
drop type if exists user_role                     cascade;

-- =========================================================
-- Enums
-- =========================================================
create type user_role as enum ('admin', 'qa_manager', 'team_lead', 'viewer');
create type channel_type as enum ('chat', 'email', 'voice_transcript');
create type score_status as enum ('final', 'needs_review', 'critical_fail');
create type review_decision as enum ('pending', 'approved', 'overridden', 'rejected');
create type review_state as enum ('pending_first', 'pending_second', 'closed');
create type first_reviewer_decision_type as enum ('agree', 'disagree', 'auto_approved');
create type second_reviewer_decision_type as enum ('confirm_override', 'deny_override', 'auto_confirmed');
create type plan_name as enum ('pilot', 'growth', 'pro');
create type subscription_status as enum ('trialing', 'active', 'past_due', 'canceled');

-- =========================================================
-- Clients (tenants — each BPO is a client)
-- =========================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  active_plan plan_name default 'pilot',
  sla_hours int not null default 24,
  second_reviewer_user_id uuid,  -- FK to users(id) added after users table is created
  created_at timestamptz not null default now()
);

-- =========================================================
-- Users (app users — QA managers, team leads, etc.)
-- Links to auth.users (Supabase Auth)
-- =========================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  email text not null unique,
  role user_role not null default 'viewer',
  created_at timestamptz not null default now()
);

create index on public.users(client_id);

-- Add the self-referential FK now that users exists
alter table public.clients
  add constraint clients_second_reviewer_fk
  foreign key (second_reviewer_user_id)
  references public.users(id)
  on delete set null;

-- =========================================================
-- Agents (the support agents whose conversations get scored)
-- =========================================================
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  agent_name text not null,
  team_name text,
  employee_code text,
  created_at timestamptz not null default now(),
  unique (client_id, employee_code)
);

create index on public.agents(client_id);
create index on public.agents(team_name);

-- =========================================================
-- Conversations (support transcripts to be scored)
-- =========================================================
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  agent_id uuid references public.agents(id) on delete set null,
  channel channel_type not null,
  transcript_text text not null,
  conversation_date date not null,
  customer_id text,
  metadata_json jsonb default '{}'::jsonb,
  external_conversation_id text,  -- ID from the BPO's source system
  created_at timestamptz not null default now()
);

create index on public.conversations(client_id, conversation_date desc);
create index on public.conversations(agent_id);
create index on public.conversations(channel);

-- =========================================================
-- QA rubrics (each client can have multiple; one is default)
-- =========================================================
create table public.qa_rubrics (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  name text not null,
  version int not null default 1,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index on public.qa_rubrics(client_id);
-- Only one default rubric per client
create unique index on public.qa_rubrics(client_id) where is_default = true;

-- =========================================================
-- QA criteria (the weighted rows inside a rubric)
-- =========================================================
create table public.qa_criteria (
  id uuid primary key default gen_random_uuid(),
  rubric_id uuid not null references public.qa_rubrics(id) on delete cascade,
  name text not null,
  description text,
  weight int not null check (weight >= 0 and weight <= 100),
  critical_fail_boolean boolean not null default false,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index on public.qa_criteria(rubric_id);

-- =========================================================
-- QA scores (one per conversation+rubric pairing)
-- =========================================================
create table public.qa_scores (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  rubric_id uuid not null references public.qa_rubrics(id) on delete restrict,
  total_score numeric(5, 2) not null,    -- current effective score (mutates on override)
  confidence_score numeric(3, 2) not null,
  status score_status not null default 'final',   -- current effective status
  original_total_score numeric(5, 2) not null,    -- locked: what the AI first said
  original_status score_status not null,          -- locked: AI's initial status
  appealed_at timestamptz,                        -- set when an override resolved this score
  coaching_note text,
  created_at timestamptz not null default now(),
  unique (conversation_id, rubric_id)
);

create index on public.qa_scores(conversation_id);
create index on public.qa_scores(status);

-- =========================================================
-- QA score details (per-criterion breakdown)
-- =========================================================
create table public.qa_score_details (
  id uuid primary key default gen_random_uuid(),
  qa_score_id uuid not null references public.qa_scores(id) on delete cascade,
  criterion_id uuid not null references public.qa_criteria(id) on delete restrict,
  score int not null check (score in (0, 1, 2)),  -- 0=failed, 1=partial, 2=met
  confidence numeric(3, 2) not null,
  explanation text,
  evidence_span text,   -- the excerpt from the transcript backing this score
  created_at timestamptz not null default now(),
  unique (qa_score_id, criterion_id)
);

create index on public.qa_score_details(qa_score_id);

-- =========================================================
-- Review queue (low-confidence or critical-fail cases)
-- =========================================================
create table public.review_queue (
  id uuid primary key default gen_random_uuid(),
  qa_score_id uuid not null references public.qa_scores(id) on delete cascade,
  reason text not null,          -- "low_confidence" | "critical_fail" | "manual_flag"
  state review_state not null default 'pending_first',
  sla_deadline timestamptz,      -- when the CURRENT tier expires

  -- Tier 1 (team lead / first reviewer)
  first_reviewer_id uuid references public.users(id) on delete set null,
  first_reviewer_decision first_reviewer_decision_type,
  first_reviewer_at timestamptz,
  first_reviewer_notes text,

  -- Tier 2 (second reviewer, assigned by client setting)
  second_reviewer_id uuid references public.users(id) on delete set null,
  second_reviewer_decision second_reviewer_decision_type,
  second_reviewer_at timestamptz,
  second_reviewer_notes text,

  -- Legacy columns (kept for backward compatibility during migration; new code ignores them)
  assigned_to uuid references public.users(id) on delete set null,
  decision review_decision not null default 'pending',
  notes text,

  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index on public.review_queue(state);
create index on public.review_queue(sla_deadline) where state <> 'closed';
create index on public.review_queue(first_reviewer_id);
create index on public.review_queue(second_reviewer_id);
create index on public.review_queue(assigned_to);
create index on public.review_queue(decision);

-- =========================================================
-- Weekly reports (snapshot per client per week)
-- =========================================================
create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  week_start date not null,
  summary_json jsonb not null,
  report_url text,  -- link to generated HTML report (e.g., Supabase Storage)
  created_at timestamptz not null default now(),
  unique (client_id, week_start)
);

create index on public.weekly_reports(client_id, week_start desc);

-- =========================================================
-- Subscriptions (one active sub per client)
-- =========================================================
create table public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  plan_name plan_name not null,
  monthly_limit int not null,   -- max conversations per month
  status subscription_status not null default 'trialing',
  billing_cycle_start date not null,
  razorpay_subscription_id text,
  created_at timestamptz not null default now()
);

create index on public.subscriptions(client_id);

-- =========================================================
-- Row-Level Security (RLS) — tenant isolation
-- =========================================================
alter table public.clients        enable row level security;
alter table public.users          enable row level security;
alter table public.agents         enable row level security;
alter table public.conversations  enable row level security;
alter table public.qa_rubrics     enable row level security;
alter table public.qa_criteria    enable row level security;
alter table public.qa_scores      enable row level security;
alter table public.qa_score_details enable row level security;
alter table public.review_queue   enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.subscriptions  enable row level security;

-- Helper: get the current user's client_id
create or replace function public.current_client_id()
returns uuid
language sql
stable
security definer
as $$
  select client_id from public.users where id = auth.uid();
$$;

create policy "tenant_isolation_clients"
  on public.clients for select using (id = public.current_client_id());

create policy "tenant_isolation_users"
  on public.users for select using (client_id = public.current_client_id());

create policy "tenant_isolation_agents"
  on public.agents for all
  using (client_id = public.current_client_id())
  with check (client_id = public.current_client_id());

create policy "tenant_isolation_conversations"
  on public.conversations for all
  using (client_id = public.current_client_id())
  with check (client_id = public.current_client_id());

create policy "tenant_isolation_qa_rubrics"
  on public.qa_rubrics for all
  using (client_id = public.current_client_id())
  with check (client_id = public.current_client_id());

create policy "tenant_isolation_qa_criteria"
  on public.qa_criteria for all
  using (rubric_id in (select id from public.qa_rubrics where client_id = public.current_client_id()));

create policy "tenant_isolation_qa_scores"
  on public.qa_scores for all
  using (conversation_id in (select id from public.conversations where client_id = public.current_client_id()));

create policy "tenant_isolation_qa_score_details"
  on public.qa_score_details for all
  using (qa_score_id in (select qs.id from public.qa_scores qs join public.conversations c on qs.conversation_id = c.id where c.client_id = public.current_client_id()));

create policy "tenant_isolation_review_queue"
  on public.review_queue for all
  using (qa_score_id in (select qs.id from public.qa_scores qs join public.conversations c on qs.conversation_id = c.id where c.client_id = public.current_client_id()));

create policy "tenant_isolation_weekly_reports"
  on public.weekly_reports for all
  using (client_id = public.current_client_id());

create policy "tenant_isolation_subscriptions"
  on public.subscriptions for all
  using (client_id = public.current_client_id());

-- =========================================================
-- Default rubric seeder — call once per new client
-- Usage: select public.seed_default_rubric('<client-uuid>');
-- =========================================================
create or replace function public.seed_default_rubric(p_client_id uuid)
returns uuid
language plpgsql
as $$
declare
  v_rubric_id uuid;
begin
  insert into public.qa_rubrics (client_id, name, version, is_default)
  values (p_client_id, 'Default QA Rubric', 1, true)
  returning id into v_rubric_id;

  insert into public.qa_criteria (rubric_id, name, description, weight, critical_fail_boolean, sort_order) values
    (v_rubric_id, 'Compliance / process adherence', 'Agent followed required compliance and process steps.', 20, true, 1),
    (v_rubric_id, 'Resolution accuracy',            'Customer issue was correctly identified and resolved.', 30, false, 2),
    (v_rubric_id, 'Empathy / tone',                 'Agent used appropriate, empathetic tone.',              15, false, 3),
    (v_rubric_id, 'Clarity / communication',        'Response was clear and unambiguous.',                   10, false, 4),
    (v_rubric_id, 'Escalation handling',            'Escalations and handoffs were handled correctly.',      10, false, 5),
    (v_rubric_id, 'Documentation / wrap-up',        'Case was documented with next steps and resolution.',   10, false, 6),
    (v_rubric_id, 'Proactive next steps',           'Agent offered proactive next steps or anticipated needs.', 5, false, 7);

  return v_rubric_id;
end;
$$;
