# QAScope manual test plan

A step-by-step runbook to walk every screen and feature before pilot. Estimated time end-to-end: ~45 minutes (most of that is waiting for the 100-conversation batch to score).

## 0. Prerequisites

- [ ] `qascope/.env.local` has `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `OPENAI_API_KEY` set
- [ ] Supabase project has had `supabase/schema.sql` run at least once (creates tables, enums, RLS policies, the `sweep_review_sla` function, and seeds the default rubric)
- [ ] Supabase project has had `supabase/002_two_tier_review.sql` applied to existing data (idempotent — safe to re-run)
- [ ] App is running: `cd qascope && npm run dev` → http://localhost:3000

## 1. Authentication & onboarding

| # | Step | Expected |
|---|------|----------|
| 1.1 | Visit `/` | Redirects to `/login` |
| 1.2 | Click "Sign up", create an admin: name "Test Admin", workspace name "Acme BPO", agree, submit | Redirects to `/dashboard`, top-right shows your name |
| 1.3 | Open a private window, sign up again as "QA Manager" with the SAME workspace name | Joins same workspace, lands on `/dashboard` |
| 1.4 | Sign out from the private window. Confirm `/dashboard` redirects to `/login` | Auth gate works |

> If multi-workspace join doesn't work, that's a known onboarding gap — for the pilot, manually update `users.client_id` and `users.role` in Supabase for the second user.

## 2. Rubric

| # | Step | Expected |
|---|------|----------|
| 2.1 | As admin, visit `/rubrics` | 7 default criteria visible, total weight = 100 |
| 2.2 | Change "Resolution Accuracy" weight from current to a higher number (e.g. +5) and another criterion's down by 5 | Total stays at 100 (green) |
| 2.3 | Try to break it — set total to 95 | Total goes red, **Save** button disabled |
| 2.4 | Restore to 100 and click Save | Toast "Rubric saved." Header "version" increments by 1 |
| 2.5 | As QA manager (no admin role), visit `/rubrics` | Read-only table, no inputs, "Only admins and QA managers can edit" notice |

## 3. Settings — review workflow

| # | Step | Expected |
|---|------|----------|
| 3.1 | As admin, `/settings` shows Account + Review workflow sections | Two sections visible |
| 3.2 | In Review workflow, pick the QA Manager user as second reviewer; SLA = 24h; Save | "Review settings saved." |
| 3.3 | Try SLA = 0 → Save | Error: must be 1..168 |
| 3.4 | Try SLA = 200 → Save | Same error |
| 3.5 | As QA manager, `/settings` | Read-only view, picker disabled |

## 4. Upload (small smoke test first)

| # | Step | Expected |
|---|------|----------|
| 4.1 | Visit `/upload`, upload `test-data/smoke-test.csv` (10 rows) | Success: "10 ingested, 0 failed, 0 duplicates" |
| 4.2 | Re-upload the same file | Success: "0 ingested, 0 failed, 10 duplicates" |
| 4.3 | Try uploading a CSV missing the `transcript_text` column (edit a copy in a text editor) | Each row reports a Zod error |
| 4.4 | Visit `/results` | Empty state: "No scores yet" + "Score pending" button shows count |

## 5. Scoring

| # | Step | Expected |
|---|------|----------|
| 5.1 | On `/results`, click **Score pending** | Spinner; eventually success toast |
| 5.2 | Refresh `/results` | 10 rows; mix of statuses |
| 5.3 | Click any row | Detail page with criterion breakdown, coaching note, and the full transcript |
| 5.4 | Find a "COMP" row (compliance violation) — its status should be Compliance fail | Red badge; should appear in `/review-queue` |

## 6. Two-tier review queue (the headline workflow)

| # | Step | Expected |
|---|------|----------|
| 6.1 | Visit `/review-queue` | "Pending first review" section shows the COMP rows + any low-confidence rows. Each row shows an SLA countdown |
| 6.2 | On a COMP row, click **Agree** | Row disappears from Pending first review; appears in Resolved as "Agreed" |
| 6.3 | On another COMP row, click **Disagree**, leave a note like "Customer consented to PII share" | Moves to "Pending second review" with first reviewer's note quoted under it |
| 6.4 | Sign in as the QA Manager (second reviewer) in another browser/private window | "Pending second review" now shows actionable buttons |
| 6.5 | Click **Confirm override** with note "OK in this context" | Moves to Resolved as "Override confirmed". Score's status flips to Final + appealed_at stamped |
| 6.6 | Visit the result detail for that conversation | The row in `/results` now shows status Final |
| 6.7 | Sign back in as admin. On a fresh row, click Disagree, then in QA-Manager window click **Deny override** | Row resolves as "Override denied"; original score status remains unchanged |
| 6.8 | As a non-second-reviewer admin viewing a Pending second review row | Buttons greyed out, "view-only — assigned to client's second reviewer" banner |

### 6.9 SLA expiry test (advanced — optional)

This requires manipulating the DB clock. In Supabase SQL Editor:

```sql
-- Make a pending_first row look 25h old
update review_queue
   set sla_deadline = now() - interval '1 hour'
 where state = 'pending_first'
 limit 1;
