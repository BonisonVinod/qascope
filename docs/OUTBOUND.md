# Outbound Playbook

How to manufacture warm-shaped pipeline from cold contacts, in 60 minutes a day, using existing tools. Written for the solo-founder, pre-revenue stage.

> The goal: 10 hand-personalized cold emails per day → 30–50 replies/month → 10–15 discovery calls/month → 1–2 paying customers/month.

---

## Tool stack (~₹6,000/month, all SaaS)

| Tool | Purpose | Why this one |
|---|---|---|
| **Apollo.io** | Prospect database — find decision-maker contacts at small Indian BPOs | Best India coverage for SMB; reliable verification |
| **Smartlead.ai** | Send sequenced emails from multiple inboxes, auto-warmup, reply tracking | 4× cheaper than Outreach/Salesloft, designed for solo senders |
| **Claude or ChatGPT** | Personalize each email; write LinkedIn posts | The personalization is what gets replies |
| **Google Sheets** | Track responses + manage hot leads (don't graduate to a CRM until you have 30+ active conversations) | Free, instant, no learning curve |
| **One Gmail or Google Workspace inbox + 2 secondary domains** | Send from a "real" person address, warm secondaries to spread volume | ~₹500/year for a domain |

**Skip these for now:** Lemlist, Lavender, Clay, Reply.io, Lusha (Apollo is cheaper and equally good for India), Sales Navigator (only useful at scale).

---

## One-time setup (~3 hours)

1. **Buy a domain** (`qascope.app` or `qascope.in` — ₹600/year on Namecheap/GoDaddy)
2. **Set up Google Workspace** with 2 secondary domains (e.g. `bonison@qascope.io`, `bonison@qascope.app`) — keeps your primary clean if a domain gets flagged
3. **Configure SPF, DKIM, DMARC records** on each domain (Smartlead/Instantly walks you through this)
4. **Warm up the inboxes for 14 days** before sending real cold mail (Smartlead does this automatically — it sends fake conversations between your inbox and others)
5. **Connect all inboxes to Smartlead** — you'll rotate sends across them
6. **Set up Apollo** — pick filters once: India + Industry: BPO/Outsourcing + Headcount: 20–200 + Title: Founder/CEO/Director-Operations
7. **Save the prompt templates from this doc** in a Claude/ChatGPT project so they're one click away

After the 14-day warmup, you can start sending. Don't skip warmup or your domain reputation tanks for months.

---

## The daily 60-minute routine

Set a calendar block: **10:30am–11:30am, every weekday.** Treat it like an immovable client meeting.

### Block 1 — Source (10 min)

Open Apollo. Apply your saved filter. Pick **20 new contacts** matching the criteria. Export them to a CSV.

Each contact should have: First name, Last name, Title, Company, Company size, LinkedIn URL, Email.

### Block 2 — Personalize (40 min, 2 min per contact)

For each of the 20 contacts:

1. **Click their LinkedIn URL.** Skim their profile in 30 seconds. Pick one specific signal:
   - A campaign they mentioned ("running Airtel collections")
   - A recent post they made
   - A common connection
   - A specific company milestone (recent funding, team growth, new client)
2. **Open the prompt template (saved in Claude/ChatGPT).** Paste the contact info + the signal. Get a personalized email draft.
3. **Read the draft. Edit one sentence so it doesn't sound AI-written.** This is the only step you can't skip — the editing is what makes the email feel handwritten.
4. **Paste into Smartlead** as part of your daily campaign.

### Block 3 — Reply triage (10 min)

Open Smartlead's reply inbox. Reply to anything that came in overnight:

- **Positive ("interested" / "tell me more")** → reply with a Calendly link, that's it. Don't pitch in email.
- **"What does this do?"** → 2-sentence summary + a 30-second Loom video link. Don't send a deck.
- **"Not now / wrong person"** → ask "Who at your company would be right?" ONE follow-up question, no more.
- **Unsubscribe / hostile** → mark as such in your sheet, never email again.

10 minutes total. If a reply needs more thought, queue it for an end-of-day batch instead of breaking the routine.

---

## The cold email prompt template

Save this in your AI tool of choice as a reusable prompt.

````
You are writing a cold outbound email to a small-BPO decision-maker for QAScope, an AI QA tool that scores every customer service conversation against a customizable rubric.

CONTACT:
- First name: [first_name]
- Last name: [last_name]
- Title: [title]
- Company: [company]
- Company size: [headcount]
- Specific signal you noticed: [signal — paste 1-2 lines from their LinkedIn]

PRODUCT (one paragraph, do NOT paraphrase, just understand):
QAScope lets a BPO upload conversations as a CSV and get every one scored against their rubric (compliance + quality), with a coaching note per agent and a manager dashboard. Free Pilot tier (500 conversations/month, 1 seat). Starter at ₹6,999/month is unlimited conversations + BYO LLM key. Built by an ex-BPO operator (me). India-focused.

EMAIL CONSTRAINTS:
- Maximum 4 sentences
- First sentence MUST mention the specific signal (not a generic compliment)
- Second sentence: connect that signal to a QA pain (one of: 5% sampling problem, agent coaching cycle time, compliance leak risk, multiple-campaign-different-rubrics)
- Third sentence: one specific outcome QAScope drives, with a number (e.g. "from 5% to 100% conversation coverage")
- Fourth sentence: ask for 15 minutes, not a "discovery call" or "demo"
- Sign-off: "Bonison" only — no title, no phone, no LinkedIn link
- Subject line: should reference the company and feel personal, NOT salesy. Maximum 6 words.

DO NOT:
- Use the words "synergize", "unlock", "leverage", "transform", "revolutionize"
- Mention AI in the first sentence
- Talk about features
- Use bullet points
- Sound like ChatGPT wrote this

OUTPUT FORMAT:
Subject: [subject line]

[email body]

Bonison
````

After you paste this and run it, **rewrite one sentence by hand.** The AI personalization gets you 80% of the way; your edit is the 20% that makes it feel human.

---

## Example output (using the prompt above)

**Input contact:**
- First name: Rahul
- Title: Director of Operations
- Company: ConnectCall (a 60-agent BPO running Airtel and Bajaj support)
- Signal: posted last week about how their compliance team flagged 12 violations from a sample of 200 calls

**Output:**

> Subject: ConnectCall's compliance flag rate
>
> Saw your post about 12 compliance flags in 200 calls — that's a 6% flag rate from your sample, which means the actual rate across all calls is anyone's guess. We score every conversation against your compliance rubric, not just the 5% your QA team has time for. One pilot customer cut compliance escapes by 73% in 30 days, just by reviewing the previously-unsampled 95%. Open to 15 minutes next week to walk through what it'd look like on ConnectCall data?
>
> Bonison

Reply rate target: **5–8%** with this level of personalization. Below 3% means your filter is wrong; above 10% means you're being overly enthusiastic and may not be hitting cold prospects.

---

## The 4-step email sequence (configured in Smartlead)

Day 1 — your personalized email (above)
Day 4 — short bump: *"Did this land in the right inbox?"* + 1-line reminder of the value
Day 9 — value-add: share one relevant link (a public case study, a piece of writing, a stat) — no ask
Day 16 — break-up email: *"I won't keep emailing — should I close the loop on this?"*

After day 16, **stop**. Don't run a 12-step sequence. Diminishing returns + you risk being marked spam.

---

## LinkedIn post prompt template

Save this for your weekly LinkedIn cadence (2 posts/week).

````
You are writing a LinkedIn post for an ex-BPO operations person, founder of QAScope (an AI QA tool for SMB BPOs).

POST TYPE: [pick one]
- Operator story (real moment from past BPO career, 3-paragraph format)
- Industry observation (specific take on a BPO problem most people ignore)
- Build-in-public (something you shipped this week, why it matters)
- Customer story (anonymized; outcome with numbers)

CONSTRAINTS:
- 150–250 words total
- First sentence MUST be a hook — a question, a counterintuitive statement, or a number that grabs attention
- Use short sentences. Most paragraphs 1–2 lines.
- No emojis except in the very first line if it adds, or at the end as a call-to-action
- No corporate words (synergize, leverage, etc.)
- End with a question to the reader

DO NOT:
- Self-promote in the first 80% of the post — earn the right to the CTA
- Quote yourself
- Use "Last week I..." (overused)
- Use line breaks every line (the "broetry" style — annoying)

INPUT:
[Paste the rough idea or a 2-line draft you want polished]

OUTPUT:
Just the post. Nothing else.
````

Run it twice a week. Keep the posts that resonate (high comment rate); kill what doesn't. After 4 weeks you'll know your voice.

---

## Monthly budget / metrics

| Item | Cost |
|---|---|
| Apollo (5K credits/mo) | ₹2,000 |
| Smartlead 1 inbox + warmup | ₹3,000 |
| Claude Pro / ChatGPT Plus | ₹1,800 |
| 2 domains (annual / 12) | ₹100 |
| Google Workspace (1 user) | ₹150 |
| **Total** | **~₹7,000/mo** |

Returns to track:

| Metric | Target by month 3 |
|---|---|
| Daily emails sent | 10 |
| Reply rate | 5–8% |
| Discovery calls booked / week | 2–3 |
| Discovery → pilot conversion | 30% |
| Pilot → paid conversion | 40% |
| Paid customers / month | 1–2 |

**Rough math:** 10 emails/day × 22 days × 6% reply × 30% to pilot × 40% to paid = ~1.6 customers/month from cold alone, before warm intros. That's ₹15-25K MRR added per month from this channel after 3 months.

---

## Common failure modes and what they really mean

| Symptom | Real cause | Fix |
|---|---|---|
| 0% reply rate | Subject lines or first sentence sound salesy | Rewrite the first sentence by hand for next 20 contacts |
| 1–2% reply rate | Personalization too generic | Spend 3 min/contact instead of 1 |
| 8%+ reply rate but no calls booked | Replies are positive but you're slow to follow up | Set a 2-hour SLA for first reply |
| Domain reputation tanking | Sending too many emails too fast | Cut volume to 5/day for 2 weeks; let warmup catch up |
| Tons of bounces | Apollo data quality bad on this segment | Verify with Hunter.io before sending |
| Replies but all "wrong person" | Title filter wrong | Try Director of Quality / Process Excellence Lead instead of Founder |

---

## Why I'm telling you NOT to build a custom agent

Three reasons. Read each one before you start coding:

**1. The bottleneck isn't volume — it's personalization quality.** A custom agent that sends 100/day at 0.5% reply is worse than 10/day at 6%. The math: 100 × 0.005 = 0.5 replies vs. 10 × 0.06 = 0.6 replies, but the second batch is 1/10th the volume so far less domain risk.

**2. Every hour spent building tooling is an hour not spent on the actual outbound.** If you spend 80 hours building an agent and 0 hours emailing, you have 0 customers. If you spend 80 hours emailing and 0 hours building, you have ~3 customers. The math always favors doing the work.

**3. The tools above already work.** Smartlead, Apollo, Claude — these are mature products built by teams of 10+ people. You won't beat them in a weekend. Your competitive edge is your operator background, not your engineering of an outbound system.

**The exception:** if your outbound becomes the actual business (you start an outbound-as-a-service for other startups), then yes, build the tooling. Until then, use what's there and pour the time into what only you can do — talking to BPO operators.
