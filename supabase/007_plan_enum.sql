-- QAScope migration 007: Add new plan tiers
-- RUN THIS FIRST in its own SQL Editor tab, then run 008_openai_usage.sql.
-- Postgres requires the new enum value to be committed before any DDL in
-- the next file can reference it.

alter type plan_name add value if not exists 'starter';
alter type plan_name add value if not exists 'team';
