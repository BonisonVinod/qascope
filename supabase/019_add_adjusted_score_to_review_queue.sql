-- QAScope migration 019: Add adjusted score support to review queue
--
-- Purpose:
-- 1. Add review_queue.adjusted_score for first-reviewer proposed score.
-- 2. Enforce adjusted_score range 0..100.
-- 3. Repair already-confirmed overrides where adjusted_score exists but
--    qa_scores.total_score was not updated.
-- 4. Update sweep_review_sla() so Tier 2 auto-confirm applies adjusted_score.
--
-- Safe to re-run.

alter table public.review_queue
  add column if not exists adjusted_score numeric(5, 2);

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conname = 'review_queue_adjusted_score_range'
       and conrelid = 'public.review_queue'::regclass
  ) then
    alter table public.review_queue
      add constraint review_queue_adjusted_score_range
      check (
        adjusted_score is null
        or (adjusted_score >= 0 and adjusted_score <= 100)
      );
  end if;
end $$;

-- Repair confirmed overrides where the proposed score was saved but not applied.
update public.qa_scores qs
   set total_score = rq.adjusted_score,
       status = 'final',
       appealed_at = coalesce(qs.appealed_at, rq.second_reviewer_at, rq.resolved_at, now())
  from public.review_queue rq
 where rq.qa_score_id = qs.id
   and rq.adjusted_score is not null
   and rq.state = 'closed'
   and rq.second_reviewer_decision in ('confirm_override', 'auto_confirmed')
   and qs.total_score is distinct from rq.adjusted_score;

create or replace function public.sweep_review_sla()
returns void
language plpgsql
security definer
as $$
begin
  -- Tier 1 expired -> auto approve. AI score stands.
  update public.review_queue rq
     set state = 'closed',
         first_reviewer_decision = 'auto_approved',
         first_reviewer_at = now(),
         first_reviewer_notes = coalesce(
           rq.first_reviewer_notes,
           'Auto-approved: no first-reviewer action within SLA.'
         ),
         decision = 'approved',
         resolved_at = now()
   where rq.state = 'pending_first'
     and rq.sla_deadline is not null
     and rq.sla_deadline < now();

  -- Tier 2 expired -> auto confirm override and apply adjusted score when present.
  update public.qa_scores qs
     set total_score = coalesce(rq.adjusted_score, qs.total_score),
         status = 'final',
         appealed_at = now()
    from public.review_queue rq
   where rq.qa_score_id = qs.id
     and rq.state = 'pending_second'
     and rq.sla_deadline is not null
     and rq.sla_deadline < now();

  update public.review_queue rq
     set state = 'closed',
         second_reviewer_decision = 'auto_confirmed',
         second_reviewer_at = now(),
         second_reviewer_notes = coalesce(
           rq.second_reviewer_notes,
           'Auto-confirmed: no second-reviewer action within SLA.'
         ),
         decision = 'overridden',
         resolved_at = now()
   where rq.state = 'pending_second'
     and rq.sla_deadline is not null
     and rq.sla_deadline < now();
end;
$$;

grant execute on function public.sweep_review_sla() to authenticated;
