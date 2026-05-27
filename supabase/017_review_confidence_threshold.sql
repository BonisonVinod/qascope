-- QAScope migration 017: configurable review confidence threshold.
--
-- Used to be a hardcoded 0.7 in src/lib/scoring/scoring-math.ts. Each
-- workspace can now tune how aggressive the "send to human review"
-- gate is via Settings → Review.
--
-- Stored as a percentage (0-100) for human readability in the UI; the
-- scoring code divides by 100 at use time.
--
-- Idempotent. Run in the Supabase SQL Editor.

alter table if exists public.clients
  add column if not exists review_confidence_threshold int not null default 70;

-- Sanity bounds. We allow extreme values (0/100) because some workspaces
-- want everything reviewed (100) or nothing reviewed (0). Anything outside
-- 0-100 is rejected at write time by both this constraint and the UI.
alter table if exists public.clients
  drop constraint if exists clients_review_confidence_threshold_range;

alter table if exists public.clients
  add constraint clients_review_confidence_threshold_range
  check (review_confidence_threshold between 0 and 100);
