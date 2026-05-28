# QAScope — Feature Test & How-To Guide

> **How to use this doc**: Read each section top to bottom. Every feature has four parts:
> **What it is · Requirements · How to do it · What to expect**
> Use the checkboxes as a test checklist — tick each one as you verify it works.

---

## 1. Sign Up & Sign In

### What it is
QAScope uses email-based authentication via Supabase Auth. The first person to sign up for a workspace becomes the admin.

### Requirements
- A valid email address
- Access to the QAScope deployment URL (e.g. `https://qascope.vercel.app`)

### How to do it
1. Go to the app URL → click **Sign up**
2. Enter your email and a password (min 8 characters)
3. Check your inbox → click the confirmation link
4. You'll be redirected to the dashboard automatically

### What to expect
- [ ] Redirected to `/dashboard` after login
- [ ] Sidebar shows: Dashboard, Results, Review Queue, Reports, Knowledge, Upload, Rubrics, Settings, Billing
- [ ] Your role shows as **Admin** (first user always gets admin)

---

## 2. Workspace & First-Time Setup

### What it is
Your workspace is your organisation's isolated environment. All agents, conversations, scores, and users belong to it. Admins configure LLM keys, scoring thresholds, and review workflows here.

### Requirements
- Admin role
- Your AI provider API key (OpenAI, Groq, OpenRouter, Gemini, AWS Bedrock, etc.)

### How to do it
1. Go to **Settings**
2. **LLM Configuration section** — fill in:
   - **Provider**: e.g. `openai`
   - **Model**: e.g. `gpt-4o-mini`
   - **API Key**: paste your key *(stored encrypted, never logged)*
   - **Base URL**: leave blank for OpenAI; fill for OpenRouter (`https://openrouter.ai/api/v1`) or Gemini
3. Click **Save LLM settings**
4. **Review Workflow section** — set:
   - **Pass threshold**: e.g. `70` (scores below this go to review queue)
   - **SLA hours**: e.g. `24` (how long reviewers have to action items)
   - **Review confidence threshold**: e.g. `70` (AI scores below this confidence auto-flag for human review)
   - **Second reviewer**: pick a QA manager from the dropdown (for appeal escalations)
5. Click **Save review settings**

### What to expect
- [ ] Green "Saved" toast appears after each save
- [ ] LLM API key is masked (shows only last 4 chars) after saving
- [ ] If key is wrong → scoring will fail with "LLM error" — fix the key and retry

---

## 3. Invite Your Team

### What it is
QAScope has 5 roles. Each role sees different parts of the UI and can perform different actions.

| Role | What they can do |
|------|-----------------|
| **Admin** | Everything — settings, billing, danger zone |
| **QA Manager** | Scoring, review, reports, team management |
| **Team Lead** | Review queue, results, reports |
| **QA Reviewer** | Review queue only |
| **Viewer** | Read-only results and reports |

### Requirements
- Admin or QA Manager role
- Team member's email address

### How to do it
1. Go to **Settings → Team**
2. Click **Invite member**
3. Enter email, select role, optionally add team name
4. Click **Send invite**
5. The invitee receives an email with a magic link → clicks it → sets their password

### Bulk invite (for large teams)
1. Go to **Settings → Team → Bulk upload**
2. Download the CSV template
3. Fill columns: `email`, `name`, `role`, `team_name`
4. Upload the CSV → invites sent in bulk

### What to expect
- [ ] Invited user appears in the team list with status "Pending"
- [ ] After they accept → status changes to their role name
- [ ] Bulk upload: summary shows how many invites sent / failed

---

## 4. Set Up Your QA Rubric

### What it is
A rubric defines the scoring criteria — what the AI evaluates in every conversation. QAScope ships with 7 built-in criteria but you can customise weights and add fatal rules.

**Default criteria** (each scored 0/1/2):
1. Compliance & Legal
2. Accuracy of Information
3. Problem Resolution
4. Communication Quality
5. Empathy & Tone
6. Process Adherence
7. Customer Experience

### Requirements
- Admin or QA Manager role

### How to do it
1. Go to **Rubrics**
2. Your default rubric is pre-created — click it to view
3. **Adjust weights**: each criterion has a weight (e.g. Compliance = 30, Accuracy = 20). Weights are relative — higher = more impact on final score
4. **Add fatal rules**: for criteria that should auto-fail the whole conversation (e.g. "Agent must never ask for OTP"). Click **Add fatal rule** → enter name + description
5. Mark a rubric as **Default** to activate it for scoring

