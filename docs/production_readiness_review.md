# QAScope — Full Production Readiness Audit

> Last audited: 2026-06-06 | Every file in the codebase was read and reviewed.

---

## Quick Summary

| Area | Status | Notes |
|---|---|---|
| Sign Up / Login | ✅ Ready | Supabase Auth, invite flow, middleware |
| Dashboard KPIs | ✅ Ready | Date-range filters, leaderboard, team rollup |
| CSV Upload | ✅ Ready | PapaParse, column mapping, batch dedup |
| Chat / Email Scoring | ✅ Ready | Async batch, cron-triggered |
| Voice Audit | ✅ Ready | Queue + retry + 30-day retention |
| Results / Detail View | ✅ Ready | Audio player, criterion breakdown |
| Review Queue | ✅ Ready | 2-tier appeal, SLA countdown |
| Rubrics | ✅ Ready | Weight validation, fatal rules |
| Knowledge Base | ✅ Ready (fixed) | Role check added |
| Reports | ✅ Ready (fixed) | Truncation warning added |
| Billing | ⚠️ Needs Razorpay IDs | Plans defined, Razorpay plan IDs must be created |
| Settings / Webhooks | ✅ Ready | Inbound + outbound tokens |
| Alerts Engine | ✅ Ready | Push + email + in-app |
| Outbound Webhooks | ✅ Ready (fixed) | 10s timeout added |
| Admin Console | ✅ Ready | Super-admin only |
| Landing Page | ✅ Ready | Pitch deck, privacy, terms |

---

## All Features — Complete Inventory

### 🔐 Authentication & Onboarding

| Feature | File | Status | Notes |
|---|---|---|---|
| Sign Up | `(auth)/signup` | ✅ | Email + password via Supabase Auth |
| Login | `(auth)/login` | ✅ | Email + password |
| Forgot Password | `auth/callback` | ✅ | Supabase magic link flow |
| Accept Invite | `accept-invite/` | ✅ | Team member invite completion |
| Auth Middleware | `middleware.ts` | ✅ | All dashboard routes protected |

**How to test:**
1. Go to `/signup` → create a new account
2. Check your email for confirmation link → click it
3. Log in at `/login`
4. Log out, click Forgot Password → receive reset email

---

### 📊 Dashboard

| Feature | File | Status | Notes |
|---|---|---|---|
| KPI Cards | `dashboard/page.tsx` | ✅ | Avg score, compliance rate, appeal rate |
| Date Range Filter | `dashboard/date-range-picker.tsx` | ✅ | Week/custom range |
| Agent Leaderboard | `dashboard/page.tsx` | ✅ | Sorted by score |
| Team Rollup | `dashboard/page.tsx` | ✅ | Per-team averages |
| Review Queue Counter | `dashboard/page.tsx` | ✅ | Pending items count |
| Real-time Notifications | `layout-notifications.tsx` | ✅ | In-app bell + desktop popup |

**How to test:**
1. Score a few conversations first (see Upload section)
2. Go to `/dashboard` → check KPI cards populate
3. Change date range → verify numbers update

---

### 📁 CSV Upload & Scoring

| Feature | File | Status | Notes |
|---|---|---|---|
| CSV Upload | `upload/page.tsx` | ✅ | PapaParse, drag-and-drop |
| Column Mapping | `upload/` | ✅ | Auto-detect + manual override |
| Duplicate Detection | `upload/` | ✅ | SHA-256 hash per row |
| Score Pending Button | `upload/` | ✅ | Triggers batch scoring |
| Progress Indicator | `scoring-progress.tsx` | ✅ | Live updates via polling |
| Stop Scoring | `upload/` | ⚠️ | Works via DB flag; in-memory flag unreliable on Vercel |

**How to test (using sample data):**
1. Download the sample CSV from the Upload page
2. Add 3–5 rows: `agent_name`, `transcript_text` (min 10 chars), `conversation_date`
3. Upload → map columns → click "Import"
4. Click "Score Pending" → watch progress bar
5. Go to `/results` to see scored conversations

**Sample row:**
```
agent_name,transcript_text,conversation_date,channel
John Smith,"Hello this is John from support. How can I help you today? The customer said they needed a refund. I explained the policy clearly.",2026-06-01,chat
```

---

### 📞 Voice Audit

