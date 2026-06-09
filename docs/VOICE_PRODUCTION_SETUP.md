# Voice Audit Production Setup

QAScope accepts a recording after a call ends, stores it privately in Supabase,
transcribes and scores it in the background, and deletes the recording after 30
days. Transcripts, scores, reports, and processing logs remain.

## One-Time Setup

1. Run `supabase/027_voice_production_pipeline.sql` in the Supabase SQL Editor.
2. Create a long random `CRON_SECRET` and add it to the Vercel Production
   environment variables.
3. In Supabase SQL Editor, save the same value:

   ```sql
   select vault.create_secret('PASTE_THE_SAME_SECRET', 'qascope_cron_secret');
   ```

4. Run `supabase/028_schedule_voice_worker.sql`.
5. Redeploy QAScope in Vercel.

## Connect a Dialer

1. In QAScope Settings, create a webhook token.
2. Give the dialer team the voice endpoint, token, and signing secret.
3. Configure the dialer to send the recording URL and call details after each
   call ends.
4. Keep signature verification enabled. Use **Unsigned allowed** only when the
   dialer cannot create signatures.

Signed calls send:

- `x-qascope-timestamp`: current Unix timestamp in seconds
- `x-qascope-signature`: `sha256=` plus the HMAC-SHA256 of
  `timestamp.raw_request_body`, using the signing secret

QAScope rejects signed requests older than five minutes.

## Storage and Customer Copies

Supabase Storage is the production recording store. Customers can keep a copy
in their own database or storage before the 30-day deletion date. Google Drive
is suitable for testing or customer-owned exports, but it is not part of the
production processing path.

## Daily Checks

- Voice Audit shows queued, retrying, failed, and completed jobs.
- Processing log shows each important processing event.
- Failed jobs retry automatically up to five times and can also be manually
  queued again.
