-- Create outbound_webhooks table
create table public.outbound_webhooks (
  id uuid default gen_random_uuid() primary key,
  client_id uuid not null references public.clients(id) on delete cascade,
  url text not null,
  secret text not null,
  is_active boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.outbound_webhooks enable row level security;

create policy "Users can view outbound_webhooks for their client"
  on public.outbound_webhooks for select
  using ( client_id in (select client_id from public.users where id = auth.uid()) );

create policy "Admins can insert outbound_webhooks"
  on public.outbound_webhooks for insert
  with check ( 
    client_id in (select client_id from public.users where id = auth.uid() and role = 'admin') 
  );

create policy "Admins can update outbound_webhooks"
  on public.outbound_webhooks for update
  using ( 
    client_id in (select client_id from public.users where id = auth.uid() and role = 'admin') 
  );

create policy "Admins can delete outbound_webhooks"
  on public.outbound_webhooks for delete
  using ( 
    client_id in (select client_id from public.users where id = auth.uid() and role = 'admin') 
  );


-- Create outbound_webhook_deliveries table
create table public.outbound_webhook_deliveries (
  id uuid default gen_random_uuid() primary key,
  webhook_id uuid not null references public.outbound_webhooks(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  qa_score_id uuid references public.qa_scores(id) on delete set null,
  request_payload jsonb not null,
  response_status integer,
  response_body text,
  error_message text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.outbound_webhook_deliveries enable row level security;

create policy "Users can view outbound_webhook_deliveries for their client"
  on public.outbound_webhook_deliveries for select
  using ( client_id in (select client_id from public.users where id = auth.uid()) );

-- Service role only for inserts (done by backend)