```

Then refresh `/review-queue`. The page calls `sweep_review_sla()` on read; that row should disappear from "Pending first review" and reappear in Resolved as "Auto-approved (SLA)".

## 7. Full batch

| # | Step | Expected |
|---|------|----------|
| 7.1 | Upload `test-data/sample-conversations.csv` (100 rows) | "100 ingested, 0 failed, 0 duplicates" |
| 7.2 | Click Score pending. Wait ~3-5 minutes (parallelised across criteria) | Progress visible; eventually all scored |
| 7.3 | `/results` | 100+ rows now |
| 7.4 | `/review-queue` | Several rows in Pending first review (most COMP rows + some low-confidence ones) |

## 8. Dashboard

| # | Step | Expected |
|---|------|----------|
| 8.1 | `/dashboard` | 4 KPI cards populated; 30-day window |
| 8.2 | "Compliance fails" should be > 0 (the planted compliance-violation rows) | Red KPI |
| 8.3 | Top performers and Needs coaching panels populated (agents with ≥3 scored) | Both panels show 5 rows each |
| 8.4 | Status mix bar shows green / amber / red proportions | Visual sanity check |
| 8.5 | Click "Pending first review" card | Navigates to `/review-queue` |

## 9. Weekly report

| # | Step | Expected |
|---|------|----------|
| 9.1 | `/reports` (current week) | Shows the week containing today's date with all 100 conversations |
| 9.2 | Per-channel breakdown shows AI baseline vs Final + delta | Delta column populated |
| 9.3 | Per-agent breakdown shows compliance fails and appealed counts | Appealed column should reflect any overrides confirmed in step 6.5 |
| 9.4 | Click **Print / save PDF** | Browser print dialog opens with a clean print layout |
| 9.5 | Click **← Previous** | Loads previous week. Should be empty (no data) |
| 9.6 | Manually visit `/reports?week=2026-04-15` | Loads the week containing Apr 15 |
| 9.7 | Visit `/reports?week=garbage` | Friendly "Invalid week param" error |

## 10. Billing & plan limits

| # | Step | Expected |
|---|------|----------|
| 10.1 | `/billing` | Current plan = Pilot (default), usage shows ~100 / 500 conversations |
| 10.2 | Click **Switch to Growth** | Confirm dialog → success toast → current plan changes |
| 10.3 | Usage card now shows /5,000 | Limit updated |
| 10.4 | History table shows the new subscription row | Audit trail works |
| 10.5 | As QA manager (non-admin), `/billing` | Plan cards show "Admin only" disabled buttons |

### 10.6 Limit guard (optional, destructive)

Temporarily set Pilot's `monthly_limit` to a small number to verify upload blocking:

```sql
update subscriptions
   set monthly_limit = 50
 where client_id = (select client_id from users where email = '<your admin email>')
   and status in ('active', 'trialing')
order by created_at desc
limit 1;
```

Then try to upload again — should error: "You've used 100 of 50 conversations this month. Upgrade your plan in Billing to continue." Reset by switching plan again.

## 11. Cleanup checklist before pilot

- [ ] Set the Compliance criterion's `critical_fail_boolean = true` if you want compliance fails to gate review (already true by default)
- [ ] Switch off all test data: `delete from conversations where external_conversation_id like 'TEST-%'` (cascades to scores and review queue rows)
- [ ] Pick a real second reviewer in `/settings`
- [ ] Pick the right plan in `/billing`
- [ ] Sign up the actual pilot client's admin user; share login

## Bug reporting template

When something breaks, capture:

1. URL you were on
2. The exact action you took
3. What you expected
4. What actually happened (screenshot if visual)
5. The browser console output (F12 → Console tab)
6. The Supabase logs from the relevant time window (Dashboard → Logs → API logs)

