-- QAScope migration 016: per-upload batch id.
--
-- Powers the "Latest upload only" filter on Results / Review queue.
-- Every CSV upload generates a fresh batch uuid; every conversation row
-- created in that upload is stamped with it. The clients row also tracks
-- the most-recent batch id so the UI can quickly identify "the latest".
--
-- Idempotent. Run in the Supabase SQL Editor.

alter table if exists public.conversations
  add column if not exists upload_batch_id uuid;

alter table if exists public.clients
  add column if not exists latest_upload_batch_id uuid;

create index if not exists conversations_upload_batch_id_idx
  on public.conversations (upload_batch_id);
