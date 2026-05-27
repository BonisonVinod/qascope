# QAScope — Feature Tour (Plain English)

A walkthrough of every page in the sidebar, what it does, and what you'd
typically do on it. Written so an ops manager who has never seen a QA
tool can pick it up.

For the engineering-level reference (every field, every calculation,
every input/output), see `FEATURE-REFERENCE.md`.

---

## Sign-in / Sign-up

http://localhost:3000/login  and  http://localhost:3000/signup

You sign in with email + password. First person in a workspace becomes
the **admin** of that workspace. They can invite teammates from
Settings → Team.

---

## Dashboard

http://localhost:3000/dashboard

The first thing you see after signing in. KPI summary of QA activity for
the date range you pick.

What's on it:

- Four KPI tiles at the top: conversations scored, average score,
  compliance fails, cases appealed.
- Pending review counts (Tier 1 and Tier 2).
- A status mix breakdown — Final, Needs review, Compliance fail.
- A "By team" table — average score, volume, fail rate per team.
- An agent leaderboard — top 5 and bottom 5 by average score
  (agents need at least 3 scored conversations to appear).
- A channel split — voice / email / chat.

The **date range picker** in the top right of the page controls the
window. Quick presets: 7d, 30d, 90d, 6m, 1y. Or pick custom From/To
dates on the calendar.

---

## Upload

http://localhost:3000/upload

Where you bring in conversation transcripts. Two steps:

1. **Step 1 · CSV file** — drop a CSV. Max 10 MB, max 5000 rows.
2. **Step 2 · Map your columns** — the app auto-detects which CSV column
   maps to each QAScope field (agent name, transcript, channel, date,
   etc.). Adjust the dropdowns if anything's wrong. Required fields are
   marked with a red asterisk.

You can set a fixed channel or date if your CSV doesn't have them.

After upload, you'll see a summary card: how many rows imported, how
many were duplicates (skipped), how many errored. Each upload is
tagged with a unique **batch id**, which is how the Results page knows
to show only the most recent upload.

---

## Rubrics

http://localhost:3000/rubrics

This is where you tune what "good QA" means for your project. Available
to every plan.

What you can do:

- **Edit criteria.** Each criterion has a name (e.g. "Compliance"),
  description, weight (how much it counts toward the total), and a
  "critical fail" flag (if on, scoring 0 on this criterion sets the
  whole conversation to compliance-fail).
- **Add or remove criteria.** Use the Add button at the bottom of the
  table.
- **Fatal rules** (the panel below criteria). These are
  project-specific compliance trip-wires that get added into the
  Compliance prompt at scoring time. Example: "Did not say mini-Miranda
  disclosure." If the AI catches a violation with quotable evidence,
  it's an automatic 0 on compliance.

Changes take effect on the next scoring run. To re-score existing
conversations against a new rubric, go to Results → "Rescore all."

---

## Knowledge

http://localhost:3000/knowledge

Upload documents (SOPs, scripts, regulatory guides) that the QA engine
will consult while scoring. Each document gets chopped up and indexed.
At scoring time, relevant snippets are pulled into the prompt so the AI
judges against your actual policy, not its training data.

Status badges:

- **processing** (amber) — the document is being chunked and embedded.
- **ready** (green) — it's searchable.
- **failed** (red) — hover for the error.

Note: if your QA engine provider doesn't expose an embeddings endpoint
(e.g. Groq, AWS Bedrock), turn on "Use a separate API key for
embeddings" in Settings → QA engine provider and paste an OpenAI key
for embedding calls.

---

## Results

http://localhost:3000/results

The audit screen. Shows only the **most recent upload** by default — for
historical audits, go to Reports. Older data stays in the database; the
Results page just keeps focus on what's actively being reviewed.

What you see:

- A header counter: "X scored · Y pending · current upload".
- **Download CSV** button — exports the visible rows as a spreadsheet.
- **Score N pending** button — runs the AI on every unscored
  conversation in the current upload. When the count is ≥ 100, a
  confirmation modal warns you with an estimated time before kicking
  off.
- **Rescore all** button — wipes scores for the current upload and runs
  fresh.
- **Stop button** — appears on the top progress bar while scoring is
  running. Click to stop after the current conversation finishes.

The table shows each scored conversation: conversation date, audited
date, agent, channel, score (0–100), confidence %, status, external ID.
Click any row to see the full breakdown.

