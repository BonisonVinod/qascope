-- QAScope migration 004a: extend user_role enum
-- RUN THIS FIRST, then run 004b_invitations.sql in a SECOND query tab.
-- Postgres needs the new enum value to be committed before any DDL in the
-- next file can reference it as a default.

alter type user_role add value if not exists 'qa_reviewer';
