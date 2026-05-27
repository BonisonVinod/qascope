# Hiring-Triggered Outbound

A specialized outbound playbook for one trigger only: **company just posted a QA job**.

This is a high-conviction, narrow segment — but conversion will be 3–5× higher than generic cold outreach because the company has already acknowledged the problem and allocated budget.

---

## The signal

Someone posted "Quality Analyst", "QA Manager", "QA Specialist", "Process Excellence", or "Compliance Auditor" at a 20–500-agent BPO **within the last 14 days**. After 14 days, the role may have been filled or the urgency cooled.

**Sources, in priority order:**

1. **Naukri.com** — `https://www.naukri.com/quality-analyst-bpo-jobs` filtered by date
2. **LinkedIn Sales Navigator** — filter "Posted a job" + "Industry: Outsourcing/Offshoring"
3. **Foundit (Monster India)** — search "QA" in customer-service category
4. **Indeed India** — has an official Job Search API
5. **AmbitionBox** — useful for company info enrichment, not posting discovery

**Don't scrape LinkedIn Jobs directly.** Use Sales Navigator's official filters or pay for Coresignal/Apify if you need API access at scale.

---

## The email template

Use this prompt with Claude or ChatGPT:

````
You are writing a cold email to a BPO Operations or HR head whose company just posted a Quality Analyst job. The email pitches QAScope (an AI QA tool) as a complement to — or alternative to — the QA hire.

CONTACT:
- First name: [first_name]
- Title: [title]
- Company: [company]
- Company size: [headcount]
- Job posted: [job title from posting]
- Specific signal from the posting: [one detail — e.g. "you mentioned scoring 100+ calls daily" or "the role requires Banking-domain compliance experience"]

PRODUCT (do NOT paraphrase, just understand):
QAScope is an AI QA tool. Upload conversation CSVs, get every conversation scored against your rubric, with coaching notes per agent and a manager dashboard. Free Pilot tier (500 conversations/month, 1 seat). Starter at ₹6,999/month is unlimited conversations + BYO LLM key. Built by an ex-BPO operator.