---

## Results detail

http://localhost:3000/results/[id]

Drill-in for one scored conversation. Shows:

- The agent, channel, total score, confidence, and status.
- A **coaching note** — a short coaching summary written by the AI.
- A **criterion breakdown** — each rubric criterion with its score
  (Met / Partial / Failed), confidence, the AI's explanation, the
  evidence quote from the transcript, and any knowledge-base sources
  consulted.
- The **full transcript** at the bottom.

Hover the **?** next to "Confidence" for an explanation of what
confidence means.

---

## Review queue

http://localhost:3000/review-queue

The two-tier human review system. Items land here automatically when
the QA engine flags them.

A conversation gets queued if any of:

- The AI marked it `critical_fail` (any critical criterion scored 0).
- Confidence is below your workspace threshold (default 70 % — change
  in Settings → Review).
- Score is below the pass threshold (default 70 %, change in Settings).

Workflow:

- **Tier 1** (anyone in the workspace): Agree (closes the item; AI
  score stands) or Disagree (escalates to Tier 2 with a required note).
- **Tier 2** (the designated second reviewer): Confirm override (apply
  Tier 1's adjusted score and mark the score appealed) or Deny override
  (original QA score stands).
- **Auto-resolution**: each tier auto-resolves after its SLA expires
  (default 24h). Tier 1 auto-approves the AI score; Tier 2
  auto-confirms the override.

---

## Reports

http://localhost:3000/reports

Weekly / custom-range analytics. The default view shows the current
ISO week (Monday to Sunday). Use the **date range picker** in the top
right to switch to any custom range — same component as the Dashboard
picker, with 7d / 30d / 90d / 6m / 1y quick presets.

What's on the report:

- Four headline KPI cards.
- Status mix.
- Per-channel breakdown.
- Per-agent breakdown.

Buttons in the header:

- **Saved templates** — pre-built or custom report definitions
  (Volume by team, Compliance fails by agent, etc.).
- **Previous / Next** — moves the window backward or forward by its
  own size (a 7-day window steps by 7 days; a 30-day window steps by
  30).
- **Download CSV** — exports the visible report sections as a
  multi-section CSV.
- **Print** — opens a print-friendly view.

---

## Billing

http://localhost:3000/billing

Your plan, this month's volume, team seats, and the per-month
QA-engine cost (estimated from your token usage).

The plan-comparison cards at the bottom show what each tier includes:

- **Pilot** (free, 500 conversations / month — QAScope covers the cost):
  Full feature access. Single seat. Email support within 24 h.
- **Starter** (₹6,999 / mo, 1 seat): Unlimited conversations on your
  own QA-engine key. Integrations available at ₹2,499 / mo each.
- **Team** (₹14,999 / mo, 3 seats): Same as Starter plus bulk team
  import and 1 integration included. ₹2,999 / extra seat.
- **Pro** (₹29,999 / mo, 5 seats): Slightly cheaper per-seat overage
  than Team. ₹2,499 / extra seat.

All paid tiers share the same 24-hour email support SLA — one promise,
kept across the board.

---

## Settings

http://localhost:3000/settings

Workspace and account configuration. The page contains:

- **Account** — your name, email, role, workspace name.
- **Team** → link to /settings/team to invite / manage team members.
- **QA engine provider** (admin-only) — pick your AI provider, paste
  your API key. See `GETTING-STARTED.md` for recipe by provider.
  Optional separate embedding key for providers that don't expose
  embeddings.
- **Review workflow** — second reviewer, SLA hours per tier, pass
  threshold, confidence threshold for review.
- **Workspace → Danger zone** (admin-only) — **Reset workspace…** wipes
  all conversations / scores / review items / knowledge documents while
  keeping rubric, credentials, team, and billing intact. Two-step
  confirm (type `RESET`).

---

## The top-of-page progress bar

While a scoring run is in flight, a sticky bar appears at the top of
every page:

- **Green dot** — scoring is making progress.
- **Amber dot** — the scored count hasn't moved in 30 s. Your QA engine
  provider may be rate-limited or slow.
- **Grey dot** — Stop was clicked. The current conversation finishes,
  then the loop exits.

The **Stop button** on this bar genuinely stops the run; it doesn't
just queue the remainder. Worst case, you'll see one more conversation
complete before the loop exits.

---

## Sign out

Bottom-left of the sidebar. Single click, no confirmation.
