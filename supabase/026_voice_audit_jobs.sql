-- QAScope migration 026: Voice audit intake jobs
--
-- Purpose:
-- 1. Track post-call voice recording intake before/after transcription.
-- 2. Link the generated transcript back to the existing conversations table.
-- 3. Keep failures visible for retry/debug without changing the scoring flow.
--
-- Safe to re-run.

create table if not exists public.voice_audit_jobs (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  webhook_token_id uuid references public.webhook_tokens(id) on delete set null,
  conversation_id uuid references public.conversations(id) on delete set null,
  external_call_id text,
  source_type text not null default 'dialer',
  source_system text,
  recording_url text,
  audio_filename text,
  audio_content_type text,
  audio_size_bytes bigint,
  duration_seconds int,
  language text,
  status text not null default 'received',
  error_message text,
  transcript_text text,
  transcription_model text,
  transcription_metadata jsonb not null default '{}'::jsonb,
  metadata_json jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now(),
  transcribed_at timestamptz,
  scored_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voice_audit_jobs_status_check check (
    status in (
      'received',
      'transcribing',
      'transcribed',
      'scoring',
      'completed',
      'failed'
    )
  )
);

alter table public.voice_audit_jobs enable row level security;

do $$
begin
  if not exists (
    select 1
      from pg_policies
     where schemaname = 'public'
       and tablename = 'voice_audit_jobs'
       and policyname = 'voice_audit_jobs_client_members'
  ) then
    create policy "voice_audit_jobs_client_members"
      on public.voice_audit_jobs
      for all
      using (client_id = public.current_client_id())
      with check (client_id = public.current_client_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename  = 'voice_audit_jobs'
       and policyname = 'voice_audit_jobs_super_admin'
  ) then
    create policy "voice_audit_jobs_super_admin"
      on public.voice_audit_jobs
      for select
      using (public.is_super_admin());
  end if;
end $$;

create index if not exists voice_audit_jobs_client_id_idx
  on public.voice_audit_jobs(client_id, created_at desc);

create index if not exists voice_audit_jobs_status_idx
  on public.voice_audit_jobs(status);

create unique index if not exists voice_audit_jobs_client_external_call_uidx
  on public.voice_audit_jobs(client_id, external_call_id)
  where external_call_id is not null;

