# Sales Playbook

How to turn pilot conversations into paying customers. Written for the stage QAScope is at: ~3 friend pilots, no paying customers yet, no sales team.

> The goal of this stage isn't volume — it's learning who QAScope is *actually* for, what they'll pay, and how the sales conversation flows. Every pilot is a research project.

---

## Ideal Customer Profile (ICP) — for now

We don't know yet. The honest truth is the first three pilots are how we *find* the ICP. But here's our starting hypothesis:

**Probably yes:**

- **Indian SMB BPO**, 20–200 agents, 1–5 active campaigns
- Domestic BFSI / telecom / e-commerce / D2C support work (not US/UK, where compliance is heavier and procurement slower)
- Already has a QA function (1+ dedicated QA managers), but is struggling to keep up with volume
- Owner-operator or single-decision-maker (not a 5-person procurement committee)
- Annual revenue ₹2–20 crore — big enough to afford a tool, small enough to decide fast

**Probably no:**

- BPO < 20 agents — they review every call by hand and don't feel the pain
- BPO > 500 agents — they have a custom-built QA tool already and procurement is a 6-month grind
- Captive / in-house team — IT and procurement are different, slower, more political
- Any voice-only BPO whose audio is locked inside an on-prem PBX without an export path

**Reverse-engineer the ICP from your pilots:** after each call, write down 2 attributes of the buyer that match this profile, and 2 that don't. After 5 calls, the pattern crystalizes.

---

## The sales motion

For now, **one motion only:** founder-led, warm intro, free pilot, paid conversion after 4 weeks.

```
Week 0: Warm intro (LinkedIn / WhatsApp from a mutual contact)
Week 1: 30-min discovery call (you do most of the listening)
Week 1: Send PITCH.md + Vercel URL with their workspace pre-set up
Week 2: 30-min pilot kickoff (sit beside them while they upload first CSV)
Week 3: Async — ask "what surprised you?"
Week 4: Closing call. Either they pay for Starter/Team or you part on good terms with feedback.
```

**The whole pitch is the demo.** Don't write a deck. Don't send a brochure. Open a screen-share, log them in, score 5 of their conversations live. Their reaction is the entire conversation.

---

## Pricing & offer

Your current plans (`pilot` / `starter` / `team` / `pro`) are the starting position, not the answer. **Run pricing experiments.**

**Tactics worth trying:**

| Tactic | When | Why |
|---|---|---|
| **₹6,999 → ₹4,999 first month** | First 5 customers | Lowers the "is this real?" friction; you test demand at a known psychological price point |
| **Annual = 2 months free** | After they say yes to monthly | Front-loads cash, signals commitment, common B2B norm |
| **Founding-customer plaque** | First 10 paid customers | Locked-in pricing for life + early access to new features. Costs nothing, creates referrers |
| **"Pay if it works" trial** | Customers who hesitate | If after 30 days you don't think it's worth it, no charge. Low risk, high commitment-after-trial |
| **₹14,999 Team tier with annual ₹1.5L** | Mid-market BPOs | Matches their existing software-budget mental model |
| **Onboarding fee waiver** | Early customers | If you ever charge it later, having early customers exempt is fair |

**Don't discount the platform fee below ₹4,999/month.** Below that, customers don't take it seriously. Indian B2B has a strong "cheap = bad" bias on operational tools.

---

## Discovery call script

30 minutes. You ask, they talk. Don't pitch in this call.

**Opening (2 min):**

> "Thanks for the time. Before I show anything, I want to understand your QA process. Tell me what a typical week looks like for you."

**Diagnosis (15 min):** Listen for these signals. Note quotes verbatim — they become marketing copy.

- "We review 5–10% of calls" → quantify the hidden 90% problem
- "Coaching takes a week" → time-to-feedback pain
- "Our QA team is overloaded" → headcount cost angle
- "Compliance failures slip through" → risk angle (best wedge for selling to ops directors)
- "We don't have data on individual agents" → fairness/promotion angle (good for HR-adjacent roles)
- "Every campaign is different" → multi-rubric value prop

**Quantify pain (5 min):**

- How many conversations per day across all agents?
- How many QA reviewers? What do they cost?
- What % of conversations get reviewed today?
- When you find a compliance fail, what happens?

**Offer (5 min):**

> "Based on what you described, I think QAScope can help with X. Want me to show you on your data? I'll set up a workspace, you upload 50 redacted conversations, and we look at the output together next week. No commitment, no charge."

**Close (3 min):**

> "Quick logistics — what email should I use to set up your workspace? And who else from your team should be in the next call?"

