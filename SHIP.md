# SHIP.md — Step-by-step deployment guide

This walks you through getting QAScope live on the internet. Written for someone who has never deployed an app before. Copy-paste the commands exactly as shown.

You'll need about **45 minutes** the first time. Subsequent deploys are automatic — you just push code and Vercel rebuilds.

---

## Before you start: things you need

- A Windows laptop (these instructions assume Windows)
- A GitHub account — free at https://github.com/signup
- A Vercel account — free at https://vercel.com/signup (sign in with your GitHub account)
- Your existing Supabase project (already set up)
- Your `.env.local` file (already in `qascope` folder with real keys)

---

## Step 0 — Install Git (skip if already installed)

**Check if Git is installed:**

1. Press the **Windows key** on your keyboard
2. Type `cmd` and press Enter — a black window opens (this is the **Command Prompt**)
3. In that black window, type this and press Enter:

```
git --version
```

If you see something like `git version 2.40.x`, you're good. **Skip to Step 1.**

If you see "command not found" or "is not recognized":

1. Go to https://git-scm.com/download/win
2. Click the download. Run the installer. Click Next on every screen — defaults are fine.
3. Close the Command Prompt and open a new one. Type `git --version` again. It should work now.

---

## Step 1 — Open Command Prompt in your project folder

1. Press the **Windows key**, type `cmd`, press Enter
2. In the black window, copy-paste this exactly (including the quotes) and press Enter:

```
cd "C:\Users\Bonison Vinod\AI QA Copilot\qascope"
```

The prompt should now show `C:\Users\Bonison Vinod\AI QA Copilot\qascope>` at the start of the line. That means you're "in" the project folder.

> The `cd` command means "change directory" — it tells the terminal which folder you're working in.

---

## Step 2 — Confirm tests pass

In the same black window, type and press Enter:

```
npm test
```

Wait ~30 seconds. **What you should see at the end:**

```
# tests 97
# pass 97
# fail 0
```

If you see `fail 0`, you're good. If anything shows `fail 1` or higher, stop and tell me — something's broken and we need to fix it before deploying.

---

## Step 3 — Confirm production build works

Still in the same window:

```
npm run build
```

This takes 1–2 minutes. **What you want to see at the end:**

```
✓ Compiled successfully
```

Or some "Generating static pages" lines followed by "Done in Xs". As long as there's **no red text saying "Error"** at the end, you're good.

If you see red errors, copy the entire error message and send it to me.

---

## Step 4 — One-time Git setup (only first time ever using Git)

In the same window, run these three commands one at a time, replacing the placeholders with your actual name and email:

```
git config --global user.name "Your Real Name"
```

```
git config --global user.email "your-email@example.com"
```

```
git config --global init.defaultBranch main
```

These tell Git who you are. Each one shows no output if it worked — that's normal.

---

## Step 5 — Create a Git repo for QAScope

Still in the project folder:

```
git init
```

You should see something like `Initialized empty Git repository...`

Then:

```
git add -A
```

This stages every file in the project to be committed. Should show no output.

Then:

```
git commit -m "QAScope MVP — 97 tests, 6 migrations, ready for friends"
```

You'll see a list of files being added (probably 100+ lines). The last line shows something like `97 files changed, 8500 insertions(+)`. That's success.

---

## Step 6 — Verify your secret keys are NOT being uploaded

This is critical. Run:

```
git ls-files | findstr ".env"
```

**You want to see ONLY `.env.local.example`** (and maybe nothing else). If you see `.env.local` listed — STOP. Your real OpenAI and Supabase keys would leak to GitHub. Tell me before pushing.

If you only see `.env.local.example` (or nothing), you're safe. Continue.

---

## Step 7 — Create a private GitHub repo

1. Go to https://github.com/new
2. **Repository name:** `qascope`
3. **Description:** "AI QA copilot for BPOs — private beta"
4. **Pick "Private"** (very important — keeps your code private)
5. **Do NOT** tick "Add README", "Add .gitignore", or "Add license" — your project already has those
6. Click the green **Create repository** button

GitHub now shows you a page with commands. **Ignore most of them.** You only need the two lines under the "…or push an existing repository from the command line" section. They look like:

```
git remote add origin https://github.com/YOUR-USERNAME/qascope.git
git branch -M main
git push -u origin main
```

Copy those three lines into your Command Prompt window and run them one at a time.

When you run the third (`git push`) the first time, a window may pop up asking you to log in to GitHub. Use your GitHub account.

After it finishes, refresh the GitHub page — you should now see all your project files listed.

---

## Step 8 — Deploy to Vercel

