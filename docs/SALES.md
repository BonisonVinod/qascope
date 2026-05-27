# Sales Playbook

How to turn pilot conversations into paying customers. Written for the stage QAScope is at: ~3 friend pilots, no paying customers yet, no sales team.

> The goal of this stage isn't volume — it's learning who QAScope is *actually* for, what they'll pay, and how the sales conversation flows. Every pilot is a research project.

---

## Ideal Customer Profile (ICP) — two playbooks side by side

QAScope can be sold into two completely different segments, and the playbooks are almost nothing alike. **Pick the one that matches your network.**

### Playbook A — Standalone SMB BPO (the textbook ICP)

**Who:** the founder or owner-operator of a 20–200 agent BPO.

- Indian SMB BPO, 20–200 agents, 1–5 active campaigns
- Domestic BFSI / telecom / e-commerce / D2C support work
- Already has a QA function (1+ dedicated QA managers)
- Owner-operator or single-decision-maker
- Annual revenue ₹2–20 crore — big enough to afford a tool, small enough to decide fast

**Buyer:** the person who signs the QAScope invoice owns the company, the P&L, and the QA budget. One conversation, one decision. Sales cycle ~4 weeks.

**Where to find them:**

- **Founder communities** — Headstart, TiE, HysterX, regional BPO operator WhatsApp groups
- **Cold outbound** — Apollo / Lusha lookups for "BPO" + "Founder/CEO" titles at 20–200-employee companies
- **Boutique consultancy referrals** — call-center setup consultants, telecom resellers, CRM resellers — they all know the small operators and earn intro fees

**Caveat:** if your warm network is in big BPOs (most ex-BPO operators), you don't have intros into this segment. Cold outbound or community-led entry are the only paths. **Plan for a 6–8-week ramp before pipeline builds.**

### Playbook B — Enterprise BPO LOB head (the network-arbitrage move)

**Who:** the operations manager / AVP / VP running a single client account inside a large BPO (Genpact, WNS, Concentrix, Tech Mahindra, Teleperformance, EXL, etc.). They run 30–500 agents on one campaign.

**Reality check:** this person **cannot buy enterprise software** for the corporate org. Tool decisions like that go through corporate IT / vendor management / procurement and take 6–12 months. **But they often have discretionary budget under ₹50,000/month** for "innovation," training, or vendor experiments — and that's where QAScope fits as a "shadow IT" tool they personally subscribe to.

This is a **different sales motion** from Playbook A. Don't conflate them.

**Buyer titles to target:**

- Operations Manager / Senior OM running a specific account
- AVP / VP — [Client Name] Account
- Head of QA — [Account/Vertical]
- Process Excellence Lead
- Transition Manager (they pilot new tools as part of new-account ramp)

**The qualifying question:** *"Does your campaign have its own QA team and rubric, or do you use a corporate one?"*

- "Our own" = perfect Playbook B target, they have autonomy
- "Corporate" = wrong target; you're now selling to corporate (Playbook C, which you can't run yet)

**Pricing reality:** Starter (₹6,999/mo) or Team (₹14,999/mo) maximum. Above ₹50K/month it triggers procurement and the tool gets killed.

**Sales cycle:** 2–4 weeks. Often faster than Playbook A because the buyer trusts your warm intro and has a quarterly OKR to "improve QA."

**The hidden risk:** corporate IT can ban the tool 3–9 months later when they discover it. You churn that customer. Plan for **30–40% annual churn** in Playbook B until you build the corporate motion.

**Where to find them:** **your own network.** Ex-colleagues from big BPOs are 90% of this segment. LinkedIn search past employers + current LOB-head titles.

### Playbook C — Enterprise corporate buyer (don't try yet)

**Who:** Director/VP of Quality, Head of Process Excellence, Chief Operations Officer, IT / Procurement at large BPOs.

**Why you're not ready:**

- 6–12 month sales cycle minimum
- Requires SSO, SOC 2 certification (~₹5L + 6 months), audit logs, on-prem/VPC deployment option, security questionnaires
- Procurement processes designed to favor incumbents (Observe.AI, Level AI, NICE, Verint, CallMiner)
- Pricing in ₹5–50L/year range, but you spend ₹3–10L getting the contract signed
- Dedicated enterprise sales rep + sales engineer required
- Without ₹2–5 crore of funding behind you, you can't credibly close one of these

**When you're ready (later):** revisit after you have 5+ Playbook A or B customers, ~₹2L MRR, and either funding or a co-founder with enterprise SaaS sales experience.

### Reverse-engineer the ICP from your pilots

After each call, write down 2 attributes that match the playbook you're running, and 2 that don't. After 5 calls per playbook, the pattern crystallizes. Don't run more than 2 playbooks in parallel; you'll learn nothing from any of them.

### "Which playbook do I run if I only know enterprise people?"

Run **B + cold outbound A**, in parallel.

- **B for revenue this quarter** — your network closes shadow-IT deals fast.
- **A via cold outbound for sustainable revenue next quarter** — start now even though it won't pay back for 6–8 weeks.
- **B-customer LOB heads also unlock learning for C** — every conversation teaches you what enterprise QA tools must do, even if you can't sell at corporate level yet.

Track conversion rates separately for each motion. Don't pretend they're the same.

---

## The sales motion (varies by playbook)

### Motion for Playbook A (SMB BPO founder)

