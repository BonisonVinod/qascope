-- QAScope migration 011: Knowledge store (workspace documents + chunks)
-- Run in Supabase SQL Editor. Idempotent.

-- -----------------------------------------------------------
-- 1. Create the pgvector extension (idempotent)
-- -----------------------------------------------------------
create extension if not exists vector;

-- -----------------------------------------------------------
-- 2. workspace_documents table — stores uploaded SOPs, runbooks, etc.
--    Each document is tagged with a source_type (markdown, docx, pdf, url)
--    and a content_hash for deduplication.
-- -----------------------------------------------------------
create table if not exists public.workspace_documents (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.clients(id) on delete cascade,
  source_type text not null,            -- 'markdown'|'docx'|'pdf'|'url'
  source_uri text,                      -- file name or URL
  title text not null,
  content_hash text unique not null,    -- SHA-256 of the original file content
  version int not null default 1,
  uploaded_by uuid not null references public.users(id) on delete set null,
  uploaded_at timestamptz not null default now(),
  status text not null default 'pending',  -- 'pending'|'processing'|'ready'|'failed'
  error_message text,
  chunk_count int default 0,
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------
-- 3. document_chunks table — chunks of text with embeddings
--    Each chunk is a paragraph or logical section of a document,
--    paired with its 1536-dimensional embedding from OpenAI.
-- -----------------------------------------------------------
create table if not exists public.document_chunks (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.workspace_documents(id) on delete cascade,
  chunk_index int not null,
  text text not null,
  text_length int,
  embedding vector(1536) not null,
  metadata jsonb default '{}'::jsonb,  -- reserved for future use (e.g., page number)
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------
-- 4. Indexes for performance
-- -----------------------------------------------------------
create index if not exists workspace_documents_workspace_idx
  on public.workspace_documents(workspace_id);

create index if not exists workspace_documents_status_idx
  on public.workspace_documents(workspace_id, status);

create index if not exists document_chunks_document_idx
  on public.document_chunks(document_id);

-- IVFFlat index for vector similarity search.
-- lists=100 is a reasonable default for up to ~100k chunks per workspace.
-- probes=10 is the search parameter (higher = more accurate but slower).
create index if not exists document_chunks_embedding_idx
  on public.document_chunks
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- -----------------------------------------------------------
-- 5. RLS — workspace isolation
-- -----------------------------------------------------------
alter table if exists public.workspace_documents enable row level security;
alter table if exists public.document_chunks enable row level security;

drop policy if exists "tenant_workspace_documents" on public.workspace_documents;
drop policy if exists "tenant_document_chunks" on public.document_chunks;

create policy "tenant_workspace_documents"
  on public.workspace_documents for all
  using (workspace_id = public.current_client_id())
  with check (workspace_id = public.current_client_id());

create policy "tenant_document_chunks"
  on public.document_chunks for all
  using (document_id in (
    select id from public.workspace_documents where workspace_id = public.current_client_id()
  ));

-- -----------------------------------------------------------
-- 6. SQL RPC: search_knowledge_chunks
--    Retrieves the top N chunks by cosine similarity to the query embedding.
--    Returns provenance (document_title, document_id) for citation.
-- -----------------------------------------------------------
create or replace function public.search_knowledge_chunks(
  p_workspace_id uuid,
  p_embedding vector(1536),
  p_limit int default 15,
  p_similarity_threshold float default 0.5
)
returns table (
  chunk_id uuid,
  chunk_index int,
  chunk_text text,
  similarity float,
  document_id uuid,
  document_title text,
  document_version int
) language sql stable security definer as $$
  select
    dc.id,
    dc.chunk_index,
    dc.text,
    (1 - (dc.embedding <=> p_embedding)) as similarity,
    wd.id,
    wd.title,
    wd.version
  from public.document_chunks dc
  join public.workspace_documents wd on dc.document_id = wd.id
  where wd.workspace_id = p_workspace_id
    and wd.status = 'ready'
    and (1 - (dc.embedding <=> p_embedding)) >= p_similarity_threshold
  order by dc.embedding <=> p_embedding
  limit p_limit;
$$;
