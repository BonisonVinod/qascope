-- QAScope migration 014: Track which criterion scores failed due to LLM errors.
--
-- When the per-criterion LLM call errors out (e.g. provider 429 rate-limit),
-- we previously stored score=0/confidence=0 and a "Scoring error: ..."
-- explanation. That made transient infrastructure errors look like genuine
-- failures, inflated the compliance-fail rate, and tripped critical-fail when
-- the errored criterion was critical.
--
-- This column flags those rows so we can:
--   1) skip them in the weighted-total math
--   2) skip them when checking critical-fail
--   3) render them distinctly in the UI ("Could not score — please rescore")
--
-- Idempotent. Run in the Supabase SQL Editor.

alter table if exists public.qa_score_details
  add column if not exists errored boolean not null default false;

-- Backfill: any existing row whose explanation indicates a transient error
-- should be marked as errored so old reports stop counting them as fails.
update public.qa_score_details
   set errored = true
 where errored = false
   and explanation is not null
   and (
        explanation like 'Scoring error:%'
     or explanation like '%Too Many Requests%'
     or explanation like '%429%'
   );