### What to expect
- [ ] Rubric page shows all 7 criteria with weights
- [ ] Total weight doesn't need to equal 100 — the engine normalises
- [ ] Fatal rules appear in the Compliance prompt at scoring time
- [ ] Changing weights takes effect on the **next** scoring run (past scores unchanged)

---

## 5. Upload the Knowledge Base

### What it is
The knowledge base is your SOP documents, product policies, return policies, scripts, etc. The AI retrieves relevant sections during scoring to check if the agent followed procedure.

### Requirements
- Admin or QA Manager role
- Document files (PDF, TXT, DOCX, or paste plain text)

### How to do it
1. Go to **Knowledge**
2. Click **Upload document**
3. Choose file or paste text → give it a title
4. Click **Upload**
5. Wait for status to change from `Processing` → `Ready` (takes 10–60 seconds depending on size)

### What to expect
- [ ] Document appears in the list with status `Ready`
- [ ] `chunk_count` shows how many passages were indexed
- [ ] During scoring, the AI will cite knowledge base sections in its explanations
- [ ] If status stays `Error` → check that embedding API key is configured in LLM Settings

---

## 6. Upload Conversations (CSV)

### What it is
Upload a batch of past conversations for AI scoring. Each row in the CSV becomes one scored conversation.

### Requirements
- Any role except Viewer
- CSV file with specific columns

### CSV format
```
agent_name, transcript, conversation_date, customer_id, channel
"Priya Sharma", "Agent: Hello...\nCustomer: ...", "2024-05-24", "CUST-001", "voice_transcript"
```

**Required columns**: `transcript`
**Optional columns**: `agent_name`, `conversation_date`, `customer_id`, `channel` (chat/email/voice_transcript)

### How to do it
1. Go to **Upload**
2. Click **Choose file** → select your CSV
3. Review the preview (first 5 rows shown)
4. Click **Upload conversations**
5. Rows are ingested → go to **Results** to start scoring

### What to expect
- [ ] Upload success toast: "X conversations uploaded"
- [ ] Conversations appear in Results with status `Pending`
- [ ] If agent names match existing agents → linked automatically; otherwise new agent profiles created

---

## 7. Score Conversations

### What it is
The AI scoring engine runs each conversation through all 7 criteria, computes a weighted score (0–100), generates a coaching note, and flags anything below your pass threshold for review.

### Requirements
- At least one conversation uploaded
- LLM API key configured
- Default rubric exists

### How to do it
1. Go to **Results**
2. Click **Score all pending** (or score individual conversations)
3. A progress bar appears — you can see live updates
4. Click **Stop scoring** at any time to pause (resumes from where it left off next time)

### What to expect
- [ ] Progress bar shows X/Y scored
- [ ] Each conversation gets a score 0–100
- [ ] Conversations below pass threshold get status `Needs Review` → appear in Review Queue
- [ ] Conversations with a critical fail (fatal rule triggered) get status `Critical Fail`
- [ ] Scoring takes ~15–45 seconds per conversation depending on transcript length and LLM speed
- [ ] A **coaching note** is auto-generated for each score (visible in the score detail page)

---

## 8. Review a Score (Score Detail Page)

### What it is
Every score has a detail page showing the breakdown by criterion, the AI's explanation and evidence, the coaching note, and options to appeal or review.

### How to do it
1. Go to **Results** → click any conversation row
2. Review the score breakdown table:
   - Each criterion: score (0/1/2), confidence %, explanation, evidence quote
3. Read the **Coaching Note** — a plain-English summary of what the agent did well and what to improve
4. If you disagree with the score → click **Appeal** → add your reason

### What to expect
- [ ] Score breakdown shows all 7 criteria
- [ ] Evidence spans are quoted directly from the transcript
- [ ] Knowledge base sources cited where used
- [ ] Appeal button visible if the score is `final` status
- [ ] After appeal → conversation moves to Review Queue

---

## 9. Review Queue

### What it is
A two-tier human review system. Conversations land here when:
- Score is below pass threshold (`low_score`)
- AI confidence is below threshold (`low_confidence`)
- A critical/fatal rule was triggered (`critical_fail`)
- Agent filed an appeal

**Tier 1**: Any reviewer agrees or disagrees with the AI score
**Tier 2**: If Tier 1 disagrees → escalates to the configured Second Reviewer for final override

