# QAScope Production Readiness — Task Tracker

## Code Fixes (Done)
- [x] Outbound webhook — added 10s AbortController timeout
- [x] Voice ingest API — added 50 MB file size guard (413 response)
- [x] Reports page — added explicit client_id filter + truncation warning banner
- [x] Knowledge base — added role authorization check (admin/qa_manager only)
- [x] Push notifications — fixed Uint8Array type cast (both files)
- [x] WebhookTokensRow — added allow_unsigned, signing_secret fields
- [x] VoiceAuditJobsRow — added audio_size_bytes, relationship to conversations
- [x] qa_scores — added relationship to conversations
- [x] score-conversation.ts — fixed rubric select to include name field
- [x] voice-audit/page.tsx — fixed event id type (string not number)
- [x] Production build — passes with zero errors ✅

## Environment Variables (Still Needed)
- [ ] `RAZORPAY_PLAN_STARTER` — Create Plan A in Razorpay dashboard, paste ID here
- [ ] `RAZORPAY_PLAN_GROWTH` — Create Plan B in Razorpay dashboard, paste ID here
- [ ] `RAZORPAY_WEBHOOK_SECRET` — Copy from Razorpay → Webhooks settings
- [ ] `RESEND_API_KEY` — Verify this is set for email alerts
- [ ] `FROM_EMAIL` — Verify sender email is set
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — Run: npx web-push generate-vapid-keys
- [ ] `VAPID_PRIVATE_KEY` — Same command as above

## Testing Checklist (User to complete)
- [ ] Sign up → confirm email → log in
- [ ] Settings → LLM Provider → enter OpenAI key → Test Connection
- [ ] Upload a CSV with 3 rows → import → score
- [ ] Check Results page shows scored items
- [ ] Upload a voice recording → wait for processing → check Results
- [ ] Create inbound webhook token → test with PowerShell POST
- [ ] Add webhook.site URL to outbound webhooks → score → verify delivery
- [ ] Enable push notifications → score bad call → verify desktop popup
- [ ] Go to Reports → verify KPI numbers correct
- [ ] Test billing page (after Razorpay IDs are set)

## Sales Campaign (Next Phase)
- [ ] Record a 5-minute demo video (screen recording of scoring a live call)
- [ ] Identify 10 target BPO/Call Center companies to reach out to
- [ ] Prepare "Free Mini-Audit" offer (we audit 5 of their calls for free)
- [ ] Set up a Calendly link for demo bookings
