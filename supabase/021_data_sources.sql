-- Migration 021: Live data sources for real-time verification
-- Admins configure website URLs or API endpoints per client.
-- The AI verification agent queries these at score time to fact-check
-- what the agent told the customer (order dates, prices, policies, etc.)
--
-- API keys / auth values are stored encrypted using Supabase Vault (pgcrypto).
-- The app retrieves them via vault.decrypt_secret() at query time only.

-- Enable pgcrypto if not already enabled (required by Vault)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.data_sources (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  name                text NOT NULL,               -- Admin-given name, e.g. "Order Tracker API"
  type                text NOT NULL
    CHECK (type IN ('website_url', 'api_endpoint')),

  -- For type = 'website_url': fetch this page and extract text for RAG context
  url                 text,

  -- For type = 'api_endpoint': URL template with {placeholder} variables
  -- e.g. "https://api.client.com/orders/{order_id}"
  endpoint_template   text,

  -- HTTP method for API endpoints (default GET)
  http_method         text NOT NULL DEFAULT 'GET'
    CHECK (http_method IN ('GET', 'POST')),

  -- Auth header name (e.g. "Authorization", "X-Api-Key")
  auth_header_name    text,

  -- Auth header value — stored as a Vault secret ID (uuid referencing vault.secrets)
  -- The actual value is never stored in plaintext in this table.
  auth_secret_id      uuid,

  -- Hint fields: which entity types to extract from transcript to fill placeholders
  -- e.g. ARRAY['order_id', 'customer_id', 'tracking_number']
  entity_hints        text[] NOT NULL DEFAULT '{}',

  -- Whether this source is currently active
  is_active           boolean NOT NULL DEFAULT true,

  created_by          uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "data_sources_client_members"
  ON public.data_sources
  FOR ALL
  USING (
    client_id IN (
      SELECT client_id FROM public.users WHERE id = auth.uid()
    )
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.touch_data_sources_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER data_sources_updated_at
  BEFORE UPDATE ON public.data_sources
  FOR EACH ROW EXECUTE FUNCTION public.touch_data_sources_updated_at();

CREATE INDEX IF NOT EXISTS data_sources_client_id_idx ON public.data_sources(client_id);
