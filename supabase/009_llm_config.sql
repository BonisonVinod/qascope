-- QAScope migration 009: BYO LLM provider config per workspace
-- Run in Supabase SQL Editor. Idempotent.
--
-- Adds four optional columns to public.clients so each workspace can
-- choose its own LLM provider (OpenAI, OpenRouter, Together AI, Groq,
-- Azure OpenAI, Anthropic via OpenRouter — anything that speaks the
-- OpenAI Chat Completions API).
--
-- When all are NULL, the app falls back to the hosted env key (used by
-- Pilot tier). When any are set, the workspace's config is used.

alter table public.clients
  add column if not exists llm_provider text,            -- 'openai' | 'openrouter' | 'together' | 'groq' | 'custom'
  add column if not exists llm_api_key text,             -- raw API key (Supabase encrypts at rest)
  add column if not exists llm_base_url text,            -- override the default endpoint (defaults from llm_provider)
  add column if not exists llm_model text;               -- override the default model

-- Sanity: only admins should see/update these. RLS already restricts
-- selects on clients to the user's own client_id; this works as-is.
