# QAScope — Feature Reference

A box-by-box, calculation-by-calculation tour of QAScope. This document covers every page in the sidebar, every button and form field on those pages, every input the system accepts, every output it produces, and the math behind every score.

Last regenerated: 2026-05-10. If a page or field doesn't match the app, the app changed; this doc didn't.

---

## How to read this document

Each section follows the same pattern:

- **What this page is for** — the one-line purpose.
- **What you see** — every visible box, button, badge, and column.
- **What you put in** — every input the page accepts.
- **What comes out** — every value the page writes back to the database or shows you.
- **Calculations** — every number on the page and the formula behind it.

If a feature is shared between pages (for example, the Latest-upload-only filter), it's defined once and cross-referenced everywhere it appears.

---

## Top-of-page progress bar

The progress bar appears at the top of every signed-in page while a scoring run is active. It is implemented in `src/app/(dashboard)/scoring-progress.tsx` and polls `/api/scoring-progress` every 3 seconds.

What you see, by colour:

- **Green dot, green fill** — scoring is running normally. Label: `Scoring conversations… X of Y (Z%)`.
- **Amber dot, amber fill** — the "scored" count hasn't moved in 30 seconds. The AI provider is probably rate-limited or slow. Label: `Scoring is slow — the AI provider may be rate-limited. X of Y done.`
- **Grey dot, grey fill** — Stop was clicked. Label: `Stopping… we let the conversation already in progress finish, then exit. X of Y done.`

How "active" is decided: the `/api/scoring-progress` route reports `isActive = true` when at least one `qa_scores` row was written in the last 20 seconds AND `scored < total`. So the bar disappears at most ~20 seconds after the loop actually finishes.

The Stop button calls the `requestScoringStop` server action, which:

1. Flips an in-process flag so the running Node process can short-circuit on its very next iteration without a DB round-trip.
2. Writes `clients.scoring_stop_requested_at = now()` via the admin Supabase client.

The admin client matters: the `clients` table has SELECT-only RLS for tenant users, so a regular update silently no-ops. (That was the original "Stop doesn't stop" bug — it has been fixed.)

The scoring loop in `src/lib/scoring/score-batch.ts` checks the flag between conversations. The check is fast — it consults the in-process flag first, then falls back to a DB read. Once the current conversation finishes, the loop breaks and clears the flag for the next run.

What "current conversation" means: each conversation involves seven LLM calls running in parallel, and the loop only checks the stop flag at the boundaries between conversations, not inside them. So Stop won't abort an in-flight conversation; it will let it finish, then exit. Worst case is roughly the time of one slow conversation (often 10–30 seconds, sometimes up to a minute on a rate-limited provider).

---

## Sidebar / navigation

Defined in `src/app/(dashboard)/layout.tsx`. Visible to every signed-in user; the order never changes.

| Link | URL | What it does |
| --- | --- | --- |
| Dashboard | `/dashboard` | Workspace KPI summary for the last 30 days. |
| Upload | `/upload` | Drop a CSV in, map columns, import as conversations. |
| Rubrics | `/rubrics` | Edit the scoring rubric: criteria, weights, fatal rules. |
| Knowledge | `/knowledge` | Upload knowledge-base documents the AI consults while scoring. |
| Results | `/results` | Browse scored conversations, drill into individual scores. |
| Review queue | `/review-queue` | Two-tier human review of flagged scores. |
| Reports | `/reports` | Run pre-built or custom report templates. |
| Billing | `/billing` | Plan, usage, upgrade/downgrade. |
| Settings | `/settings` | LLM provider, review SLA, team. |

Below the nav is the user's name, email, and role badge (e.g. `tier_2_reviewer`). At the bottom is a Sign out button.

---

## "Latest upload only" filter (shared across Results and Review queue)

A toggle button at the top-right of the Results and Review queue pages.

- **Off (default)** — page shows all conversations / scores in the workspace.
- **On** — page shows only conversations whose `upload_batch_id` matches the workspace's `latest_upload_batch_id`. The badge in the page subtitle reads `latest upload only`.

