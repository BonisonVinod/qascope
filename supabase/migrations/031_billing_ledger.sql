-- Migration to add Prepaid Quota & Ledger System for Plan B

create table if not exists public.client_balances (
  client_id uuid primary key references public.clients(id) on delete cascade,
  conversations_remaining int not null default 0,
  updated_at timestamp with time zone default now() not null
);

alter table public.client_balances enable row level security;
create policy "Users can read their own client balances"
  on public.client_balances for select
  using (client_id in (
    select client_id from public.users where id = auth.uid()
  ));

create table if not exists public.balance_transactions (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete cascade,
  amount int not null,
  transaction_type text not null,
  reference_id text,
  description text,
  created_at timestamp with time zone default now() not null
);

alter table public.balance_transactions enable row level security;
create policy "Users can read their own balance transactions"
  on public.balance_transactions for select
  using (client_id in (
    select client_id from public.users where id = auth.uid()
  ));

-- Create RPC to safely modify balance atomically
create or replace function public.add_balance_transaction(
  p_client_id uuid,
  p_amount int,
  p_type text,
  p_ref text,
  p_desc text
) returns void
language plpgsql
security definer
as $$
begin
  -- 1. Insert transaction
  insert into public.balance_transactions (client_id, amount, transaction_type, reference_id, description)
  values (p_client_id, p_amount, p_type, p_ref, p_desc);

  -- 2. Update or insert balance
  insert into public.client_balances (client_id, conversations_remaining, updated_at)
  values (p_client_id, p_amount, now())
  on conflict (client_id)
  do update set 
    conversations_remaining = client_balances.conversations_remaining + p_amount,
    updated_at = now();
end;
$$;