### How to do it
**Tier 1 (first reviewer)**:
1. Go to **Review Queue**
2. Click a pending item
3. Read the transcript + AI score
4. Click **Agree** (AI was right) or **Disagree** (AI was wrong)
5. Add a comment to justify your decision

**Tier 2 (second reviewer — appeals)**:
1. Disagreements appear in the queue with state `Pending Second Review`
2. Second reviewer clicks **Confirm Override** (accept the disagreement, change the score) or **Deny Override** (keep the AI score)
3. Add a comment to explain the decision
4. Optionally enter an **Adjusted Score** (0–100) to manually set the final score

### What to expect
- [ ] Review Queue shows items grouped by state: Pending First / Pending Second / Closed
- [ ] SLA deadline shown — items auto-resolve when deadline passes
- [ ] After confirm override → score updates in Results page
- [ ] Closed items show full audit trail: AI score → Tier 1 decision → Tier 2 decision

---

## 10. Webhook Integration (CRM / Website)

### What it is
Instead of uploading CSVs manually, your CRM, website, or telephony system can POST conversations directly to QAScope in real time. QAScope scores them automatically.

### Requirements
- Admin or QA Manager role
- Access to your CRM's webhook/automation settings

### How to do it — Create a token
1. Go to **Settings → Webhooks & CRM Ingest**
2. Enter a name: e.g. `"Freshdesk Production"`
3. Click **Create** → copy the token immediately (shown only once)
4. Note the endpoint: `POST https://yourapp.com/api/ingest/webhook?token=<your-token>`

### How to do it — Connect your CRM
Configure your CRM to POST to the endpoint with this JSON body:

```json
{
  "transcript": "Agent: Hello, how can I help?\nCustomer: My order ORD-123...",
  "agent_name": "Priya Sharma",
  "customer_id": "CUST-001",
  "order_id": "ORD-123",
  "channel": "voice_transcript",
  "conversation_date": "2024-05-27"
}
```

**Test with cURL**:
```bash
curl -X POST "https://yourapp.com/api/ingest/webhook?token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Agent: Hello...", "agent_name": "Priya Sharma"}'
```

### What to expect
- [ ] `201 {"ok": true, "conversation_id": "uuid", "message": "Queued for scoring"}`
- [ ] Conversation appears in Results within seconds
- [ ] Scoring runs automatically (no manual trigger needed)
- [ ] If token is wrong → `401 {"error": "Invalid or inactive token"}`
- [ ] Token `last_used_at` timestamp updates after each successful call

### Manage tokens
- **Revoke**: deactivates the token (existing conversations unaffected)
- **Delete**: permanently removes revoked tokens
- You can create multiple tokens — one per CRM, one per environment

---

## 11. Live Verification Sources

### What it is
Connects QAScope to your real business data. When scoring, the AI automatically checks whether the agent gave the customer accurate information (correct order status, right delivery date, valid policy, etc.).

### Requirements
- Admin or QA Manager role
- A website URL or API endpoint that returns order/customer data
- SQL migration `021_data_sources.sql` run in Supabase

### How to do it — Website source
1. Go to **Settings → Live Verification Sources**
2. Click **+ Add data source**
3. Name: `"Return Policy Page"`
4. Type: `Website / Help Centre`
5. URL: `https://yoursite.com/policies/returns`
6. Entity hints: *(leave blank — content is always fetched)*
7. Click **Save source**

### How to do it — API source
1. Click **+ Add data source**
2. Name: `"Order Status API"`
3. Type: `API Endpoint`
4. Endpoint template: `https://api.yourcompany.com/orders/{order_id}`
   - `{order_id}` is a placeholder — AI fills it from the transcript
5. HTTP Method: `GET`
6. Auth header name: `X-Api-Key` *(optional)*
   - Store the key value as env var: `DATASOURCE_X_API_KEY=your_secret`
7. Entity hints: `order_id, customer_id`
8. Click **Save source**

### What to expect at scoring time
- [ ] AI extracts `order_id` from transcript: `"ORD-9876"`
- [ ] Calls `https://api.yourcompany.com/orders/ORD-9876`
- [ ] Gets: `{"status": "Delivered", "delivered_at": "2024-05-24"}`
- [ ] If agent said "your order is still in transit" → **Accuracy criterion fails** with evidence
- [ ] If agent said "delivered on 24th May" → **Accuracy criterion passes**
- [ ] Sources with no matching entities are skipped silently

### Manage sources
- **Pause**: temporarily disables a source (scoring continues without it)
- **Resume**: re-activates
- **Delete**: permanent removal

---

## 12. Email Alerts

