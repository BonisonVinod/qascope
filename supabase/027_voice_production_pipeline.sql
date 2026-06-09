-- QAScope migration 027: Production voice queue, security, logs, and retention
--
-- Run after 026_voice_audit_jobs.sql.
-- Safe to re-run.

alter table public.webhook_tokens
  add column if not exists signing_secret text,
  add column if not exists allow_unsigned boolean not null default false;

alter table public.voice_audit_jobs
  add column if not exists storage_path text,
  add column if not exists attempt_count int not null default 0,
  add column if not exists max_attempts int not null default 5,
  add column if not exists next_attempt_at timestamptz not null default now(),
  add column if not exists locked_at timestamptz,
  add column if not exists locked_by text,
  add column if not exists completed_at timestamptz,
  add column if not exists recording_delete_after timestamptz not null default (now() + interval '30 days');

alter table public.voice_audit_jobs
  drop constraint if exists voice_audit_jobs_status_check;

alter table public.voice_audit_jobs
  add constraint voice_audit_jobs_status_check check (
    status in (
      'received',
      'queued',
      'transcribing',
      'transcribed',
      'scoring',
      'retrying',
      'completed',
      'failed'
    )
  );

alter table public.voice_audit_jobs
  drop constraint if exists voice_audit_jobs_attempts_check;

alter table public.voice_audit_jobs
  add constraint voice_audit_jobs_attempts_check check (
    attempt_count >= 0 and max_attempts between 1 and 20
  );

update public.voice_audit_jobs
   set status = 'queued',
       next_attempt_at = now()
 where status = 'received';

create table if not exists public.voice_audit_events (
  id bigint generated always as identity primary key,
  job_id uuid not null references public.voice_audit_jobs(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  event_type text not null,
  message text not null,
  details_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.voice_audit_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename = 'voice_audit_events'
       and policyname = 'voice_audit_events_client_members'
  ) then
    create policy "voice_audit_events_client_members"
      on public.voice_audit_events
      for select
      using (client_id = public.current_client_id());
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename  = 'voice_audit_events'
       and policyname = 'voice_audit_events_super_admin'
  ) then
    create policy "voice_audit_events_super_admin"
      on public.voice_audit_events
      for select
      using (public.is_super_admin());
  end if;
end $$;

create index if not exists voice_audit_jobs_queue_idx
  on public.voice_audit_jobs(next_attempt_at, created_at)
  where status in ('queued', 'retrying');

create index if not exists voice_audit_jobs_retention_idx
  on public.voice_audit_jobs(recording_delete_after)
  where storage_path is not null or recording_url is not null;

create index if not exists voice_audit_events_job_idx
  on public.voice_audit_events(job_id, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-recordings',
  'voice-recordings',
  false,
  104857600,
  array[
    'audio/flac', 'audio/mpeg', 'audio/mp3', 'audio/mp4', 'audio/mpga',
    'audio/m4a', 'audio/ogg', 'audio/wav', 'audio/webm',
    'video/mp4', 'video/webm', 'application/octet-stream'
  ]
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.claim_voice_audit_jobs(
  p_worker_id text,
  p_limit int default 3
)
returns setof public.voice_audit_jobs
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimable as (
    select id
      from public.voice_audit_jobs
     where status in ('queued', 'retrying')
       and next_attempt_at <= now()
       and attempt_count < max_attempts
       and (locked_at is null or locked_at < now() - interval '15 minutes')
     order by next_attempt_at, created_at
     for update skip locked
     limit greatest(1, least(p_limit, 20))
  )
  update public.voice_audit_jobs jobs
     set status = 'transcribing',
         attempt_count = jobs.attempt_count + 1,
         locked_at = now(),
         locked_by = p_worker_id,
         error_message = null,
         updated_at = now()
    from claimable
   where jobs.id = claimable.id
  returning jobs.*;
end;
$$;

revoke all on function public.claim_voice_audit_jobs(text, int) from public;
grant execute on function public.claim_voice_audit_jobs(text, int) to service_role;
