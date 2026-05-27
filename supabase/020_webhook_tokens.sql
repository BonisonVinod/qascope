-- Migration 020: Webhook ingest tokens
-- Each client can generate named webhook tokens.
-- Any CRM/website can POST conversations to /api/ingest/webhook?token=<value>

CREATE TABLE IF NOT EXISTS public.webhook_tokens (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id    uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name         text NOT NULL,              -- e.g. "Freshdesk Production"
  token        text NOT NULL UNIQUE,       -- 32-char random secret
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz,
  is_active    boolean NOT NULL DEFAULT true
);

ALTER TABLE public.webhook_tokens ENABLE ROW LEVEL SECURITY;

-- Members of the same client can see and manage their own tokens.
CREATE POLICY "webhook_tokens_client_members"
  ON public.webhook_tokens
  FOR ALL
  USING (
    client_id IN (
      SELECT client_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Only admins can insert/update/delete tokens (enforced in app layer too).
CREATE INDEX IF NOT EXISTS webhook_tokens_client_id_idx ON public.webhook_tokens(client_id);
CREATE INDEX IF NOT EXISTS webhook_tokens_token_idx     ON public.webhook_tokens(token);
