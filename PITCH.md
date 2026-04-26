# QAScope — for the BPO friends

A short, copy-paste-friendly summary of what QAScope is, who it's for, what to expect, and what *not* to expect. Use whichever block fits the channel you're pitching on.

---

## One-liner

QAScope is an AI QA copilot for support teams. Upload your agent ↔ customer conversations as a CSV; QAScope scores every one against your rubric, flags compliance failures, and gives team leads a prioritized review queue + a manager dashboard. Free private beta.

---

## WhatsApp message

> Building an AI QA tool for BPOs — instead of QA managers manually scoring 5–10% of calls, it scores **every** conversation against your rubric, flags compliance fails and low scorers, and gives you a weekly report. Free during beta — Pilot tier covers 500 convos/month and 4 teammates. ~10 mins to set up. Want to try? You don't even need real data to start; it works on any CSV format.

---

## Two-paragraph pitch (email / DM)

> Most BPO QA teams sample 5–10% of conversations because that's all a human can review. The unreviewed 90% is where coaching opportunities and compliance risks hide. QAScope scores **every** conversation through OpenAI against a rubric you control: 7 weighted criteria + your project-specific fatal rules (e.g. "must verify identity before sharing account info"). Anything that fails or scores below your pass threshold lands in a review queue with an SLA — your team lead either agrees with the AI or escalates to a senior reviewer. The whole loop produces a weekly manager report you can print as the QA digest you'd otherwise spend a day building.
>
> Concretely you'd: sign up, paste your rubric (or use the default 7-criterion one), upload a CSV of last week's transcripts, and 2 minutes later have every conversation scored, with a coaching note per agent and a flagged review queue. The free Pilot tier covers 500 conversations a month, which is enough for a 20–30-agent team to do a full week of audits. I'd be looking for honest feedback in return — what's wrong, what's missing, what changes how your week looks.

---

## Honest disclaimers (paste with the pitch)

- **Private beta.** Schemas may still change; I might ask you to re-import once during the beta. Your data stays in your workspace either way.
- **Tenant isolation is real.** Every BPO has its own workspace; Postgres row-level security blocks cross-tenant reads at the database level. Other people's transcripts are never visible to you, and yours are never visible to them.
- **No real billing yet.** Pilot tier (free, 500 conversations/month, 4 teammates) is what you'll use during beta. Growth/Pro pricing on `/billing` is what we plan to charge later — listed for transparency, not committed.
- **OpenAI cost is on me during beta.** I'll bring my own key. Once the beta ends, you'd either pay a flat platform fee + your own OpenAI key, or an all-inclusive plan — your choice.

## Pricing (when we go paid)

| Plan | Seats | Conversations / mo | OpenAI cost | Price |
|---|---|---|---|---|
| Pilot | 1 | 500 | We cover it | Free |
| Starter | 1 | Unlimited | You bring your key | ₹6,999 / mo |
| Team | 3 | Unlimited | You bring your key | ₹14,999 / mo |
| Pro | 5 | Unlimited | You bring your key | ₹29,999 / mo |
| Extra seat | — | — | — | ₹2,999 / seat / mo |

Seats = anyone you invite to your workspace (admins, QA managers, team leads, reviewers). The agents themselves don't need seats — they're scored from CSV uploads, not logged-in users. So a 30-agent BPO might only need 1-3 seats: a QA manager + maybe a team lead.

**On the BYO LLM key:** paid tiers run on your own LLM account, so the provider bills you directly for tokens consumed (~₹0.20 per scored conversation on `gpt-4o-mini`). You see the live usage and exact rupee amount inside QAScope on the `/billing` page — no surprises. We charge a flat platform fee on top, which covers the workflow, dashboards, hosting, support.

**You pick the provider.** QAScope works with any LLM that speaks the OpenAI Chat Completions API — that's a long list:

- **OpenRouter** (recommended): one API key, hundreds of models. Switch between OpenAI, Anthropic Claude, Llama, Mistral, Gemini without changing your QAScope config — just pick a different model id. Great for cost arbitrage.
- **OpenAI direct**: most reliable, often pricier
- **Together AI / Groq**: cheap open-source models (Llama 3, Mixtral, etc.)
- **Azure OpenAI**: for customers with existing MS contracts
- **Custom**: any OpenAI-API-compatible endpoint (self-hosted, vLLM, LocalAI, etc.)

