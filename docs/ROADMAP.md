# Engineering Roadmap

The MVP is live. This document organizes everything beyond it into work streams. Each stream lists concrete deliverables, why they matter, and what unlocks them.

> Treat versions as themes, not deadlines. Ship pieces from each stream as they become unblocked, not all-at-once.

---

## V2 themes (next 8–12 weeks of work)

### Stream A — Real-time ingestion

**Why:** CSV uploads are batch, manual, and friction-heavy. Real BPO operations want every conversation scored within minutes of it ending. Switching to push/webhook ingestion is what separates "demo tool" from "operational tool."

**Deliverables, in order:**

1. **Generic webhook endpoint** — `POST /api/ingest` accepts JSON conversations from any source, queued for scoring. Authenticated via per-workspace API token.
2. **Zendesk Connector** — listen for `Ticket Updated` webhook, pull the new comments, score asynchronously. (Zendesk first because it's the most common SMB BPO tool in India.)
3. **Genesys Cloud Connector** — webhook + transcript fetch. Voice-heavy BPOs use this.
4. **Webhook retry + dead-letter queue** — when scoring fails, automatic retries with back-off; failed-3-times items land in a "Stuck" admin view.
5. **Per-workspace API tokens** — Settings → API page lets admin generate / rotate / revoke tokens.

**Unblocks:** Stream B (real-time coaching), Stream D (multi-rubric routing).

---

### Stream B — Agent-facing self-coaching

**Why:** Today the dashboard is manager-facing. The biggest behavioral change happens when agents see their own scores within hours of a call. Most QA tools fail because feedback reaches agents days late and via email.

**Deliverables:**

1. **Agent role + login** — new `agent` role; can only see their own conversations, scores, and coaching notes.
2. **Agent dashboard** — "your last 7 days" view with score trend, last 5 conversations, the most actionable coaching note.
3. **Push to Slack/Teams DM** — when an agent gets a critical-fail score, ping their personal Slack/Teams channel with the coaching note.
4. **"Practice" mode** — agent reads a sample call transcript, types how they'd respond, gets AI-graded against the rubric. Useful for new-hire onboarding.

**Unblocks:** Premium "agent enablement" pricing tier, much higher daily-active-user numbers (sells to procurement: "one tool, 100 daily users").

---

### Stream C — Calibration analytics

**Why:** Right now you can see scores; you can't see whether the AI's scoring is *right*. Calibration analytics quantify reviewer-AI agreement over time — a critical trust-building metric.

**Deliverables:**

1. **Reviewer agreement rate** — for the last N reviewed items, what % did the reviewer agree with vs. override the AI? Per-criterion breakdown.
2. **Drift detection** — week-over-week, is the AI's score distribution shifting? (Could indicate a prompt-tuning need or a real change in agent behavior.)
3. **Inter-rater reliability** — when two reviewers see the same conversation, do they agree? Helps the manager spot which reviewer is the outlier.
4. **A/B prompt tester** — admin uploads a small batch, runs it through 2 prompt variants, compares scores side-by-side. Useful when iterating on the rubric.

**Unblocks:** Enterprise procurement conversations ("how do we trust this AI?"), data-driven prompt improvements.

---

### Stream D — Multi-rubric / multi-campaign

**Why:** Today there's one default rubric per workspace. A real BPO runs 5+ campaigns, each with different scoring criteria (banking compliance ≠ telecom support). Multi-rubric is table stakes for anyone above a single-campaign shop.

**Deliverables:**

1. **Multiple rubrics per workspace** — admin can create N rubrics, switch the "default" between them, or assign a rubric to a campaign.
2. **Campaign / queue concept** — `campaigns` table with name, rubric_id, fatal_rules (inherited from rubric).
3. **Per-campaign reports** — `/reports/campaign/[id]` view.
4. **CSV column "campaign"** — upload routes each row to the right rubric automatically.
5. **Rubric library / templates** — "Banking customer service" / "Telecom support" / "E-commerce returns" pre-built rubrics admins can clone and customize.

**Unblocks:** Anyone with > 1 line of business (every mid-market BPO).

---

### Stream E — Voice / audio ingestion

**Why:** Today QAScope expects text transcripts. Many BPOs only have audio recordings. Adding a transcription pipeline removes a manual conversion step that today blocks adoption.

**Deliverables:**

1. **Audio upload page** — accept WAV / MP3 / M4A files
2. **Transcription via Whisper or Deepgram** — diarized output ("Agent:", "Customer:")
3. **Transcript review/edit page** — let a human fix mis-transcriptions before scoring
4. **PII redaction step** — auto-mask card numbers, account IDs, names before storing transcripts
5. **Per-workspace transcription provider config** — so customer can BYO Deepgram key, like the LLM config

**Unblocks:** Voice-heavy BPOs (most of them). Also unlocks the "easy onboarding" sales motion: "send us a Zip of audio files, we'll show you scored conversations in 15 minutes."

---

### Stream F — Razorpay & data lifecycle

**Why:** Billing, exports, deletion. The unsexy plumbing that turns a beta into a real SaaS.

**Deliverables:**

1. **Razorpay subscription flow** — actually charge for plan changes, handle webhooks, retry failed payments, send invoices.
2. **Annual plans** — 2 months free for annual prepay, common B2B SaaS pattern.
3. **Workspace export** — admin can download a Zip of all their CSV data + scores + reports as JSON.
4. **Workspace deletion** — admin can permanently delete the workspace; cascade clears every related row; we keep the deletion event in an audit log.
5. **Audit log** — every important action (rubric change, plan switch, member invite, score override) logged with who + when.

**Unblocks:** Enterprise procurement (they need "what happens when we leave?" answered), recurring revenue tracking, dispute resolution.

---

## V3 themes (later, only if pilots validate them)

These are deferred until pilot signals make them worth building. **Don't start any of these without 3+ paying customers asking for it.**

- **White-label / partner edition** — let a BPO consultancy resell QAScope to its clients with their branding.
- **Mobile app** — iOS/Android team-lead view of the review queue. Useful for on-the-floor managers.
- **AI agent simulator** — generate synthetic customer-service conversations for training purposes (Stream B's "practice mode" extended).
- **Auto-coaching micro-lessons** — pattern-detection across an agent's last N calls produces a 60-second video lesson tailored to their specific weakness.
- **Manager copilot** — Slack bot that proactively pings a manager when an agent's score drops 20%+ in a week.
- **Compliance certification mode** — generate audit-ready reports for ISO 9001, PCI-DSS, HIPAA reviewers.
- **Embedded scoring** — `<iframe src="...">` widget BPOs can drop into their own admin tools.

---

## Cross-cutting infrastructure debt

These don't ship as features but unblock everything else.

- **Background job queue** — needed for Stream A retries, Stream E transcription. Probably Inngest or a Postgres-cron + LISTEN/NOTIFY pattern.
- **Server-action timeout audit** — Vercel Hobby = 60s, Pro = 5min. Move slow operations (scoring batches > 10 rows, transcription, big report runs) to a job queue.
- **Migrations runner** — running 9 SQL files manually in order is fragile. Adopt Supabase CLI migrations or a small in-app runner.
- **End-to-end tests** — Playwright tests covering the critical paths (sign up, upload, score, review, report). Currently we have unit tests for pure helpers; nothing covers full flows.
- **Observability** — Sentry / Posthog. Right now if a customer hits an error, we find out via WhatsApp.

---

## How to use this doc

When you sit down to plan a week:

1. Pick **one** stream to make progress on. Don't context-switch across streams in one week.
2. From that stream, pick the **lowest-numbered deliverable that's not done.** They're ordered by dependency.
3. Time-box: 2–3 days of focused build per deliverable. If it's bigger than that, it's actually two deliverables — split it.
4. After it ships, **write what you learned** at the bottom of this doc. The roadmap should change as the pilot teaches you what matters.

The biggest mistake at this stage is to build everything in this doc. Most of it won't ship — and the parts that do ship will look different from what's described here once a real customer pushes back on the design.
