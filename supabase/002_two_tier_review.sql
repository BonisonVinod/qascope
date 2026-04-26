-- QAScope migration 002: Two-tier review workflow
-- Run this ONCE in Supabase SQL Editor on your existing database.
-- Safe to re-run: every statement uses IF NOT EXISTS / idempotent guards.

-- -----------------------------------------------------------
-- 1. Preserve original AI score + status on qa_scores
--    total_score / status become MUTABLE via override;
--    original_* stay locked to what the AI initially produced.
-- -----------------------------------------------------------
alter table public.qa_scores
  add column if not exists original_total_score numeric(5, 2),
  add column if not exists original_status score_status;

-- Backfill existing rows
update public.qa_scores
   set original_total_score = total_score
 where original_total_score is null;

update public.qa_scores
   set original_status = status
 where original_status is null;

alter table public.qa_scores
  alter column original_total_score set not null,
  alter column original_status      set not null;

-- Track whether the score was appealed + when
alter table public.qa_scores
  add column if not exists appealed_at timestamptz;

-- -----------------------------------------------------------
-- 2. clients: second-reviewer config + SLA window
-- -----------------------------------------------------------
alter table public.clients
  add column if not exists second_reviewer_user_id uuid
      references public.users(id) on delete set null,
  add column if not exists sla_hours int not null default 24;

-- -----------------------------------------------------------
-- 3. review_queue: two-tier state machine + SLA
-- -----------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'review_state') then
    create type review_state as enum ('pending_first', 'pending_second', 'closed');
  end if;
  if not exists (select 1 from pg_type where typname = 'first_reviewer_decision_type') then
    create type first_reviewer_decision_type as enum ('agree', 'disagree', 'auto_approved');
  end if;
  if not exists (select 1 from pg_type where typname = 'second_reviewer_decision_type') then
    create type second_reviewer_decision_type as enum ('confirm_override', 'deny_override', 'auto_confirmed');
  end if;
end $$;

alter table public.review_queue
  add column if not exists state review_state not null default 'pending_first',
  add column if not exists first_reviewer_id        uuid references public.users(id) on delete set null,
  add column if not exists first_reviewer_decision  first_reviewer_decision_type,
  add column if not exists first_reviewer_at        timestamptz,
  add column if not exists first_reviewer_notes     text,
  add column if not exists second_reviewer_id       uuid references public.users(id) on delete set null,
  add column if not exists second_reviewer_decision second_reviewer_decision_type,
  add column if not exists second_reviewer_at       timestamptz,
  add column if not exists second_reviewer_notes    text,
  add column if not exists sla_deadline             timestamptz;

create index if not exists review_queue_state_idx
  on public.review_queue(state);
create index if not exists review_queue_sla_idx
  on public.review_queue(sla_deadline) where state <> 'closed';
create index if not exists review_queue_first_reviewer_idx
  on public.review_queue(first_reviewer_id);
create index if not exists review_queue_second_reviewer_idx
  on public.review_queue(second_reviewer_id);

-- -----------------------------------------------------------
-- 4. Backfill existing review_queue rows into the new model
-- -----------------------------------------------------------

-- Still-pending rows -> tier 1, SLA starts from creation.
update public.review_queue rq
   set sla_deadline = coalesce(rq.sla_deadline, rq.created_at + interval '24 hours')
 where rq.decision = 'pending' and rq.sla_deadline is null;

-- Already-approved rows -> tier 1 closed with agree.
update public.review_queue rq
   set state = 'closed',
       first_reviewer_id       = coalesce(rq.first_reviewer_id, rq.assigned_to),
       first_reviewer_decision = coalesce(rq.first_reviewer_decision, 'agree'),
       first_reviewer_at       = coalesce(rq.first_reviewer_at, rq.resolved_at),
       first_reviewer_notes    = coalesce(rq.first_reviewer_notes, rq.notes)
 where rq.decision = 'approved' and rq.state <> 'closed';

-- Already-overridden rows -> first disagreed, second confirmed.
update public.review_queue rq
   set state = 'closed',
       first_reviewer_id        = coalesce(rq.first_reviewer_id, rq.assigned_to),
       first_reviewer_decision  = coalesce(rq.first_reviewer_decision, 'disagree'),
       first_reviewer_at        = coalesce(rq.first_reviewer_at, rq.resolved_at),
       first_reviewer_notes     = coalesce(rq.first_reviewer_notes, rq.notes),
       second_reviewer_id       = coalesce(rq.second_reviewer_id, rq.assigned_to),
       second_reviewer_decision = coalesce(rq.second_reviewer_decision, 'confirm_override'),
       second_reviewer_at       = coalesce(rq.second_reviewer_at, rq.resolved_at)
 where rq.decision = 'overridden' and rq.state <> 'closed';

-- Already-rejected rows -> first disagreed, second denied.
update public.review_queue rq
   set state = 'closed',
       first_reviewer_id        = coalesce(rq.first_reviewer_id, rq.assigned_to),
       first_reviewer_decision  = coalesce(rq.first_reviewer_decision, 'disagree'),
       first_reviewer_at        = coalesce(rq.first_reviewer_at, rq.resolved_at),
       first_reviewer_notes     = coalesce(rq.first_reviewer_notes, rq.notes),
       second_reviewer_id       = coalesce(rq.second_reviewer_id, rq.assigned_to),
       second_reviewer_decision = coalesce(rq.second_reviewer_decision, 'deny_override'),
       second_reviewer_at       = coalesce(rq.second_reviewer_at, rq.resolved_at)
 where rq.decision = 'rejected' and rq.state <> 'closed';

-- -----------------------------------------------------------
-- 5. SLA sweeper helper: auto-close expired items.
--    Call this from the app before reading /review-queue.
--    It walks any rows whose sla_deadline is past and applies
--    the auto-decision, then resets SLA for tier-2 handoffs.
-- -----------------------------------------------------------
create or replace function public.sweep_review_sla()
returns void
language plpgsql
security definer
as $$
declare
  v_sla_hours int;
begin
  -- Tier 1 expired -> auto approve (reviewer agreed by default).
  update public.review_queue rq
     set state                   = 'closed',
         first_reviewer_decision = 'auto_approved',
         first_reviewer_at       = now(),
         first_reviewer_notes    = coalesce(rq.first_reviewer_notes,
                                  'Auto-approved: no first-reviewer action within SLA.')
   where rq.state = 'pending_first'
     and rq.sla_deadline is not null
     and rq.sla_deadline < now();

  -- Tier 2 expired -> auto confirm the override (and flip the score).
  update public.qa_scores qs
     set status        = 'final',
         appealed_at   = now()
    from public.review_queue rq
   where rq.qa_score_id = qs.id
     and rq.state = 'pending_second'
     and rq.sla_deadline is not null
     and rq.sla_deadline < now();

  update public.review_queue rq
     set state                    = 'closed',
         second_reviewer_decision = 'auto_confirmed',
         second_reviewer_at       = now(),
         second_reviewer_notes    = coalesce(rq.second_reviewer_notes,
                                  'Auto-confirmed: no second-reviewer action within SLA.')
   where rq.state = 'pending_second'
     and rq.sla_deadline is not null
     and rq.sla_deadline < now();
end;
$$;

-- Give authenticated users permission to invoke the sweeper.
grant execute on function public.sweep_review_sla() to authenticated;