How a batch id gets assigned: every CSV upload generates a new UUID. Every conversation row created during that upload is stamped with this UUID. The `clients.latest_upload_batch_id` column is updated to point to the most recent upload's UUID.

State is persisted in the URL (`?latest=1`), so refreshing the page or sharing the link preserves the filter.

If the toggle is on but no upload has happened yet (or the migration hasn't been applied), the page falls back to showing everything and displays an amber notice: `No upload batch tagged yet — showing everything. Run an upload to start tagging.`

---

## Dashboard

**Page:** `/dashboard` — `src/app/(dashboard)/dashboard/page.tsx`.

**Window:** the entire dashboard is scoped to **the last 30 days** (`ROLLING_DAYS = 30`). Anything older is excluded from every box on this page.

If you have zero scored conversations in the window, the dashboard shows an empty-state card pointing you to Upload. Otherwise you see four sections:

### KPI cards

Four cards across the top.

| Card | Value | Hint line | Tone (colour) |
| --- | --- | --- | --- |
| Conversations scored | count of `qa_scores` rows in the window | `30d window` | neutral |
| Average score | `avg(total_score)` over the window, 1 decimal | `AI baseline X.X` if the post-appeal average drifts from the original AI baseline by ≥0.05; otherwise `matches AI baseline` | neutral |
| Compliance fails | count where `status = 'critical_fail'` | `X.X% of scored` | green if ≤2%, amber if 2–5%, red if >5% |
| Appealed | count where `appealed_at IS NOT NULL` | `X.X% had override confirmed` | neutral |

### Queue + status mix row

Three cards.

- **Pending first review** — workspace-wide count of `review_queue.state = 'pending_first'`. Click → /review-queue.
- **Pending second review** — workspace-wide count of `review_queue.state = 'pending_second'`. Click → /review-queue.
- **Status mix** — three counters: Final / Needs review / Compliance fail, each with a percent of total. Computed from `qa_scores.status` over the window.

### "By team" panel

Groups every score in the window by the agent's `team_name`. Conversations whose agent has no `team_name` go into `(unassigned)`.

| Column | Formula |
| --- | --- |
| Team | `team_name` or `(unassigned)` |
| Volume | row count for that team |
| Avg score | `sum(total_score) / volume`, 1 decimal |
| Fail rate | `count(status='critical_fail') / volume * 100`, 1 decimal |
| Appealed | `count(appealed_at IS NOT NULL)` |

Sorted by volume, descending (largest team first).

### Agent leaderboard

Two side-by-side tables: top 5 and bottom 5 agents by average score in the window. Eligibility: an agent must have **at least 3 scored conversations** in the window to appear (so a single 100/100 outlier doesn't dominate).

For each agent:

- Name, team (if set).
- Avg score = `sum(total_score) / n`, 1 decimal.
- Sample size n.

### Channel split

A small table showing volume and average score per channel (`voice_transcript`, `email`, `chat`). Avg = `sum / n` per channel, sorted by volume descending.

---

## Upload

**Page:** `/upload` — `src/app/(dashboard)/upload/page.tsx`. Server action: `uploadConversations` in `src/app/(dashboard)/upload/actions.ts`.

A two-step form:

### Step 1 · CSV file

- A single file picker. Accepts `.csv` files only.
- Hard limits enforced server-side: **max 10 MB**, **max 5,000 rows**.
- Hidden plan check: if the workspace is over its monthly conversation limit (see Billing), the upload is rejected with a message pointing to Billing.

If the CSV fails to parse, you get an inline error like `CSV parse error: <message> (row N)` and Step 2 doesn't render.

### Step 2 · Map your columns

Once a CSV is parsed, QAScope auto-detects which columns map to which canonical field. You can override every choice. Headers are lowercased before matching, so `Agent Name` and `agent_name` are equivalent.

Canonical fields:

| Field | Required? | What it is |
| --- | --- | --- |
| Agent name | yes | Free text. Used to find or create the `agents` row. |
| Transcript text | yes | The full conversation text. Min length 10 characters. |
| Channel | yes | One of `chat`, `email`, `voice` / `voice_transcript` / `call` / `transcript`. Anything else is rejected. |
| Conversation date | yes | `YYYY-MM-DD`. |
| Team name | no | Agents are identified by `(name, team)` so the same name in two teams stays distinct. |
| Customer ID | no | Free text, stored as-is. |
| Conversation ID | no | If blank, an `auto-<uuid>` value is generated. Used for de-duplication. |

Two "fixed value" controls under the table:

- **Fixed channel** — apply this channel to every row. Disabled when `channel` is mapped.
- **Fixed date** — apply this date to every row. Disabled when `conversation_date` is mapped.

Validation appears live as an amber list above the Upload button; the button is disabled until the mapping passes validation.

### Buttons

- **Upload** — submit the form. Disabled while pending or when validation fails.
- **Clear** — reset the form (file picker, mapping, results panel).

### What happens server-side

For each valid row:

1. Parse the row through a Zod schema (see "Row validation" below).
2. Skip the row if `(client_id, external_conversation_id)` already exists — counts toward "Duplicates".
3. Create or look up the `(agent_name, team_name)` agent.
4. Insert the conversation with `upload_batch_id` set to a freshly generated UUID shared by every row in this upload.
5. Update `clients.latest_upload_batch_id` to the new UUID, so the Latest-upload-only filter has something to point at.

### Row validation (Zod schema)

| Field | Rule |
| --- | --- |
| `conversation_id` | non-empty string after trim |
| `agent_name` | non-empty string after trim |
| `team_name` | optional, default `""` |
| `channel` | one of the channel aliases listed above |
| `transcript_text` | min 10 characters after trim |
| `conversation_date` | matches `^\d{4}-\d{2}-\d{2}$` |
| `customer_id` | optional, default `""` |

### Result panel

Four stat cards (`Total rows`, `Imported`, `Duplicates`, `Errors`) plus an Errors list (up to 50 entries). Each error shows row number, conversation id (when present), and the validation message.

---

## Rubrics

**Page:** `/rubrics` — `src/app/(dashboard)/rubrics/page.tsx`. Actions in `actions.ts`, `fatal-rules-actions.ts`, `fatal-rules-bulk-actions.ts`. Form: `rubric-form.tsx`. Fatal rules panel: `fatal-rules-panel.tsx`.

The rubric is the heart of scoring. Every conversation is scored against the **default** rubric for the workspace.

### Criteria table

Each rubric has up to seven criteria, identified by `sort_order` (the order also picks which prompt fires — see "Scoring logic" below). For each row:

| Column | Meaning | Editable? |
| --- | --- | --- |
| Sort order | 1 to 7. Picks which built-in prompt is used. | yes |
| Name | Free text label, e.g. `Compliance`, `Empathy`, `Resolution`. | yes |
| Description | Free text guidance shown in the AI prompt. | yes |
| Weight | Number ≥ 0. Influences the weighted total — see formula below. | yes |
| Critical fail | Boolean. If on, a 0 on this criterion turns the whole conversation into `critical_fail`. | yes |

Buttons:

- **Save** — write the criterion back.
- **Add criterion** — adds a new blank row.
- **Remove** — delete the criterion.

### Fatal rules panel

Below the criteria table. Fatal rules are project-specific compliance trip-wires. They get appended into the **Compliance** prompt at score time so each campaign can enforce its own checklist.

For each fatal rule:

- **Name** — short label, e.g. `Mini Miranda missing`.
- **Description** — explanation the model uses to spot the violation.
- **Active** — toggle. Inactive rules are kept but not injected.
- **Sort order** — controls the order in which they're listed in the prompt.

Bulk actions:

- **Import from CSV** — bulk-add rules from a two-column CSV.
- **Activate all / Deactivate all** — toggle every rule at once.
- **Delete inactive** — clean up disabled rules.

### Calculations on this page

None directly; the criteria you set here are the inputs to scoring. See "Scoring logic" for how weights and `critical_fail_boolean` flow into the final score.

---

## Knowledge

**Page:** `/knowledge` — `src/app/(dashboard)/knowledge/page.tsx`. Server actions in `actions.ts`. Upload form: `upload-form.tsx`. Status badge: `status-badge.tsx`.

### Document list

A single table.

| Column | Meaning |
| --- | --- |
| Title | Filename or extracted title. Click → preview / details. |
| Type | `pdf`, `txt`, `md`, etc. |
| Status | one of `processing`, `ready`, `failed`. See badge colours below. |
| Uploaded | timestamp. |
| Chunks | number of vector chunks indexed for retrieval (see below). |

Status badge colours:

- `processing` — amber. Doc is being chunked and embedded.
- `ready` — green. Doc is searchable.
- `failed` — red. Hover to see the error.

### Upload a knowledge document

A single file picker plus a Title field. On submit:

1. The file is stored.
2. The text is extracted and split into chunks (see `src/lib/ingest/chunking.ts`).
3. Each chunk is embedded via the embedding model and stored.
4. Status moves `processing` → `ready` (or `failed`).

### Delete

Each row has a Delete button (with confirmation). Deletes the document and all its chunks.

### How knowledge gets used at score time

When the AI scores a criterion, `retrieveKnowledge(supabase, clientId, criterionName)` runs a vector search against the workspace's chunks. Top-K chunks are appended to the system prompt under a `KNOWLEDGE BASE CONTEXT:` block, and the model is asked to cite which chunks it used. Citations are stored in `qa_score_details.sources_used`.

---

## Results

**Page:** `/results` — `src/app/(dashboard)/results/page.tsx`. Detail page: `/results/[id]` — `src/app/(dashboard)/results/[id]/page.tsx`. Server actions: `actions.ts`. Score button: `score-button.tsx`. Latest-upload toggle: `latest-upload-toggle.tsx`.

### List view (`/results`)

**Subtitle line:**

- `X scored · Y pending` — counts in the workspace (or, if the Latest-upload-only filter is on, in the latest batch).
- ` · all caught up` instead of ` · 0 pending` once everything is scored.
- ` · showing latest upload only` appears when the filter is active.

**Top-right controls:**

- **Latest upload only** toggle — see the shared section above.
- **Score button** (green/dark) — runs `scoreUnscored()`, which scores the next batch of unscored conversations. Disabled when there are zero unscored. Label changes:
  - `Score N pending` when there are unscored items (capped display at 25).
  - `Nothing to score` when caught up.
  - `Scoring...` while the action is running.
- **Rescore all** button — wipes every `qa_scores` row in this workspace and scores everything from scratch (uses `rescoreAll()` with limit 100). Two-step confirm to prevent accidents.

After a click, a small status line appears: `Attempted N, scored M, failed K · <first error message>`.

**Score limits per click:**

- `Score N pending` runs `scoreUnscoredConversations(..., limit=25)`.
- `Rescore all` runs `scoreUnscoredConversations(..., limit=100)`.

This means each "Score" click processes at most 25 conversations. If you have 200 unscored, click Score 8 times (or once for Rescore all if appropriate).

**Results table** — last 50 scored conversations.

| Column | Source |
| --- | --- |
| Date | `conversations.conversation_date` |
| Agent | `agents.agent_name` |
| Channel | `conversations.channel` (formatted) |
| Score | `qa_scores.total_score`, 1 decimal |
| Confidence | `qa_scores.confidence_score * 100`, 0 decimals, `%` |
| Status | badge: Final (green) / Needs review (amber) / Compliance fail (red) |
| External ID | `conversations.external_conversation_id` |

Click any row → detail view.

### Detail view (`/results/[id]`)

Pulls the `qa_scores` row, the linked conversation, agent, and the `qa_score_details` for every criterion.

What's shown, top to bottom:

- Header: agent name, channel, conversation date, total score, status badge, confidence.
- **Original AI score** versus **current score** — when an appeal has changed the score, the original is shown struck-through next to the new value with an "Appealed" tag.
- **Coaching note** — a short, agent-facing summary generated by the coaching prompt (see "Scoring logic"). May be empty if the coaching call failed.
- **Per-criterion table** — one row per criterion in the rubric:
  - Name, score (0/1/2), weight, contribution to the weighted total.
  - Confidence (0–100 %).
  - Explanation (free text from the model).
  - Evidence span (a quoted excerpt from the transcript the model thinks supports the score).
  - Sources used — links to knowledge-base chunks the model cited, if any.
  - Errored badge — if this criterion's LLM call failed and was excluded from the total.
- **Transcript** — the full conversation, with the model's evidence spans highlighted.

---

## Review queue

**Page:** `/review-queue` — `src/app/(dashboard)/review-queue/page.tsx`. Actions: `actions.ts`. Row actions: `review-row-actions.tsx`. Latest-upload toggle: shared component.

A two-tier human review system. When scoring flags a conversation it lands in Tier 1; if Tier 1 disagrees with the AI, it escalates to Tier 2.

### What lands here

A `review_queue` row is created during scoring when ANY of:

- `status = 'critical_fail'` → reason `critical_fail`.
- `status = 'needs_review'` (i.e. confidence < 0.7) → reason `low_confidence`.
- `status = 'final'` AND `total_score < clients.pass_threshold` → reason `low_score`.

### Subtitle line

`X awaiting first review · Y awaiting second review · Z resolved of N total`. SLA tail line: `SLA: Hh per tier · items auto-approve after deadline`.

### Top-right control

- **Latest upload only** toggle — same behaviour as Results.

### Pending first review (Tier 1) — table

| Column | Meaning |
| --- | --- |
| Date | conversation date |
| Agent | agent name + external id (mono small) |
| Channel | channel name |
| Score | current total score, original baseline (struck-through if appealed), and confidence |
| Flagged | reason badge: Compliance fail (red) / Below pass (orange) / Low confidence (amber) |
| Notes / SLA | SLA countdown badge, colour-coded |
| Action | row actions, see below |

**SLA countdown badge:**

| Time left | Colour | Label |
| --- | --- | --- |
| < 0 (overdue) | red | `Overdue · auto-approving` |
| < 1 hour | red | `Nm left` |
| 1–2 hours | red | `H.Hh left` |
| 2–6 hours | amber | `H.Hh left` |
| 6–24 hours | grey | `H.Hh left` |
| ≥ 24 hours | grey | `Dd Hh left` |

**Tier-1 actions** (`FirstReviewerActions`):

- **Agree with AI** — close the case (auto-approved). No score change.
- **Disagree** — opens an inline form: enter a new score (0–100) and reason, then submit. The case escalates to Tier 2.
- **Notes** — short text input shown to Tier 2 if escalated.

### Pending second review (Tier 2) — table

Same columns as Tier 1, plus the first reviewer's note and decision shown inline.

Visibility: Tier 2 actions are only enabled for the user listed as `clients.second_reviewer_user_id` (set in Settings → Review). Other users see the table but with "view-only" annotations.

**Tier-2 actions** (`SecondReviewerActions`):

- **Confirm override** — accept the Tier-1 reviewer's adjusted score. Updates `qa_scores.total_score` and stamps `appealed_at`. Closes the case.
- **Deny override** — reject the override; the AI baseline stands. Closes the case.

### Resolved (collapsible)

A `<details>` summary block listing closed cases. For each row:

- Outcome badge:
  - `Override confirmed` (green) — Tier 2 confirmed the change.
  - `Override denied` (grey) — Tier 2 rejected the change.
  - `Auto-confirmed (SLA)` (light green) — Tier 2 missed the deadline; the override auto-confirmed.
  - `Agreed` (green) — Tier 1 agreed with the AI.
  - `Auto-approved (SLA)` (light green) — Tier 1 missed the deadline; the AI score stood.
- Notes from both reviewers (when present).
- Closed-at timestamp.

### SLA sweep

Every load of the page runs `sweepReviewSla()` (a Postgres function). It finds expired Tier-1 items and marks them auto-approved, expired Tier-2 items and marks them auto-confirmed. This is idempotent and cheap, so refreshing the page is safe.

---

## Reports

**Page:** `/reports` — `src/app/(dashboard)/reports/page.tsx`. Templates: `templates/`. Run page: `templates/[id]/run/page.tsx`. Edit: `templates/[id]/edit/page.tsx`. New: `templates/new/`. NL builder: `nl-actions.ts`. Engine: `src/lib/reports/template-engine.ts`. ISO-week helper: `iso-week.ts`.

### Templates list

Built-in plus user-created templates (e.g. "Weekly QA scorecard", "Top 10 agents", "Compliance fails by team").

For each template:

- **Run** — execute and view the report.
- **Edit** — change parameters.
- **Delete** — remove the template.

### Running a report

You can pass parameters per template (date range, team, agent, channel). Results render as tables and stat cards inline. Each report supports:

- **Print** (button at top-right) — opens a print-friendly view.
- **Export** — typically CSV.

### Building a new template

Two paths from `templates/new/`:

- **Pick a recipe** — choose from a list of canned templates (volume, average score, compliance fails, agent leaderboard).
- **Describe in plain English** — type "Show me Mike's compliance fails for last week" and the NL action (`nl-actions.ts`) compiles it into a config the engine can run.

Validation is server-side and uses the standard date helpers in `iso-week.ts`. The engine in `template-engine.ts` is what actually runs the queries — it's a small, declarative thing that says "select from `qa_scores` joined to `conversations`, filter by these params, group by these dimensions, output these aggregations".

### Calculations available in the engine

| Aggregation | Formula |
| --- | --- |
| Volume | `count(qa_scores.id)` |
| Avg score | `avg(qa_scores.total_score)` |
| Compliance rate | `count(status = 'critical_fail') / count(*) * 100` |
| Pass rate | `count(total_score >= clients.pass_threshold) / count(*) * 100` |
| Appeal rate | `count(appealed_at IS NOT NULL) / count(*) * 100` |

Each can be grouped by team, agent, channel, week (ISO week), or month.

---

## Settings

**Page:** `/settings` — `src/app/(dashboard)/settings/page.tsx`. Subpages and forms: `actions.ts`, `llm-actions.ts`, `llm-settings-form.tsx`, `review-settings-form.tsx`, `team/`.

### LLM provider

Set the provider that scoring and coaching use.

| Field | Meaning | Notes |
| --- | --- | --- |
| Provider | one of `bedrock`, `openai`, `openrouter`, `gemini`, `groq`, `together`, `anthropic`, `custom` | controls the auth path |
| Base URL | optional override for OpenAI-compatible endpoints | only relevant for `openrouter`, `custom`, etc. |
| API key | provider key | written to the workspace, never read back to the client |
| Model | e.g. `gpt-4o-mini`, `claude-3-5-sonnet`, `nova-lite` | must match the provider |

**Test connection** button — runs a tiny chat call to verify the credentials before saving.

### Review settings

| Field | Default | What it controls |
| --- | --- | --- |
| Pass threshold | 70 | If a `final` score is below this, it goes to Tier 1 with reason `low_score`. |
| SLA hours per tier | 24 | Used by `computeSlaDeadline(slaHours)` to set `review_queue.sla_deadline` for both Tier 1 and Tier 2. |
| Second reviewer | one user from your team | the only user who can confirm/deny Tier-2 overrides |

### Team

Subpage `/settings/team`.

- **Invite a user** — name, email, role. Sends an invitation email with a magic-link.
- **Bulk upload** — CSV with `name,email,role` columns to invite many at once.
- **Existing members** — list with role and last-active.
- **Remove** — revoke access.

Roles available:

- `tier_1_reviewer` — can act on Tier 1 reviews.
- `tier_2_reviewer` — can act on Tier 2 reviews if also set as `clients.second_reviewer_user_id`.
- `manager` — read-only across the workspace.
- `admin` — everything, plus rubrics and settings.

---

## Billing

**Page:** `/billing` — `src/app/(dashboard)/billing/page.tsx`. Actions: `actions.ts`. Plan switcher: `change-plan-button.tsx`. Plan definitions: `src/lib/billing/plans.ts`. Usage: `src/lib/billing/usage.ts`. Limits: `src/lib/billing/limits.ts`. Cost helper: `src/lib/billing/openai-cost.ts`.

### Plan card

Shows the current `clients.active_plan`, monthly conversation cap, and seat count. Below it:

- **Change plan** — opens a modal listing the available plans with their monthly conversations cap and price. Clicking a plan rewrites `active_plan`. Downgrades take effect at the next billing cycle; upgrades take effect immediately.

### Usage card

For the current calendar month:

- **Conversations this month** = `count(conversations.created_at within month)` for this client.
- **Monthly limit** = the cap of the active plan.
- **% used** = `conversations / limit * 100`. Bar turns amber at 80 %, red at 100 %.
- **Days left in cycle** — derived from `created_at` of the plan and today.

If `usage.isOverLimit`, the Upload page blocks new uploads with a redirect message.

### Spend card (LLM cost)

For each scored conversation, `chatText` records prompt + completion tokens against `openai_usage`. The Spend card sums up:

- Tokens used (prompt + completion) this month.
- Estimated cost (cents) — looked up via the per-model rates in `openai-cost.ts`.

These are estimates; the source of truth is your provider's invoice.

---

## Scoring logic (the math)

Implemented in `src/lib/scoring/score-conversation.ts`, `score-batch.ts`, `scoring-math.ts`. Prompts: `prompts.ts`. Retrieval: `retrieval.ts`. SLA: `sla.ts`. Cost: `openai.ts`.

### What "Score" actually does, end-to-end

For one conversation:

1. Load the conversation and its agent.
2. Load the workspace's default rubric, criteria (`qa_criteria`), pass threshold, SLA hours, and active fatal rules.
3. Skip if a `qa_scores` row already exists for this conversation + rubric.
4. For every criterion, in parallel:
   - Pick the prompt by `sort_order`. The seven built-in prompts cover compliance, empathy, resolution, accuracy, professionalism, efficiency, and tone (see `prompts.ts`).
   - For criterion `compliance` (sort_order 1), append the workspace's active fatal rules into the system prompt.
   - Run `retrieveKnowledge(...)` and append matching chunks under `KNOWLEDGE BASE CONTEXT:`.
   - Call the LLM. Retry once on transient errors with a 4-second backoff.
   - Parse the JSON response (`parseCriterionJson`). Out-of-range scores clamp to 0; out-of-range confidence clamps to [0, 1].
   - If both attempts fail, flag the criterion as `errored` and continue.
5. Compute totals (formulas below).
6. Insert `qa_scores` and `qa_score_details` rows.
7. If the result needs review, insert a `review_queue` row.
8. Best-effort: generate a coaching note via a separate LLM call. If it fails, it's logged but doesn't fail the score.

### Per-criterion score scale

Each criterion is scored 0, 1, or 2.

| Score | Meaning |
| --- | --- |
| 0 | Not met. Triggers `criticalFail` if the criterion is marked `critical_fail_boolean`. |
| 1 | Partially met. |
| 2 | Fully met. |

### Total score (0–100)

```
earned     = sum_over_criteria_not_errored( (score / 2) * weight )
totalWeight = sum_over_criteria_not_errored( weight )
totalScore  = totalWeight > 0 ? (earned / totalWeight) * 100 : 0
```

Stored in `qa_scores.total_score`, rounded to 2 decimals.

Errored criteria (LLM call failed) are excluded from BOTH the numerator AND the denominator, so a transient provider error doesn't punish the agent.

### Confidence (0–1)

A weight-weighted average of per-criterion confidence:

```
overallConfidence = sum_over_not_errored( confidence * weight ) / sum_over_not_errored( weight )
```

Stored in `qa_scores.confidence_score`, rounded to 2 decimals.

### Critical fail

```
criticalFail = ANY non-errored criterion has critical_fail_boolean = true AND score = 0
```

### Status (`qa_scores.status`)

```
if criticalFail                   -> 'critical_fail'
else if confidence < 0.7          -> 'needs_review'
else                              -> 'final'
```

The 0.7 threshold lives in `LOW_CONFIDENCE_THRESHOLD` in `scoring-math.ts`.

### Review-queue reason

```
status = 'critical_fail'                              -> 'critical_fail'
status = 'needs_review'                               -> 'low_confidence'
status = 'final' AND total_score < clients.pass_threshold -> 'low_score'
otherwise                                              -> no review_queue row
```

### SLA deadline

`computeSlaDeadline(slaHours)` returns `now() + slaHours hours`. Saved as `review_queue.sla_deadline`. Once the wall-clock passes the deadline, the next page load runs `sweep_review_sla()` and auto-resolves the row.

### "Original" vs "current" score

When a `qa_scores` row is first inserted, `original_total_score` and `original_status` mirror `total_score` and `status`. If a Tier-2 override is confirmed, `total_score` and `status` get updated and `appealed_at` is stamped, but `original_*` stay frozen — so reports can compare AI baseline vs post-appeal.

### Cost accounting

Every LLM call goes through `chatText({ supabase, clientId, feature })`. After the call completes, prompt and completion tokens are logged to `openai_usage` with `feature = 'scoring' | 'coaching' | ...`. Cost in cents is computed in `openai-cost.ts` from the model id and token counts.

---

## Stop button — exact behaviour

Already covered in the top progress-bar section, but worth restating because the original bug was here:

1. Click Stop on the bar.
2. The browser calls `requestScoringStop()`.
3. `requestScoringStop()` flips an in-process flag (instant) and writes `clients.scoring_stop_requested_at = now()` via the **admin** Supabase client (bypasses RLS — required, because `clients` has SELECT-only RLS for tenant users).
4. The next iteration of the scoring loop in `scoreUnscoredConversations()` sees the flag and breaks out.
5. The flag is cleared (also via admin client) at the end of the run, so the next manual click of Score starts from a clean state.

What "next iteration" means: the loop checks the flag between conversations. The current conversation finishes (it's already mid-`Promise.all` on its seven criterion calls), then the loop exits. So the bar's "Stopping…" message is literal — you'll see one more conversation complete in most cases.

---

## Database tables touched

For reference. Every table is RLS-isolated to the workspace via `current_client_id()`.

| Table | What's in it | Touched by |
| --- | --- | --- |
| `clients` | the workspace itself, plan, SLA hours, pass threshold, LLM provider, Stop flag, latest upload batch id | Settings, Billing, Upload, Stop |
| `users` | members of the workspace | Settings → Team |
| `agents` | one row per (agent_name, team_name) | Upload |
| `conversations` | the imported transcripts | Upload, Results |
| `qa_rubrics` + `qa_criteria` | scoring rubric and criteria | Rubrics |
| `fatal_rules` | per-rubric compliance trip-wires | Rubrics |
| `qa_scores` | the AI score for a conversation | Scoring |
| `qa_score_details` | one row per criterion per score | Scoring |
| `review_queue` | items pending Tier-1 / Tier-2 review | Scoring, Review queue |
| `report_templates` | saved report definitions | Reports |
| `workspace_documents` + `knowledge_chunks` | knowledge base + vector index | Knowledge |
| `openai_usage` | per-call token + cost log | every LLM call |
| `subscriptions` | active billing plan record | Billing |
| `invitations` | outstanding team invites | Settings → Team |

---

## Migration log (most recent first)

- `016_upload_batch_id.sql` — adds `conversations.upload_batch_id` and `clients.latest_upload_batch_id`. Powers the "Latest upload only" filter.
- `015_scoring_stop_flag.sql` — adds `clients.scoring_stop_requested_at`. Powers the Stop button.
- `014_score_details_errored.sql` — adds `qa_score_details.errored`. Lets the totals exclude failed criterion calls.
- `013_user_preferences.sql` — per-user UI preferences.
- `012_agent_coaching_history.sql` — track coaching notes over time.
- `011_workspace_documents.sql` + `011a_add_sources_to_score_details.sql` — knowledge base infrastructure.
- `009_llm_config.sql` — workspace-scoped LLM provider settings.
- `008_openai_usage.sql` — token/cost log table.
- `007_plan_enum.sql` — plan name enum.
- `006_report_templates.sql` — saved report definitions.
- `005_fatal_rules.sql` — per-rubric compliance trip-wires.
- `004_invitations.sql` + `004a_user_role_enum.sql` — team invites.
- `003_pass_threshold.sql` — workspace pass threshold.
- `002_two_tier_review.sql` — Tier 1 + Tier 2 review queue.

To apply migration 016 in production, paste the file contents into the Supabase SQL editor and run. It is idempotent.