| Feature | File | Status | Notes |
|---|---|---|---|
| Dashboard Upload | `voice-audit/page.tsx` | ✅ | Single file via UI |
| Recording URL Submission | `voice-audit/` | ✅ | Enter URL, system downloads |
| Bulk Upload (CSV + audio) | `voice-audit/` | ✅ | Batch with metadata |
| Processing Queue | `api/cron/voice-worker` | ✅ | Runs every minute via Supabase pg_cron |
| Retry on Failure | `lib/voice/audit.ts` | ✅ | Exponential backoff, 5 attempts |
| 30-Day Recording Cleanup | `lib/voice/audit.ts` | ✅ | Auto-deletes audio files |
| Inbound API Webhook | `api/ingest/voice` | ✅ (fixed) | 50 MB size limit added |
| Processing Log | `voice-audit/page.tsx` | ✅ | Live event log per job |

**How to test (no dialer needed):**
1. Find any MP3/WAV on your computer (even a voice note from your phone)
2. Go to `/voice-audit` → click "Upload Audio File"
3. Fill in Agent Name, upload the file → Submit
4. Watch the processing log — it will transcribe and score automatically
5. When complete, click "View Results" → see the full score breakdown

**Free sample audio sources:**
- Record yourself on your phone saying a mock call script
- Use Google Text-to-Speech to generate a sample call
- Download free call center demo audio from YouTube (screen-record audio)

---

### 📋 Results

| Feature | File | Status | Notes |
|---|---|---|---|
| Results List | `results/page.tsx` | ✅ | Filterable by date/channel/status |
| Detail View | `results/[id]/page.tsx` | ✅ | Criterion breakdown, evidence |
| Audio Player | `results/[id]/page.tsx` | ✅ | Auto-loads for voice conversations |
| Coaching Notes | `results/[id]/page.tsx` | ✅ | AI-generated per conversation |
| Appeal Button | `results/[id]/page.tsx` | ✅ | Opens review queue |
| Webhook Results Visibility | `results/page.tsx` | ✅ | Shows webhook + CSV batches |

**How to test:**
1. Score a conversation (via upload or voice)
2. Go to `/results` → click any scored item
3. Verify: criterion scores, evidence spans, coaching note all visible
4. Click "Raise Appeal" → verify item appears in review queue

---

### 🔍 Review Queue

| Feature | File | Status | Notes |
|---|---|---|---|
| Tier 1 Review | `review-queue/` | ✅ | Any user agree/disagree |
| Tier 2 Review | `review-queue/` | ✅ | QA Manager confirms/denies |
| SLA Countdown | `review-queue/` | ⚠️ | Static snapshot; not live-updating |
| Auto-sweep overdue | `review-queue/actions.ts` | ✅ | Resolves overdue items on page load |
| 200-item limit | `review-queue/page.tsx` | ⚠️ | Silent cap (no warning shown) |

**How to test:**
1. After scoring, go to `/results` → click "Raise Appeal" on any item
2. Go to `/review-queue` → item should appear
3. Click "Agree with override" (Tier 1)
4. Log in as a QA Manager account → confirm the override (Tier 2)

---

### 📏 Rubrics

| Feature | File | Status | Notes |
|---|---|---|---|
| View Default Rubric | `rubrics/page.tsx` | ✅ | 7 criteria displayed |
| Edit Weights | `rubrics/` | ✅ | Must total exactly 100 |
| Edit Fatal Rules | `rubrics/` | ✅ | Per-campaign critical fails |
| Critical Fail Flag | `rubrics/` | ✅ | Per-criterion toggle |
| Weight Validation | `rubrics/actions.ts` | ✅ | Server-side 100-sum check |

> ⚠️ **Important:** Changing rubric weights affects how NEW scores are calculated. Existing scores are not recalculated. This is intentional for MVP — historical scores remain as-is.

**How to test:**
1. Go to `/rubrics` → adjust one criterion weight (e.g., change 20 to 15)
2. Also reduce another to keep total = 100
3. Click Save → verify success message
4. Upload a new conversation and score it → verify new weights applied

---

### 📚 Knowledge Base

| Feature | File | Status | Notes |
|---|---|---|---|
| Upload .md / .txt files | `knowledge/page.tsx` | ✅ (fixed) | Role check added (admin/qa_manager only) |
| Chunking + Embedding | `knowledge/actions.ts` | ✅ | Auto-splits and embeds via your LLM key |
| Duplicate Prevention | `knowledge/actions.ts` | ✅ | SHA-256 hash check |
| RAG at Score Time | `lib/scoring/score-conversation.ts` | ✅ | Injected into each criterion prompt |
| Delete Document | `knowledge/actions.ts` | ✅ | Admin/qa_manager only |

> ⚠️ **Note:** Large files (5–10 MB) may take 1–3 minutes to process because embedding is done synchronously. Upload and wait — the UI will show status.

