-- QAScope migration 003: Per-client pass threshold for review queue
-- Run in Supabase SQL Editor on your existing database.
-- Safe to re-run: every statement is idempotent.

-- -----------------------------------------------------------
-- 1. Add pass_threshold to clients (0-100; default 70).
--    Conversations scoring below this land in the review queue
--    with reason 'low_score' even if AI confidence is high.
-- -----------------------------------------------------------
alter table public.clients
  add column if not exists pass_threshold int not null default 70;

-- Reasonable bounds.
alter table public.clients
  drop constraint if exists clients_pass_threshold_range;
alter table public.clients
  add constraint clients_pass_threshold_range
  check (pass_threshold >= 0 and pass_threshold <= 100);

-- -----------------------------------------------------------
-- 2. (Optional) backfill review_queue for already-scored
--    conversations whose total fell below the new threshold.
--    Skips any score that already has a queue row.
-- -----------------------------------------------------------
insert into public.review_queue (qa_score_id, reason, state, sla_deadline)
select qs.id,
       'low_score',
       'pending_first',
       now() + (c.sla_hours || ' hours')::interval
  from public.qa_scores qs
  join public.conversations conv on conv.id = qs.conversation_id
  join public.clients      c    on c.id    = conv.client_id
 where qs.status = 'final'
   and qs.total_score < c.pass_threshold
   and not exists (
        select 1 from public.review_queue rq where rq.qa_score_id = qs.id
   );