### What it is
Two types of automated emails:

**Low-Score Alert** — sent immediately when any conversation scores below the pass threshold. Goes to all QA Managers and Admins.

**Daily Digest Report** — sent every evening at 6:00 PM IST with:
- Total conversations scored that day
- Pass rate %
- Average score
- Bottom 5 agents by score
- Top 5 most-failed criteria

### Requirements
- `RESEND_API_KEY` set in environment variables
- `FROM_EMAIL` set (e.g. `alerts@yourdomain.com` or `onboarding@resend.dev` for testing)
- At least one user with role `admin` or `qa_manager` — they receive the emails

### How to set up Resend
1. Go to [resend.com](https://resend.com) → Sign up free
2. Go to **API Keys** → **Create API Key** → copy it
3. Add to Vercel env vars: `RESEND_API_KEY = re_xxxxxxxxxxxx`
4. Set `FROM_EMAIL = your@domain.com` (or `onboarding@resend.dev` on free tier without custom domain)
5. Redeploy for env vars to take effect

### What to expect
- [ ] Low-score alert email arrives within ~30 seconds of a failing score
- [ ] Email shows: agent name, score, shortfall, top failed criteria, direct link to score
- [ ] Daily digest arrives at ~6:00 PM IST (12:30 UTC)
- [ ] If `RESEND_API_KEY` is blank → emails silently skipped (no error)

### Test the daily report manually
```
GET https://yourapp.com/api/cron/daily-report?secret=YOUR_CRON_SECRET
```
Expected: `{"ok": true, "sent": 2, "date": "Monday, 27 May 2026"}`

---

## 13. Billing & Plans

### What it is
QAScope uses a retroactive volume discount model — the rate you qualify for applies to **all seats** from seat 1, not just the extra ones.

| Plan | Seats | Rate | Example |
|------|-------|------|---------|
| Starter | 1–49 | $20/seat/month | 49 seats = $980/mo |
| Growth | 50–99 | $18/seat on all | 50 seats = $900/mo |
| Scale | 100+ | $16/seat on all | 100 seats = $1,600/mo |

**All plans**: Bring your own AI API key · Unlimited conversations · Full feature access

### Requirements (to activate paid plans)
- Admin role
- Razorpay env vars set: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`
- Razorpay plan IDs set: `RAZORPAY_PLAN_STARTER`, `RAZORPAY_PLAN_GROWTH`, `RAZORPAY_PLAN_SCALE`

### How to set up Razorpay
1. Go to [razorpay.com](https://razorpay.com) → Sign up → Dashboard
2. **Settings → API Keys** → Generate Key → copy Key ID + Secret
3. **Products → Subscriptions → Plans** → Create 3 plans (monthly, INR/USD):
   - Starter: ₹1,660/seat/month (or USD equivalent)
   - Growth: ₹1,494/seat/month
   - Scale: ₹1,328/seat/month
4. Copy each plan's ID → paste into Vercel env vars
5. **Settings → Webhooks** → Add webhook URL: `https://yourapp.com/api/billing/razorpay-webhook`
   - Copy the webhook secret → paste into `RAZORPAY_WEBHOOK_SECRET`
6. Redeploy after setting all env vars

### How to upgrade a plan
1. Go to **Billing**
2. **Current plan card** — shows your plan, seats used, and estimated monthly cost
3. **Plans section** — find the plan you want → click **Upgrade to [Plan]**
4. Razorpay checkout modal opens → enter payment details
5. On success → plan activates automatically via webhook

### What to expect
- [ ] Billing page loads without errors
- [ ] Seat count matches users in Settings → Team
- [ ] "Upgrade" button opens Razorpay checkout modal
- [ ] After successful test payment → plan updates to new tier
- [ ] `subscriptions` table shows new `status = active`
- [ ] If Razorpay keys not set → button shows "Payment gateway not configured"
- [ ] Current plan shows "Current plan" instead of upgrade button
- [ ] Non-admin users see "Contact your admin" instead of button
- [ ] LLM cost tracker shows AI API usage by feature

---

## 14. Reports

### What it is
QAScope has two report types:

**Standard Reports** — pre-built views of QA data: pass rates, score trends, agent leaderboard, criteria heatmap.

**Custom Report Templates** — build your own report by selecting metrics, filters (date range, team, agent, criteria), and groupings. Save and re-run at any time.

### How to do it — Standard reports
1. Go to **Reports**
2. Set date range using the date picker
3. Review:
   - **Pass rate trend** — line chart by day/week
   - **Agent leaderboard** — ranked by average score
   - **Criteria heatmap** — which criteria fail most often
   - **Score distribution** — histogram

### How to do it — Custom report templates
1. Go to **Reports → Templates**
2. Click **New template**
3. Name your template, select metrics and filters
4. Click **Save template**
5. Click **Run** on any saved template to generate it
6. Click **Export** to download as CSV

### What to expect
- [ ] Reports update in real time as new scores come in
- [ ] Date filter works — changing range refreshes all charts
- [ ] Export downloads a CSV with one row per conversation
- [ ] Custom templates appear in the list and can be re-run any time

---

## 15. Full End-to-End Test Checklist

Use this as your final verification that everything works together:

### Setup
- [ ] Sign up and log in successfully
- [ ] LLM API key saved → test by scoring one conversation
- [ ] Pass threshold set to `70`, SLA to `24h`
- [ ] Invited at least one team member → they can log in

### Knowledge & Rubric
- [ ] Uploaded at least one SOP document → status `Ready`
- [ ] Default rubric exists with all 7 criteria

### CSV Upload & Scoring
- [ ] Uploaded sample CSV with 5+ conversations
- [ ] Clicked Score All → scored without errors
- [ ] At least one score below 70 appears in Review Queue
- [ ] Score detail page shows breakdown, evidence, coaching note

### Review Queue
- [ ] Clicked **Agree** on one item → status changes to `Closed`
- [ ] Clicked **Disagree** on one item → escalated to Tier 2
- [ ] Second reviewer confirmed or denied the override
- [ ] Adjusted score reflects on Results page

### Webhook
- [ ] Created a webhook token in Settings
- [ ] Sent a test cURL request → got `201` response
- [ ] Conversation appeared in Results and was scored

### Live Verification
- [ ] Added at least one data source (website URL)
- [ ] Scored a conversation → score detail shows verification context was used
- [ ] Added an API endpoint source with `{order_id}` placeholder
- [ ] Scored a conversation mentioning a real order → accuracy criterion reflects real data

### Emails
- [ ] Low-score alert received after a failing score
- [ ] Hit `/api/cron/daily-report?secret=...` → got `ok: true`
- [ ] Daily digest email received at 6 PM IST

### Reports
- [ ] Standard reports show data after scoring
- [ ] Created and ran a custom report template
- [ ] Exported CSV downloaded correctly

### Billing
- [ ] Billing page loads without errors
- [ ] Seat count and estimated cost look correct
- [ ] LLM cost tracker shows usage after scoring
- [ ] "Upgrade" button opens Razorpay checkout modal (requires Razorpay keys in env)
- [ ] Current plan shows "Current plan" — no upgrade button
- [ ] Non-admin sees "Contact your admin" text

---

## Appendix: Roles & Permissions Quick Reference

| Action | Admin | QA Manager | Team Lead | QA Reviewer | Viewer |
|--------|-------|-----------|-----------|-------------|--------|
| Change LLM/settings | ✅ | ✅ | ❌ | ❌ | ❌ |
| Invite team members | ✅ | ✅ | ❌ | ❌ | ❌ |
| Upload conversations | ✅ | ✅ | ✅ | ❌ | ❌ |
| Trigger scoring | ✅ | ✅ | ✅ | ❌ | ❌ |
| Review queue (Tier 1) | ✅ | ✅ | ✅ | ✅ | ❌ |
| Review queue (Tier 2) | ✅ | ✅ | ❌ | ❌ | ❌ |
| View reports | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage webhooks | ✅ | ✅ | ❌ | ❌ | ❌ |
| Danger zone (data reset) | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## Appendix: Common Issues & Fixes

| Issue | Likely cause | Fix |
|-------|-------------|-----|
| Scoring fails with "No default rubric" | Rubric not marked as default | Go to Rubrics → click your rubric → Mark as Default |
| Scoring fails with "LLM error" | Wrong API key or model name | Settings → LLM → re-enter key and model |
| Knowledge base stuck on "Processing" | Embedding key not set | Settings → LLM → fill in Embedding API Key |
| Webhook returns 401 | Wrong or revoked token | Settings → Webhooks → create a new token |
| No email alerts | `RESEND_API_KEY` not set | Add to Vercel env vars → redeploy |
| Review queue empty despite low scores | Pass threshold too low | Settings → Review → raise pass threshold |
| Daily report not arriving | `CRON_SECRET` mismatch | Vercel env var must match your `.env.local` value |