**How to test:**
1. Create a text file with your SOP (e.g., "Agents must greet the customer by name")
2. Go to `/knowledge` → upload the file
3. Wait for status to show "Ready"
4. Score a new conversation → the rubric should reference your SOP in reasoning

---

### 📈 Reports

| Feature | File | Status | Notes |
|---|---|---|---|
| Weekly Report | `reports/page.tsx` | ✅ (fixed) | Client ID filter + truncation warning added |
| Custom Date Range | `reports/page.tsx` | ✅ | Calendar picker |
| KPI Cards | `reports/page.tsx` | ✅ | Volume, avg score, compliance, appeals |
| Status Donut Chart | `reports/page.tsx` | ✅ | Final / Review / Fail breakdown |
| Per-Agent Table | `reports/page.tsx` | ✅ | Sorted by volume |
| Per-Channel Table | `reports/page.tsx` | ✅ | Chat / Email / Voice breakdown |
| Download CSV | `api/export/reports` | ✅ | Date-filtered CSV export |
| Print | `reports/print-button.tsx` | ✅ | Browser print |

**How to test:**
1. Score at least 3 conversations
2. Go to `/reports` → verify KPI cards show data
3. Click "Previous" → verify prior week shows (or "No conversations")
4. Click "Download CSV" → verify file downloads with correct data

---

### 💳 Billing

| Feature | File | Status | Notes |
|---|---|---|---|
| Plan Overview | `billing/page.tsx` | ✅ | Current plan, seat count |
| Usage Meter | `billing/page.tsx` | ✅ | LLM token usage this month |
| Plan Picker | `billing/page.tsx` | ✅ | Plan A / Plan B cards |
| Razorpay Checkout | `billing/checkout-actions.ts` | ⚠️ | Needs Razorpay Plan IDs in env vars |
| Cancel Subscription | `billing/page.tsx` | ✅ | Cancel at cycle end |
| Subscription History | `billing/page.tsx` | ✅ | Last 5 entries |

> 🔴 **Before going live:** You must create Razorpay subscription plans in your Razorpay Dashboard and add these env vars to Vercel:
> - `RAZORPAY_PLAN_STARTER` = plan_xxxxxxxx (for Plan A)
> - `RAZORPAY_PLAN_GROWTH` = plan_xxxxxxxx (for Plan B)
> - `RAZORPAY_WEBHOOK_SECRET` = your Razorpay webhook secret

**How to test (without real payment):**
1. Go to `/billing` → verify current plan shows correctly
2. Click a paid plan → Razorpay modal should open (will fail if plan IDs not set)
3. Use Razorpay test card: `4111 1111 1111 1111`, CVV: `111`, Expiry: any future date

---

### ⚙️ Settings

| Feature | File | Status | Notes |
|---|---|---|---|
| Account Info | `settings/page.tsx` | ✅ | Read-only name/email/role |
| LLM Provider Config | `settings/page.tsx` | ✅ | OpenAI / OpenRouter / custom |
| API Key Management | `settings/page.tsx` | ✅ | Masked display, admin only |
| Review Workflow Settings | `settings/page.tsx` | ✅ | SLA hours, pass threshold, second reviewer |
| Inbound Webhook Tokens | `settings/page.tsx` | ✅ | Create, revoke, delete |
| Outbound Webhook URLs | `settings/page.tsx` | ✅ | For n8n / Zapier / CRM |
| Data Sources | `settings/page.tsx` | ✅ | Live fact-check API config |
| Team Management | `settings/team/` | ✅ | Invite, role, remove |

**How to test (Inbound Webhook):**
1. Go to `/settings` → Inbound Webhooks → "Create Token"
2. Copy the token (shown once only!)
3. Open PowerShell and run:
```powershell
$body = '{"agent_name":"Test Agent","transcript_text":"Hello I am calling about my bill. The agent explained everything clearly and resolved the issue.","conversation_date":"2026-06-06","channel":"chat"}'
Invoke-WebRequest -Uri "https://YOUR-APP.vercel.app/api/ingest/webhook?token=YOUR_TOKEN" -Method POST -Body $body -ContentType "application/json"
```
4. Go to `/results` → the conversation should appear

**How to test (Outbound Webhook using webhook.site):**
1. Go to https://webhook.site → copy your free unique URL
2. In QAScope → `/settings` → Outbound Webhooks → Add the webhook.site URL
3. Score a conversation
4. Check webhook.site → you should see the score payload arrive

---

### 🔔 Alerts Engine