You set this up once in Settings → LLM provider. Your key never leaves your workspace; we never proxy through any other party.

**Why this works for you:** A 30-agent BPO running QAScope replaces about 1.5 human QA reviewers (~₹45K/month in salary). Paying ₹15K/month + ~₹2K in OpenAI is a 2-3× return on month one.

## Don't have real data to share?

Most corporate friends won't be able to hand over their employer's transcripts (rightly so — that's your friend's compliance team's problem to clear). Three options that work without real data:

1. **Use the bundled sample CSV.** `test-data/sample-conversations.csv` has 100 generic support conversations across voice / email / chat covering refund handling, internet troubleshooting, plan upgrades, complaints. It's enough to demonstrate every scoring path including critical fails.
2. **Anonymized small batch.** Pick 50-100 conversations from a recent campaign, redact PII (names, phone, account numbers) and load that. Their compliance team usually allows redacted data for vendor evaluation.
3. **Synthetic for their domain.** Tell me what kind of campaign they run (banking, telecom, insurance, e-commerce) and I'll generate ~100 realistic synthetic transcripts in their domain so they can feel the product on relevant content.

---

## What you need to provide

- An email address to sign up
- A CSV of conversations (any column names — QAScope's upload page auto-detects and lets you map them). At minimum you need agent name, transcript text, channel (voice / email / chat), and a date. Customer ID, conversation ID, team name are optional.
- Your QA rubric if you have one — or use the default 7-criterion rubric
- 30 minutes for a first walkthrough

---

## What you'll get back

- Every conversation scored 0–100 with a 3–5 sentence coaching note per agent
- A review queue with red/amber/orange badges (compliance fail / low confidence / below pass)
- A manager dashboard: KPIs over the last 30 days, top/bottom agents, by-team rollup, by-channel split
- A weekly Mon–Sun report with AI-baseline-vs-final score delta (so you can see how often reviewers actually overturn the AI)
- Saved report templates: one-time setup ("show me agents below 70 in Mumbai this week"), then re-run free forever

---

## What I'd like in return

- Honest reactions on the first run ("the dashboard is wrong because…", "I'd never use this report unless…")
- Permission to ask follow-up questions about your QA workflow
- A 30-minute call after week 1 to debrief
- If you find a bug, a CSV row that triggers it (so I can reproduce)

---

## How to start

1. Open the link I'll send you (`https://qascope.app` or `qascope.vercel.app`)
2. Sign up — you'll be the admin of your workspace
3. Settings → Team — invite your team leads with the role `qa_manager` or `team_lead`. The invite link is a copy-paste URL; share via WhatsApp.
4. Rubrics — review the default 7 criteria; tick "Critical" on anything that's a fatal compliance issue for your campaign
5. Rubrics → Fatal rules → Bulk upload CSV — paste your campaign's compliance checklist
6. Settings → Pass threshold — set the score below which a conversation lands in review (default 70%)
7. Upload → upload your CSV
8. Results → click "Score 25 pending" — wait 1–2 mins per batch
9. Dashboard / Review queue / Reports — these populate as scoring completes

---

## Questions you'll probably get asked back (and the honest answers)

> *"Can the AI be wrong?"*  
> Yes. The review queue exists for exactly that reason — anything below the confidence threshold or below your pass score gets a human look. The AI is a force-multiplier for QA, not a replacement.

> *"What model are you using?"*  
> `gpt-4o-mini` by default. Can be swapped via env var.

> *"Where is my data stored?"*  
> A Supabase Postgres database in the region you/we chose at project creation (Mumbai for India residency). Row-level security ensures only your workspace can read your data.

> *"How do I export everything?"*  
> Not yet self-serve. Ask me and I'll run a SQL dump for you.

> *"What if I want to leave the beta?"*  
> I'll delete your workspace on request. The Postgres `clients` cascade clears every related row.
