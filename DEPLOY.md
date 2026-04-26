# Deploying QAScope

The fastest path to a live URL you can share is **Vercel + Supabase**, both on free tiers. End-to-end this takes about 30 minutes.

## What you'll need

- A Supabase project (already done if you set up local dev)
- A GitHub repo with this codebase pushed
- A Vercel account (sign in with GitHub)
- Your `OPENAI_API_KEY`
- Optionally: a domain name for a friendlier URL than `qascope.vercel.app`

## Step 1: push the code to GitHub

If it isn't already:

```bash
cd qascope
git init
git add -A
git commit -m "QAScope MVP"
gh repo create qascope --private --source=. --push   # if you have the GitHub CLI
# OR create a repo manually on github.com and:
# git remote add origin git@github.com:your-name/qascope.git
# git branch -M main && git push -u origin main
```

## Step 2: import the repo into Vercel

1. <https://vercel.com/new> → pick the repo
2. Framework preset: **Next.js** (auto-detected)
3. Root directory: leave as-is (the project is at the repo root, or set to `qascope/` if you nested it)
4. Don't deploy yet — set environment variables first

## Step 3: environment variables on Vercel

In **Project Settings → Environment Variables** add:

| Name | Value | Scopes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | from Supabase → Project Settings → API | All |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable key | All |
| `SUPABASE_SERVICE_ROLE_KEY` | secret key (rotated, kept private) | All |
| `OPENAI_API_KEY` | from `platform.openai.com` | All |
| `OPENAI_MODEL` | `gpt-4o-mini` (or another model id) | All — optional |

Click **Save**, then **Deploy**.

## Step 4: confirm migrations are applied to your prod Supabase

If you re-used the same Supabase project for local dev and production, you're done. If you created a fresh prod Supabase project, run all the SQL files in order in the SQL Editor as described in [`README.md`](./README.md#3-apply-database-schemas-in-order).

## Step 5: configure Supabase Auth redirect URLs

In **Supabase Dashboard → Authentication → URL Configuration**:

- Site URL: `https://qascope.vercel.app` (or your custom domain)
- Redirect URLs: add `https://qascope.vercel.app/**` so signup confirmations and password resets land back on your app

## Step 6: smoke test the live URL

1. Open the Vercel URL.
2. Sign up with a fresh email.
3. Upload `test-data/sample-conversations.csv`.
4. Click **Score 25 pending** in `/results`. Wait 60–180 seconds.
5. Check `/dashboard`, `/review-queue`, `/reports`. All three should populate.

If scoring fails silently, your `OPENAI_API_KEY` is wrong or unfunded. Check the Vercel function logs.

## Optional: custom domain

In **Vercel Project Settings → Domains** add a domain you own (e.g. `qascope.app`). Vercel walks you through DNS records. Then update the Supabase Auth redirect URLs to use the custom domain.

## Pre-launch checklist

Before sending invites:

- [ ] All 7 SQL migrations applied to the prod Supabase project (`schema.sql`, `002`, `003`, `004a`, `004`, `005`, `006`)
- [ ] Environment variables set in Vercel (5 of them)
- [ ] Supabase Auth redirect URLs include the prod domain
- [ ] You can sign up, upload, score, and view dashboards on the live URL using a brand-new email
- [ ] OpenAI account has a payment method and a usage cap (settings → limits) — set this so a runaway scorer can't drain your card
- [ ] Pilot plan is enough for your friends' volume; if not, manually flip them to Growth/Pro in `/billing` (Razorpay isn't billing them yet)
- [ ] Mention "private beta" anywhere you share the link — schemas may still change

## Operational watchlist

- **OpenAI usage** — budget cap on `platform.openai.com → Settings → Limits`. ~₹0.05 per scored conversation on `gpt-4o-mini`. 100 conversations × 5 friends × 4 weeks ≈ ₹100 a month before margin.
- **Supabase quota** — free tier is 500 MB DB + 2 GB egress/month. A 100-row CSV is < 1 MB; 5 friends each running 500 conversations/month is comfortably under quota.
- **Vercel quota** — free tier handles a pilot easily, but server-action timeouts on Hobby are 60s. The score-25-batch can take longer; if friends report timeouts, drop the batch size to 10 in `src/app/(dashboard)/results/actions.ts` or upgrade to Pro for 5-min timeouts.

## Region pinning for data residency

If a friend's customer requires India-only data:

- Use a Supabase project in **Asia South (Mumbai)**
- Vercel edge regions are fine; the only thing pinned to a region is the database itself
- Document this for the friend before signup so they can sign their own paperwork

## Rolling back a release

Vercel keeps every deployment. If you push a bug, **Project → Deployments → previous green deploy → Promote to Production** rolls back in <30 seconds. Your data is unaffected because the database is separate.