| Feature | File | Status | Notes |
|---|---|---|---|
| In-App Notifications | `layout-notifications.tsx` | ✅ | Bell icon, badge count |
| Desktop Push (Browser) | `push-notification-provider.tsx` | ✅ | Native OS popup |
| Email Alerts | `lib/scoring/alert.ts` | ✅ | Via Resend on critical fail |
| Critical Fail Detection | `lib/scoring/score-conversation.ts` | ✅ | Triggers alert pipeline |
| Alert Preferences | `my-feedback/` | ✅ | Per-user toggle |
| Notification Queue | `agent_notifications` table | ✅ | Persistent, per-user |

**How to test:**
1. Go to `/my-feedback` → click "Enable Push Notifications" → Allow in browser
2. Upload a conversation with a clearly poor transcript (insults, policy violations)
3. Score it → if it scores as critical_fail, you should get a browser popup notification

---

### 🔗 Webhook Integration (CRM/Dialer)

| Direction | Endpoint | Auth Method | Status |
|---|---|---|---|
| **Inbound** (CRM → QAScope) | `POST /api/ingest/webhook?token=X` | Bearer token | ✅ |
| **Inbound Voice** (Dialer → QAScope) | `POST /api/ingest/voice?token=X` | Bearer token + HMAC | ✅ (fixed: 50MB limit) |
| **Outbound** (QAScope → CRM) | Configurable URL | HMAC SHA-256 signature | ✅ (fixed: 10s timeout) |

---

### 🛡️ Admin Console

| Feature | Status | Notes |
|---|---|---|
| Client Management | ✅ | Create/view all workspace accounts |
| Super-Admin Only | ✅ | Role = super_admin enforced |
| User Listing per Workspace | ✅ | View all members |

---

## 🧪 Full Testing Checklist (No Dialer Needed)

Use this to systematically test every feature before going to a customer:

### Phase 1 — Account Setup
- [ ] Sign up with a new email
- [ ] Confirm email
- [ ] Log in
- [ ] Go to Settings → LLM Provider → enter your OpenAI key → Test Connection

### Phase 2 — First Conversation
- [ ] Go to Upload → download sample CSV → fill 3 rows → upload
- [ ] Map columns → import
- [ ] Click "Score Pending" → wait for completion
- [ ] Go to Results → verify 3 scored items appear

### Phase 3 — Voice Audit
- [ ] Record a 30-second voice note on your phone
- [ ] Go to Voice Audit → upload the file
- [ ] Wait for processing (1–3 min)
- [ ] Go to Results → verify voice conversation is scored
- [ ] Click into it → verify audio player appears

### Phase 4 — Review & Reports
- [ ] On any result → click "Raise Appeal"
- [ ] Go to Review Queue → confirm the item appears
- [ ] Approve or deny the appeal
- [ ] Go to Reports → verify KPI numbers are correct

### Phase 5 — Webhooks
- [ ] Create an inbound webhook token in Settings
- [ ] Send a POST request from PowerShell (see Settings section above)
- [ ] Verify the conversation appears in Results
- [ ] Add a webhook.site URL to Outbound Webhooks
- [ ] Score a conversation → verify data arrives at webhook.site

### Phase 6 — Alerts
- [ ] Enable push notifications in My Feedback
- [ ] Upload a clearly bad transcript → score it
- [ ] Verify in-app bell shows a notification
- [ ] If email (Resend) is configured → verify email arrives

### Phase 7 — Billing
- [ ] Go to Billing → verify Pilot plan shows correctly
- [ ] If Razorpay IDs are set → test Plan A checkout with test card

---

## 🔴 Remaining Items Before First Customer

| Priority | Item | Effort |
|---|---|---|
| 🔴 Must | Add Razorpay Plan IDs to Vercel env vars | 15 min (Razorpay dashboard) |
| 🔴 Must | Add `RAZORPAY_WEBHOOK_SECRET` to Vercel | 5 min |
| 🔴 Must | Set up Resend (email alerts) or verify it is configured | 10 min |
| 🔴 Must | Set VAPID keys for push notifications | 15 min (one-time keygen) |
| 🟡 Soon | Razorpay: downgrade "trialing" stuck subscriptions cleanup | Low priority for first customer |
| 🟡 Soon | Replace `supportqascope@gmail.com` hardcode with env var | Minor |
| ⬜ Later | LLM API keys encrypted in Supabase Vault | Post-first-customer |
| ⬜ Later | Rate limiting on inbound webhook | Post-first-customer |
| ⬜ Later | Rubric versioning / score history snapshots | Post-first-customer |