Founder-led, warm intro or cold outbound, free pilot, paid conversion after 4 weeks.

```
Week 0: Warm intro (LinkedIn / WhatsApp from a mutual contact) OR cold email
Week 1: 30-min discovery call (you do most of the listening)
Week 1: Send PITCH.md + Vercel URL with their workspace pre-set up
Week 2: 30-min pilot kickoff (sit beside them while they upload first CSV)
Week 3: Async — ask "what surprised you?"
Week 4: Closing call. Either they pay for Starter/Team or you part on good terms with feedback.
```

### Motion for Playbook B (enterprise LOB head — shadow IT)

Faster, warmer, riskier. Discretionary-budget signup with no procurement involvement.

```
Week 0: Warm intro from your ex-BPO network ("you should talk to [X]")
Week 1: 30-min "I just want to learn about your QA setup" call.
        Important framing: research-first, not sales-first. They open up.
Week 1 (later): "Here's the tool I've been building — want to play with it on
        your own, no corporate involvement?"
Week 2: They upload a small batch (50 redacted conversations).
        Score it. Show them on a screenshare.
Week 3: They subscribe to Starter (₹6,999) on personal credit card or simple
        invoice. No procurement.
Week 6+: If it sticks, ask: "Who at corporate should know about this?" That
        introduces you to Playbook C — but as someone with an internal champion.
```

**Critical:** in Playbook B, don't pitch to corporate before you have an LOB-head champion who's used the tool for 4+ weeks. Cold-pitching corporate IT goes nowhere.

### What's the same in both motions

**The whole pitch is the demo.** Don't write a deck. Don't send a brochure. Open a screen-share, log them in, score 5 of their conversations live. Their reaction is the entire conversation.

The two motions only diverge on (a) where the warm intro comes from, (b) how big the deal is, and (c) what you do AFTER the close (push toward corporate vs. expand to peers).

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

**"I'd love to use this but I can't buy software — that goes through corporate procurement"** (Playbook B)

> "Totally understand. Let me ask — do you have any discretionary budget for tools or training under, say, ₹50K/month? A lot of LOB heads do. ₹6,999/month is well below most discretionary thresholds, doesn't show up on the corporate IT radar, and gives you 4 weeks of data to take to corporate when you eventually want to expand. We can also do an annual invoice if that's easier for your finance team."

> If they say no even at that level, they genuinely have zero autonomy — switch motion: "Then can you intro me to whoever owns the corporate QA tooling decision? I'd rather talk to them directly than waste your time."

**"My company's IT will never approve another vendor"** (Playbook B)

> "Got it. So instead of fighting that, want to use it personally for 30 days? Generate the data showing it works on your campaign. Then either (a) you have an internal case to take to IT, or (b) we both learn it doesn't work for you and you've lost nothing. It's a personal subscription, not a corporate one — IT's fine with that until it gets to the corporate procurement stage."

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

Track these per playbook so you can see which motion is working.

### If running Playbook A (SMB founder, mostly cold outbound)

- 200 cold outbound emails sent total (10/day × 5 days × 4 weeks)
- 8–12 discovery calls booked (4–6% reply rate is healthy)
- 2 active pilots
- 0–1 paying customers — be patient; SMB cold cycles are slow

### If running Playbook B (enterprise LOB head, warm intros)

- 8–10 discovery calls completed via warm intro
- 4–6 pilots active simultaneously
- 2–3 paying customers at Starter or Team tier (₹15–45K MRR)
- 1 introduction made to a corporate-level contact (the "expand" motion seedling)

### If running both A and B in parallel

- 2–3 paid Playbook B customers + 0–1 paid Playbook A customers = ~₹25–50K MRR
- 5+ closed-lost deals with documented reasons (huge value — helps refine ICP)
- 1 unprompted referral (signals real value)

### Red flags after 8 weeks

If you have **zero paying customers across both playbooks**, the problem is one of:

1. **ICP wrong for your network** — Playbook A may need a different network than yours
2. **Pricing wrong** — try lower (₹4,999 first month) or higher (annual prepay)
3. **Product missing something obvious** — every closed-lost call should reveal it
4. **You aren't asking for the close** — common founder failure; the "soft sell" doesn't work in BPO

**One specific Playbook B red flag:** if every LOB head you talk to says "I love this but I can't buy it," you're hitting the discretionary-budget ceiling — try the personal-credit-card framing aggressively, or accept that Playbook B is a research motion only and double down on cold outbound A.

---

## What you should NOT do at this stage

- **Don't hire a salesperson.** Founder-led until you have 10 paying customers. You learn nothing from a salesperson's pipeline; you learn everything from your own calls.
- **Don't build a website beyond a simple landing page.** Your only sales channel right now is warm intros. A polished site is theater.
- **Don't go on Twitter/LinkedIn evangelizing AI in BPOs.** Selling on social media at this stage looks like noise. Talk to specific people.
- **Don't give away forever.** "Free during beta" works. "Free forever" attracts the wrong customers.
- **Don't promise integrations, custom features, or guarantees you can't immediately deliver.** Every "yes I can do that" creates a 2-week distraction.
- **Don't get into procurement / RFP / legal review processes.** Walk away politely. Those are 6-month deals you can't close as a 1-person team.

Cap each pilot conversation at 4 weeks. If they haven't decided in 4 weeks, they aren't going to.