The "who else" question is the qualifying question. Single answer = single decision-maker = fast close. Three names = procurement committee = long close, possibly walk.

---

## Common objections + responses

**"How do I know the AI is right?"**

> "You don't trust it on day 1 — that's the right reaction. Every flagged conversation goes through a two-tier human review before it impacts an agent. Over the first 4 weeks, you build calibration: see where AI agrees with your reviewers and where it doesn't. After 200 reviewed conversations you'll have hard data on agreement rate, and that's when trust gets built — not from us telling you to trust it."

**"What about my data privacy?"**

> "Three layers: (1) Multi-tenant database with row-level security at the Postgres level — no other customer can see your data. (2) BYO LLM key — your transcripts go directly from QAScope to your OpenRouter/OpenAI account. We don't proxy them through anyone else. (3) On request, we delete your workspace permanently — full data wipe, you get a confirmation."

**"What if I want to leave?"**

> "Click Settings → Export and you get a Zip of every CSV row, score, and coaching note as JSON. Delete the workspace, your data is gone. We don't lock you in."

> *Note: Export isn't built yet. Honest answer if asked today is "I'll generate it for you manually within 24 hours."*

**"Why not [competitor]?"**

> "QAScope is built for India SMB BPOs specifically. The big names (Observe.AI, Level AI) start at $5K/month and require IT integration. We're at ₹6,999/month, you can be live in 15 minutes, and you can leave any time. If you're at a 500-agent shop with budget, those tools may fit better."

> Then ask: *"Have you talked to them?"* — if yes, listen carefully to why they didn't sign. That's free intelligence.

**"Can I just hire another QA reviewer?"**

> "Yes, but think about it this way: a QA reviewer at ₹40k/month covers maybe 200 conversations a day max. QAScope at ₹15k/month covers all of them, plus generates a coaching note for every agent every day. The math works in our favor at any volume above 30 conversations daily — and you keep your QA reviewer for the actual high-stakes review work, where humans are still better."

**"Let me think about it / send me a proposal"**

> Decoder: they're not the decision-maker, or they're not convinced. Don't send a proposal — send a 1-paragraph summary email and ask: *"Who else needs to see this for you to decide?"* If they refuse to name someone, this deal is closed-lost.

---

## Pipeline tracking (no CRM needed at this stage)

Keep a single Google Sheet with one row per prospect:

| Column | Notes |
|---|---|
| Name + role + company | Who you're talking to |
| Source | "Bonison's ex-OD" / "OM friend's referral" / etc. |
| First contact date | Sets the clock |
| Stage | Intro / Discovery / Pilot / Closing / Won / Lost |
| Next step | Concrete: "send invite link by Tue" |
| Next step date | If overdue 7+ days, mark Stale |
| Verbatim quote | The thing they said that captures their pain |
| Notes | Free text |

Update after every call. Look at it once a week. **If a row hasn't moved in 14 days, either kill it or reach out.**

---

## What "good" looks like 8 weeks from now

- 3 paying customers at Starter tier (~₹21,000 MRR)
- 1 customer at Team tier (₹14,999 MRR) — proves the upsell motion works
- 5 closed-lost deals with documented reasons (helps refine ICP)
- 1 referral that came in unprompted (proves customers find it valuable)
- 0 customers downgraded to Pilot (or churned) — signals product-market fit fragility if not zero

If after 8 weeks you have **zero paying customers**, the problem is one of:

1. ICP is wrong — you're talking to the wrong segment
2. Pricing is wrong — try lower or higher (both can fix it)
3. Product is missing something — listen to the closed-lost reasons
4. You aren't asking for the close — common founder failure; you're being too "soft sell"

---

## What you should NOT do at this stage

- **Don't hire a salesperson.** Founder-led until you have 10 paying customers. You learn nothing from a salesperson's pipeline; you learn everything from your own calls.
- **Don't build a website beyond a simple landing page.** Your only sales channel right now is warm intros. A polished site is theater.
- **Don't go on Twitter/LinkedIn evangelizing AI in BPOs.** Selling on social media at this stage looks like noise. Talk to specific people.
- **Don't give away forever.** "Free during beta" works. "Free forever" attracts the wrong customers.
- **Don't promise integrations, custom features, or guarantees you can't immediately deliver.** Every "yes I can do that" creates a 2-week distraction.
- **Don't get into procurement / RFP / legal review processes.** Walk away politely. Those are 6-month deals you can't close as a 1-person team.

Cap each pilot conversation at 4 weeks. If they haven't decided in 4 weeks, they aren't going to.
