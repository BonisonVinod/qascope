# QAScope strategic docs

Three documents organize what comes after the MVP.

| File | What it covers | When to read |
|---|---|---|
| [`ROADMAP.md`](./ROADMAP.md) | Engineering work streams (V2 / V3 themes), deliverables in dependency order, infrastructure debt | When planning a week of building |
| [`SALES.md`](./SALES.md) | ICP, sales motion, pricing experiments, discovery script, common objections, pipeline tracking | Before every sales call; weekly pipeline review |
| [`MARKETING.md`](./MARKETING.md) | Channels, brand positioning, content backlog, lead magnets, weekly metrics | Once a week to check what to ship next |

The product-level docs live one level up:

- [`../README.md`](../README.md) — repo-level setup + features
- [`../DEPLOY.md`](../DEPLOY.md) — production deploy walkthrough (Vercel + Supabase)
- [`../SHIP.md`](../SHIP.md) — beginner-friendly first-deploy guide
- [`../PITCH.md`](../PITCH.md) — the friend-facing summary you paste into WhatsApp

## How these docs interact

```
   ┌────────────────────┐
   │   MARKETING.md     │  fuels  ──▶
   │ generates intros   │              ┌───────────────┐
   └────────────────────┘              │   SALES.md    │   converts to
                                       │  closes deals │   ──▶ revenue
                                       └───────────────┘
                                                ▲
                                                │ feedback / objections
                                                │
                                       ┌────────┴───────┐
                                       │  ROADMAP.md    │
                                       │  ships features│
                                       └────────────────┘
```

Marketing manufactures intros. Sales converts intros to revenue. Sales feedback (objections, lost reasons, customer requests) flows back into ROADMAP and shifts what gets built next.

## Cadence

- **Daily:** Update sales pipeline spreadsheet. One LinkedIn comment-engagement session.
- **Weekly:** 15-min review of `SALES.md` metrics + `MARKETING.md` metrics. One LinkedIn post. Pick next ROADMAP deliverable.
- **Monthly:** Re-read all three docs. Edit the parts that have changed. Cross out what's done.

## What's NOT in these docs (intentionally)

- **Hiring plan** — you're solo. Add this doc when you start considering your first hire.
- **Fundraising deck** — premature until you have a customer story to anchor it.
- **Operations / accounting / legal** — outsource (CA + CS for ~₹15k/month total). Not the founder's job at this stage.
- **Customer success playbook** — you ARE customer success right now. Add when you have 10+ customers.