1. Go to https://vercel.com/new
2. If asked, sign in with your GitHub account and authorize Vercel to see your repos
3. You'll see a list of your GitHub repos. Find `qascope` and click **Import**
4. **Framework preset:** should auto-detect as **Next.js** (don't change)
5. **Root directory:** leave as `./` (default)
6. **Don't click Deploy yet.** Scroll to **Environment Variables** and click to expand it

You're going to copy 5 entries from your `.env.local` file. Open `.env.local` in Notepad (right-click the file → Open with → Notepad) so you can see the values.

For each of these 5 keys, click "Add Another", enter the **Name** on the left and paste the **Value** on the right:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | the URL value from .env.local |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the long anon key value |
| `SUPABASE_SERVICE_ROLE_KEY` | the long service role key value |
| `OPENAI_API_KEY` | the value starting with `sk-proj-` |
| `OPENAI_MODEL` | type `gpt-4o-mini` |

Make sure each one shows **all three checkboxes ticked** (Production, Preview, Development).

7. Click the big **Deploy** button. Wait 2–3 minutes.

When it finishes, you'll see "🎉 Congratulations" and a clickable URL like `qascope-abc123.vercel.app`. **Open that URL** — you should see the QAScope login page.

---

## Step 9 — Tell Supabase about your live URL

Supabase needs to know your live URL exists, otherwise sign-up emails won't work.

1. Go to your Supabase project dashboard
2. Click **Authentication** in the left sidebar
3. Click **URL Configuration**
4. In **Site URL**, replace `http://localhost:3000` with your Vercel URL (e.g. `https://qascope-abc123.vercel.app`)
5. In **Redirect URLs**, click "Add URL" and paste the same URL with `/**` at the end (e.g. `https://qascope-abc123.vercel.app/**`)
6. Click **Save**

---

## Step 10 — Verify all 7 SQL migrations are applied to production

In the Supabase dashboard:

1. Click **SQL Editor** (left sidebar)
2. Click **New query** (top-right)
3. Copy-paste this exactly into the empty editor:

```sql
select 'qa_scores has original_total_score' as check, count(*) as ok from information_schema.columns where table_name='qa_scores' and column_name='original_total_score'
union all select 'clients has pass_threshold', count(*) from information_schema.columns where table_name='clients' and column_name='pass_threshold'
union all select 'invitations exists', count(*) from information_schema.tables where table_name='invitations'
union all select 'fatal_rules exists', count(*) from information_schema.tables where table_name='fatal_rules'
union all select 'report_templates exists', count(*) from information_schema.tables where table_name='report_templates'
union all select 'user_role has qa_reviewer', count(*) from pg_enum e join pg_type t on t.oid=e.enumtypid where t.typname='user_role' and e.enumlabel='qa_reviewer';
```

4. Click **Run** (or press Ctrl+Enter)

**Every row should show `ok = 1`.** If any row shows `ok = 0`, that migration didn't run. Look at the row's name and run the matching SQL file from the `qascope/supabase/` folder. The mapping is:

- `qa_scores has original_total_score` → run `002_two_tier_review.sql`
- `clients has pass_threshold` → run `003_pass_threshold.sql`
- `user_role has qa_reviewer` → run `004a_user_role_enum.sql` **alone in its own tab first**
- `invitations exists` → run `004_invitations.sql`
- `fatal_rules exists` → run `005_fatal_rules.sql`
- `report_templates exists` → run `006_report_templates.sql`

Re-run the check after fixing — all 6 rows should show `ok = 1`.

---

## Step 11 — Smoke-test the live URL

Now test the deployed app **as if you were a new user**:

1. Open your Vercel URL in an **Incognito / Private** browser window (Ctrl+Shift+N in Chrome). This makes sure you're not accidentally signed in from your dev work.
2. Click **Sign up**. Use a fresh email (a Gmail alias works — `your-email+test@gmail.com`).
3. Confirm the email if Supabase sends one (check spam folder).
4. Sign in. You should land on `/dashboard`.
5. Go to `/upload`. Click the upload area. Pick `qascope/test-data/sample-conversations.csv` from your laptop.
6. Confirm the column-mapping wizard auto-detects all the fields. Click **Upload**.
7. Go to `/results`. Click **Score 25 pending**. Wait 2 minutes (it takes time — each row makes 7 OpenAI calls).
8. Click again — second batch of 25. Repeat until "Nothing to score" appears (that's after ~8 minutes for the full 100 rows).
9. Visit `/dashboard` — KPIs should populate.
10. Visit `/review-queue` — should show flagged conversations.
11. Visit `/reports` — should show this week's scores.

If any of these break, tell me what step + what you saw.

---

## Step 12 — Set an OpenAI usage cap

This protects you from a runaway bill.

1. Go to https://platform.openai.com/settings/organization/limits
2. Set a **monthly hard limit** of **$10** (₹830) for the pilot
3. Set an **email notification threshold** of $5

That's plenty for a 3-friend pilot at ~₹0.05 per scored conversation. If you go over $5, OpenAI emails you. At $10, scoring stops automatically until next month.

---

## Step 13 — Send your first invite

You're live. Time to actually use it.

1. Open `qascope/PITCH.md` on your laptop
2. Copy the **WhatsApp message** block
3. Paste it to your most blunt friend along with your Vercel URL
4. Ask them when they have 30 minutes for a screenshare

When they try the product, **don't help them.** Watch silently and note where they get stuck. That's where the real product feedback is.

---

## Future deploys

After this first setup, deploying changes is just:

```
git add -A
git commit -m "fixed bug X"
git push
```

Vercel sees the push and rebuilds + redeploys automatically in ~2 minutes. The live URL stays the same.

---

## When something breaks

| Problem | What to do |
|---|---|
| `npm test` shows failures | Send me the last 30 lines of output |
| `npm run build` shows errors | Send me the full error block |
| `git push` fails with auth error | The login window may have closed too fast — try again, log in to GitHub |
| Vercel deploy fails | Click **View build logs**, screenshot or copy the red error |
| Live URL shows "Internal Server Error" | Check Vercel logs (Project → your latest deploy → Functions → click any function → Logs). Most likely cause: a missing env var |
| Sign-up email never arrives | Supabase Auth → URL Configuration must include your Vercel URL with `/**` at the end |
| Scoring never completes | OpenAI key wrong, or Supabase migrations not applied — check Step 10 |
| "qa_reviewer" enum error | You skipped Step 10 — run `004a_user_role_enum.sql` first, then `004_invitations.sql` in a fresh tab |

---

## You're done

If Step 11 worked, you have a live, multi-tenant, properly-isolated AI QA tool deployed on the internet. Friends can sign up, upload their own CSV, and use it. Their workspace is invisible to yours and vice versa.

Total cost so far: ₹0 (Vercel free tier, Supabase free tier, OpenAI charges per-conversation).

Now go invite the first friend. Good luck.
