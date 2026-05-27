# QAScope Brand Guide

The visual and verbal identity for QAScope. Use this document whenever
something user-facing gets written, designed, or shipped — marketing pages,
the product itself, decks, emails, contracts, demo videos.

---

## 1. The one-line positioning

> **QAScope is the QA copilot for BPOs.**
> AI-driven quality assurance for customer conversations — faster, fairer,
> and consistent across every agent.

We don't sell "AI." We sell *audit quality at scale*. The AI is plumbing.

---

## 2. Colour system

The palette is built around a single brand accent (teal), plus zinc as the
workhorse neutral and three semantic colours for status feedback.

| Role | Token | Hex | Used for |
| --- | --- | --- | --- |
| Brand primary | teal-700 | `#0F766E` | Logo, primary CTAs, active-nav indicator |
| Brand light | teal-500 | `#14B8A6` | Hover states, accent highlights, dark-mode primary |
| Brand dark | teal-900 | `#134E4A` | Headers on light backgrounds, dark accents |
| Neutral base | zinc-900 | `#18181B` | Body text, primary buttons (kept as default for readability) |
| Neutral surface | zinc-50 / zinc-900 | `#FAFAFA` / `#18181B` | Page backgrounds (light / dark) |
| Success | emerald-600 | `#059669` | "Final" status, success toasts, override-confirmed badge |
| Warning | amber-500 | `#F59E0B` | "Needs review" status, stalled progress, "approaching limit" |
| Danger | red-600 | `#DC2626` | "Critical fail" status, error toasts, Danger zone CTA |

**Light mode** — white background, zinc-900 text, teal-700 brand accents.
**Dark mode** — zinc-950 background, zinc-100 text, teal-500 brand accents.

### When to use teal vs zinc for buttons

- **Primary CTA in a feature flow** (Upload, Score, Save, Apply) → keep
  `bg-zinc-900` for now. It's the most legible button and we already use
  it everywhere. Don't change unless we ship a deliberate visual rebrand.
- **Brand surface** (sidebar logo, active nav, decorative dot, marketing
  page) → use teal-700 (or teal-500 in dark mode).
- **Status pills, badges, status fills** → use the semantic colours above,
  never teal.

Why this split: changing every primary button to teal at once is a visual
rewrite that risks bugs. Putting teal in the **brand surfaces** (logo,
nav, marketing) gives us a recognisable brand without churning the app.

---

## 3. Typography

- **Sans family:** Geist (already bundled). Fallback: Inter, system-ui,
  Helvetica, Arial.
- **Mono family:** Geist Mono. Used for IDs, API keys, code snippets, raw
  conversation transcripts.
- **Brand wordmark:** "QAScope" in Geist Bold, with the **QA** in
  teal-700 and **Scope** in zinc-900. This is the canonical logo
  treatment.

### Type scale

| Use | Size / Weight |
| --- | --- |
| Page title | text-2xl, semibold |
| Section heading | text-sm, medium, uppercase, tracking-wider, zinc-500 |
| Body | text-sm |
| Helper / hint | text-xs, zinc-500 |
| KPI number | text-4xl, bold |

---

## 4. Logo

Wordmark — text-only, lowercase emphasis on **QA** in teal. Stored at
`public/qascope-logo.svg`.

There's no separate icon mark yet. For a square icon (favicon, app icon),
use the **monogram "QS"** in teal on a white square, with rounded
corners. We'll commission a proper icon set before launch.

**Don'ts:**
- Don't put a gradient on the logo.
- Don't tilt or stretch the wordmark.
- Don't use the word "AI" anywhere in or near the logo. Our brand
  promise is QA, not AI.

---

## 5. Voice and tone

- **Plain, confident, not corporate.** "Score this many?" not "Please
  confirm scoring action." We're talking to busy ops managers, not
  procurement.
- **Specific over fluffy.** Numbers and durations beat adjectives.
  "Email support, within 24 hours" beats "Priority support."
- **Honest about what's automated and what isn't.** "QAScope reads the
  conversation; a human confirms when QA isn't sure." Never imply the AI
  replaces the auditor.
- **Use "QA engine" for the AI provider in copy.** Never "AI" in
  user-facing strings. "AI" is internal/marketing-only.

---

## 6. Iconography & illustration

- Outline icons in the zinc-500 / zinc-700 family, 1.5px stroke.
  Lucide Icons is the default set if we ever pull one in.
- No drawings of robots, gears, or chat bubbles in the UI. Reserve those
  for marketing only.

---

## 7. Where the brand is applied

| Surface | Brand element |
| --- | --- |
| Sidebar header | Wordmark with teal QA |
| Active nav link | Left border + soft teal-50 background |
| Login page header | Wordmark, centered, teal QA |
| Email templates | Header bar in teal-700 |
| PDF/CSV exports | Header row "QAScope —" in teal |
| Favicon | QS monogram, teal on white |

---

## 8. The single rule, if you forget everything else

> Teal for brand. Zinc for product. Semantic colours for status.