EMAIL CONSTRAINTS:
- Maximum 5 sentences (one extra than generic outbound — the trigger justifies more context)
- First sentence MUST reference the specific job posting (proves you're not mass-sending)
- Second sentence: a respectful framing — NOT "don't hire" but "while you hire" or "alongside the hire"
- Third sentence: concrete benefit with a number (e.g. "100% conversation coverage in week 1, vs. ~5% with one human reviewer")
- Fourth sentence: ask for an "interview" of the tool — same time commitment as a candidate screening (15–30 min)
- Fifth sentence (optional): mention attached one-pager
- Subject line: 5 words max, references their job post or company
- Sign-off: "Bonison" only

CRITICAL TONE NOTES:
- DO NOT come across as dismissive of the QA hire. The hiring manager spent time writing that JD; respect that.
- DO frame as "this complements your QA team" or "this gives the new hire 10× leverage on day one"
- DO NOT use "AI" in the first sentence
- DO NOT pitch features

OUTPUT FORMAT:
Subject: [subject line]

[email body]

Bonison
P.S. Attached a one-pager covering features and pricing if helpful.
````

### Example output

**Input:**
- Company: ConnectCall (60 agents, hiring "QA Analyst — Banking Process")
- Hiring manager: Rahul Mehta, Director Operations
- Signal: JD mentions "score minimum 100 conversations per week per agent" and "ensure compliance with RBI guidelines"

**Output:**

> Subject: ConnectCall QA Analyst role
>
> Saw the QA Analyst posting for your banking process — the 100-conversations-per-agent-per-week target is what made me write. Most BPOs I've worked with hit that target by sampling, which means 90%+ of conversations don't get reviewed at all. QAScope scores every conversation against your rubric (including custom RBI compliance rules), so the QA you hire can spend their time coaching agents instead of clicking through audits. Worth a 20-minute interview of the tool, the same way you'd screen a candidate?
>
> Bonison
> P.S. Attached a one-pager covering features and pricing if helpful.

---

## Sequencing (in Smartlead)

Day 1 — the email above
Day 4 — bump: *"Did this reach the right person, or should I find someone else on your team?"*
Day 9 — value-add: send a Loom video showing how a similar BPO uses QAScope; no ask
Day 16 — break-up: *"I'll stop pinging — should I close the loop on this?"*

---

## Daily routine (modified for hiring-triggered)

Same 60-minute block as the general outbound playbook, but the source step is different:

### Block 1 — Source (15 min, Mondays only — others batch on Friday for the week)

Open Naukri + LinkedIn Sales Navigator. Pull every QA-related role posted in the last 7 days at India BPOs with 20–500 employees. You'll typically find **15–40 fresh postings per week** in this segment.

Save into your spreadsheet with columns:
| Company | Posted date | Job title | Job URL | Hiring manager (LinkedIn) | Email | Status |

### Block 2 — Enrich (10 min/day)

For each company that doesn't already have a hiring manager + email, look them up in Apollo. Aim for the actual job-poster (visible on LinkedIn) when possible — they reply 2× more than a generic "Director Operations" contact.

### Block 3 — Personalize + send (20 min/day, ~10 emails)

Use the prompt template above. Every email needs to reference a specific detail from the JD.

### Block 4 — Reply triage (10 min/day)

Same as the generic outbound playbook. Positive replies → Calendly link. "Wrong person" → ask for an intro within the same company. Hostile → never email again.

---

## Realistic targets

Hiring-triggered cold outbound, after 4 weeks of consistent work:

| Metric | Generic cold | Hiring-triggered |
|---|---|---|
| Daily emails sent | 10 | 5–10 (smaller pool) |
| Reply rate | 5–8% | 12–20% |
| Discovery → pilot | 30% | 50%+ |
| Pilot → paid | 40% | 50%+ |
| Effective conversion | ~1.5/month | 3–5/month |

The math: at 8 emails/day × 22 days × 15% reply × 50% to pilot × 50% to paid = ~6 paying customers per month. **Roughly 4× the generic cold motion** for the same email volume.

The catch: you can't scale beyond ~150 emails/month in this segment because there aren't that many fresh job posts at qualifying companies in India per month. So treat this as **one of two motions running in parallel** — hiring-triggered for highest conversion, generic for volume.

---

## When to automate (and how)

**Don't automate before you've sent 30 manual emails using this approach** and confirmed reply rate > 12%. Below that, automation just sends bad emails faster.

When you do automate:

**Tool:** [n8n](https://n8n.io) — free, self-hosted on a ₹400/month VPS

**Pipeline (visual workflow):**

1. **Trigger:** Daily 9am cron
2. **Step 1:** HTTP request to Naukri job listings (or Indeed API)
3. **Step 2:** Filter results — last 7 days, India, BPO/ITES, 20–500 employees, contains keywords ["QA", "Quality", "Compliance", "Audit"]
4. **Step 3:** Apollo API lookup for each company → returns hiring manager + email
5. **Step 4:** Hunter.io email verification (skip invalid)
6. **Step 5:** Claude API call with the email prompt above + the JD content → returns personalized email
7. **Step 6:** Append to a Smartlead campaign for sequenced sending
8. **Step 7:** Webhook back to your Sheets to log

Build cost: 10–15 hours of focused work in n8n, mostly schema mapping between APIs. Maintenance: ~30 min/week to fix scraper breakages when source sites tweak their HTML.

**The big trade-off:** automating loses some personalization quality. Even with Claude doing the writing, fully-automated emails reply ~30% lower than hand-personalized ones. That's still excellent in this segment because the trigger is so strong, but expect 9–12% reply rates on automated, vs. 12–20% on manual.

---

## Edge cases

**"What if the hiring manager IS my buyer for QAScope?"**
> They almost always are at small BPOs. Pitch them directly. At larger BPOs the hiring manager may need a corporate sign-off; ask them: *"Who needs to be in the loop for tooling decisions in addition to you?"*

**"What if they've already hired the QA?"**
> "Congrats on the hire — happy to give them a 30-min walkthrough. The tool 10×s a single QA hire's coverage." Doesn't hurt to ask.

**"What if my email looks like every other vendor pitching them?"**
> They get pitched by recruitment-agency emails for the QA role itself, not by tools. You're an outlier. The risk isn't blending in; the risk is sounding like a recruiting agency. Be unambiguous: you're a tool, not a hire.

**"What if the company is too small (<20 agents)?"**
> Skip. They need to feel volume pain before they buy a tool.

**"What if the job is for a Senior QA Manager (not analyst)?"**
> Better target — that person manages a QA function and is more likely the buyer.
