-- QAScope migration 018: optional separate embedding-only API key.
--
-- Some workspaces will want to run scoring on a premium provider (e.g.
-- OpenAI gpt-4o for chat) and embeddings on a cheaper provider (e.g. an
-- OpenAI key with text-embedding-3-small). When these columns are filled,
-- the embedding path uses them; otherwise it falls back to the chat key.
--
-- We do NOT keep an env-var fallback in production: every workspace must
-- supply its own credentials.
--
-- Idempotent. Run in the Supabase SQL Editor.

alter table if exists public.clients
  add column if not exists llm_embedding_api_key text;

alter table if exists public.clients
  add column if not exists llm_embedding_base_url text;
