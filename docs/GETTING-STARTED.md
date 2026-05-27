# Getting started with QAScope

Everything you need to run the app, connect a QA engine, and produce your
first audit.

---

## Quick links

| What | URL |
| --- | --- |
| **Run the app locally** | http://localhost:3000 |
| **Sign in** | http://localhost:3000/login |
| **Sign up (new workspace)** | http://localhost:3000/signup |
| **Settings → QA engine** | http://localhost:3000/settings |
| **Upload a CSV** | http://localhost:3000/upload |
| **Results** | http://localhost:3000/results |
| **Review queue** | http://localhost:3000/review-queue |
| **Dashboard** | http://localhost:3000/dashboard |
| **Reports** | http://localhost:3000/reports |
| **Billing & plan** | http://localhost:3000/billing |

External services:

| What | URL |
| --- | --- |
| Supabase (DB + Auth) | https://supabase.com/dashboard |
| OpenRouter (recommended QA engine for general use) | https://openrouter.ai |
| AWS Bedrock console (for the AWS-credits path) | https://console.aws.amazon.com/bedrock |
| Anthropic API (direct Claude) | https://console.anthropic.com |

---

## Running the server

Open a terminal in the project root:

```bash
cd "C:\Users\Bonison Vinod\Projects\AI QA Copilot\qascope"
npm install        # first time, or after pulling new code
npm run dev        # start the local server
```

You should see:

```
▲ Next.js 16.2.4
- Local:        http://localhost:3000
```

Open http://localhost:3000 in your browser. The first time you run, a new
account flow walks you through workspace creation.

**To stop the server:** press `Ctrl+C` in the terminal.

### Other useful commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the local development server (hot reload). |
| `npm run build` | Production build. Run before `npm start`. |
| `npm start` | Start the production server. |
| `npm run lint` | Check the code for style problems. |
| `npm test` | Run the unit tests. |

---

## First-time setup checklist

Do this once, in this order:

1. **Environment file.** Make sure `qascope/.env.local` exists. If not,
   copy `.env.local.example` and fill it in:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://<your-project>.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<the anon key from Supabase dashboard>
   SUPABASE_SERVICE_ROLE_KEY=<the service-role key from Supabase dashboard>
   ```

   You get those keys from the Supabase dashboard → Settings → API.

2. **Apply the SQL migrations** in the Supabase SQL editor, in order
   (each is idempotent — safe to re-run):

   - `supabase/015_scoring_stop_flag.sql`
   - `supabase/016_upload_batch_id.sql`
   - `supabase/017_review_confidence_threshold.sql`
   - `supabase/018_separate_embedding_key.sql`

3. **Start the server** with `npm run dev` and open
   http://localhost:3000.

4. **Sign up** with your email. The first user in a workspace becomes
   `admin`.

5. **Configure the QA engine** at http://localhost:3000/settings →
   "QA engine provider":
   - Pick a provider from the dropdown (AWS Bedrock if you're using
     AWS credits; OpenRouter otherwise).
   - Paste your API key / Bearer token.
   - Set base URL / region.
   - Optionally pick a model.
   - Save.

6. **Set up a rubric** at http://localhost:3000/rubrics. You can start
   with the default seven criteria and tweak weights, or rewrite from
   scratch. Add project-specific fatal rules below the criteria table.

7. **Upload a small CSV** (5–10 rows) at
   http://localhost:3000/upload, map the columns, and import.

8. **Score it** — go to http://localhost:3000/results and click "Score N
   pending."

9. **Review the scores** at http://localhost:3000/results and
   http://localhost:3000/review-queue.

---

## QA engine setup recipes

### AWS Bedrock (recommended while AWS credits last)

Settings → QA engine provider:

- Provider: **AWS Bedrock**
- AWS Bedrock Bearer token: paste your `AWS_BEARER_TOKEN_BEDROCK`
- AWS Region: `us-east-1` (or wherever your access is enabled)
- Model: leave blank for Claude 3.5 Sonnet default
  - Alternatives: `us.amazon.nova-pro-v1:0`,
    `us.meta.llama3-3-70b-instruct-v1:0`
- Save.

If you also want the Knowledge tab (RAG), tick **"Use a separate API key
for embeddings"** below and paste an OpenAI key — Bedrock doesn't expose
an OpenAI-compatible embeddings endpoint.

### OpenRouter (one key, many models)

Settings → QA engine provider:

- Provider: **OpenRouter**
- API key: paste `sk-or-v1-…` from openrouter.ai
- Base URL: leave blank (defaults to `https://openrouter.ai/api/v1`)
- Model: `openai/gpt-4o-mini` (cheap) or `anthropic/claude-3.5-sonnet`
  (better for nuanced QA)
- Save.

### Anthropic Claude direct

Settings → QA engine provider:

- Provider: **Custom**
- API key: paste your `sk-ant-…` from console.anthropic.com
- Base URL: `https://api.anthropic.com/v1/`
- Model: `claude-3-5-sonnet-20241022`
- Save.

### Google Gemini Flash (good free option)

Settings → QA engine provider:

- Provider: **Custom**
- API key: paste your key from Google AI Studio
- Base URL: `https://generativelanguage.googleapis.com/v1beta/openai/`
- Model: `gemini-2.0-flash-exp`
- Save.

---

## Switching to "clean slate" for a demo

Before a customer demo or before moving from test data into production:

1. Sign in as admin.
2. Settings → scroll to the bottom → **Danger zone**.
3. Click **Reset workspace…**
4. Type `RESET` in the confirmation box.
5. Click **Yes, wipe operational data**.

This wipes all conversations, scores, review-queue items, and
knowledge-base documents. It keeps your rubric, fatal rules, QA-engine
credentials, team members, billing history, and report templates.
