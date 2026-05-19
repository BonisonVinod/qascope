-- QAScope migration 015: per-workspace "stop scoring" flag.
--
-- Powers the Stop button on the top-of-page ScoringProgress bar. When a user
-- clicks Stop, we set scoring_stop_requested_at = now() for their workspace.
-- The scoring loop in scoreUnscoredConversations() reads this between
-- conversations and exits cleanly when it sees a fresh stamp newer than its
-- own loop start time.
--
-- Idempotent. Run in the Supabase SQL Editor.

alter table if exists public.clients
  add column if not exists scoring_stop_requested_at timestamptz;
