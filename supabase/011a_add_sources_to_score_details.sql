-- QAScope migration 011a: Add sources_used to qa_score_details
-- Tracks which knowledge documents were cited in the AI's explanation.
-- Run in Supabase SQL Editor. Idempotent.

alter table if exists public.qa_score_details
  add column sources_used jsonb default '[]'::jsonb;
