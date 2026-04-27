# QAScope

AI QA copilot for small BPOs (20–200 agents). Upload a CSV of agent ↔ customer conversations, get every one scored against a weighted rubric, route low-scoring or fatal-rule violations into a two-tier review queue, and read manager dashboards and weekly reports — all backed by a multi-tenant Postgres database with strict tenant isolation.

> Status: **private beta**. Core scoring + review workflow are stable; billing UI exists but Razorpay is not yet charging real money.

## What it does

| Feature | Where |
|---|---|
| Sign up, create workspace, invite teammates by role | `/signup`, `/settings/team` |
| Upload CSV, dedupe agents/conversations, score in batches of 25 | `/upload`, `/results` |
| Edit rubric inline, mark criteria as critical | `/rubrics` |
| Project-specific fatal rules, individually or via CSV bulk import | `/rubrics` (Fatal rules panel) |
| Two-tier review with SLA countdown and DB-side auto-approve sweep | `/review-queue` |
| Pass-threshold queue: scores below the configured % land for review | Setting in `/settings` |
| Manager dashboard: KPIs, agent leaderboards, team rollup, channel split | `/dashboard` |
| ISO Mon–Sun weekly report with AI-vs-final delta | `/reports` |
| Saved report templates: build once via plain-English description (1 LLM call), rerun free | `/reports/templates` |
| Plan-aware billing UI with per-month upload cap | `/billing` |

## Stack

- **Next.js 16** App Router, React Server Components, Server Actions
- **Supabase** for Postgres + Auth (RLS for tenant isolation)
- **OpenAI** (`gpt-4o-mini` by default) for criterion scoring + coaching notes
- **TypeScript** end-to-end, including pure helper modules with `node:test` unit coverage

## First-time setup

### 1. Install Node dependencies

```bash
npm install
```

### 2. Provision a Supabase project

Pick **Asia South (Mumbai)** or whichever region matches your data-residency needs. Then create `.env.local` from the example and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...      # server-side only, keep private
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini            # optional, defaults to gpt-4o-mini
```

### 3. Apply database schemas in order

In the Supabase SQL Editor, open one tab per file, paste, click **Run**, in this order:

1. `supabase/schema.sql` — base 11 tables, enums, RLS policies, `seed_default_rubric()`
2. `supabase/002_two_tier_review.sql` — review state machine, SLA, auto-sweep
3. `supabase/003_pass_threshold.sql` — `clients.pass_threshold`
4. `supabase/004a_user_role_enum.sql` — extends `user_role` with `qa_reviewer`. **Run alone in its own tab.**
5. `supabase/004_invitations.sql` — invitations table + RLS, `users.team_name`
6. `supabase/005_fatal_rules.sql` — fatal_rules table + RLS
7. `supabase/006_report_templates.sql` — report_templates table + RLS

The `004a` step has to be its own tab because Postgres can't use a freshly added enum value in the same transaction it was added.

### 4. Run dev server

```bash
npm run dev
```

Open <http://localhost:3000>, click **Sign up**, create a workspace. The first user is the admin.

### 5. Smoke-test it

```bash
# 1. Upload a small CSV to confirm scoring works end-to-end
# qascope/test-data/smoke-test.csv (10 rows)

# 2. Upload the larger sample once smoke-test passes
# qascope/test-data/sample-conversations.csv (100 rows across 12 agents)

# 3. Run unit tests (79 tests, ~1 second)
npm test
```

## Project layout

```
src/
  app/
    (auth)/             login, signup, signout actions
    (dashboard)/
      dashboard         manager KPIs (last 30 days)
      upload            CSV upload + plan-limit gate
      rubrics           weighted criteria + fatal-rules panel
      results           scored conversations + Score-25-pending
      review-queue      two-tier review with SLA countdowns
      reports           ISO weekly report + Saved templates
      billing           plan + usage + plan history
      settings          account + review workflow + team
    accept-invite       invitee landing for shared invite URLs
  lib/
    supabase/           browser/server/admin clients + middleware
    scoring/            criterion prompts, OpenAI wrapper, score-conversation, batching, scoring-math, sla
    billing/            plan catalogue, usage snapshot, limit math
    reports/            iso-week, template-engine (pure), nl-to-config (LLM)

supabase/               numbered migration files, run in order
test-data/              sample CSVs for manual smoke tests + manual test plan
tests/                  node:test unit tests for pure modules (79 tests)
```

## Test commands

```bash
npm test                # run unit tests (Node 22 native --experimental-strip-types)
npm run lint            # ESLint
npm run build           # production build (catches TS errors)
```

## Operational notes

- **No background workers.** SLA expiry is swept on every read of `/review-queue` via the Postgres `sweep_review_sla()` function.
- **Plan-limit guard runs at upload time.** A workspace already over its monthly cap gets a friendly error before any conversations land in the DB.
- **Scoring is on-demand.** Click "Score N pending" in `/results` to score the next 25 conversations. Each row makes ~7 OpenAI calls; a 25-row batch typically takes 60-180 seconds.
- **Saved-template runs are LLM-free.** The natural-language → config conversion happens once, at template-creation time.
- **Invite emails aren't sent automatically.** Admin copies the invite URL from the team page and shares it via WhatsApp/Slack/email. To wire SMTP, configure Resend (or any provider) in Supabase project settings.

## Deployment

See [`DEPLOY.md`](./DEPLOY.md) for production deployment notes (Vercel + Supabase, pre-launch checklist, environment variables, custom domain).

## Pitch

See [`PITCH.md`](./PITCH.md) for a short shareable summary you can paste into a message when inviting people to try the beta.

## Beyond the MVP

Strategic planning docs live in [`docs/`](./docs/README.md):

- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — engineering work streams for V2 / V3 (real-time ingestion, agent self-coaching, calibration analytics, multi-rubric, voice ingestion, billing & data lifecycle)
- [`docs/SALES.md`](./docs/SALES.md) — ICP, sales motion, pricing experiments, discovery script, objection handling, pipeline tracking
- [`docs/MARKETING.md`](./docs/MARKETING.md) — warm-intro generation, LinkedIn cadence, content backlog, lead magnets, weekly metrics
