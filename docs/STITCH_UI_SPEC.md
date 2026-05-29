# Google Stitch: Landing Page UI Specification

Use this specification to build the **QAScope "Audit the Unreviewed 95%"** high-converting landing page inside **Google Stitch**. Stitch will render these blocks using the brand values, colors, and fonts established in your Pomelli Business DNA.

---

## 1. Visual & Layout Tokens (Seeded from Pomelli DNA)
* **Background Mode:** `Strict Dark Mode`
* **Primary Canvas Background:** `#09090B` (Zinc-950)
* **Interactive Cards & Surfaces:** `#18181B` (Zinc-900)
* **Accent Accent / Glows:** `#14B8A6` (Teal-500)
* **Borders:** `#27272A` (Zinc-800 - thin 1px lines)
* **Grid Alignment:** Centered Max Width: `1280px` (with generous margin breathing room)

---

## 2. Page Hierarchy & Component Wireframe (Top to Bottom)

### Block 1: Floating Navigation Header (Glassmorphic)
* **Layout:** Flex row, justify-between, items-center. Sticky top position with `backdrop-filter: blur(12px)`.
* **Left Element:** Wordmark Logo
  - Text: `QA` in Bold Teal (`#14B8A6`), `Scope` in White (`#FFFFFF`).
* **Center Element:** Horizontal Navigation Links
  - Links: `The 5% Problem`, `Interactive ROI`, `How it Works`, `Pricing`.
  - Style: Zinc-400 text, transition hover to Teal-400.
* **Right Element:** High-Contrast CTA
  - Text: `Start Free Trial` (Teal background, black text, subtle button glow shadow).

---

### Block 2: Hero Section (The Hook)
* **Layout:** Centered single column, padding-y `80px` to `120px`.
* **Top Accent:** Capsule pill badge
  - Border: Teal-500/20. Background: Teal-950/40.
  - Text: `🇮🇳 India's First Ex-Operator Built AI QA Platform`
* **Main Heading (H1):** 
  - Text: `"Stop Sampling. Audit the Unreviewed 95%."`
  - Style: Extra-bold, gradient from White to Zinc-400. Font size 48px to 64px.
* **Sub-Heading:** 
  - Text: `"Traditional manual QA leaves 95% of customer conversations unread. QAScope scores 100% of your voice, email, and chat logs against your compliance rubric overnight. Starting at ₹6,999/month, Bring Your Own Key."`
  - Style: Zinc-400, max-width 640px.
* **CTA Buttons:** 
  - Button A: `Book a 15-Min Walkthrough` (Teal-500 background, bold black text).
  - Button B: `Use Sample Data` (Zinc-900 background, zinc-200 text, 1px border).

---

### Block 3: The "5% vs 100%" Split Visualizer
* **Layout:** Two-column grid, high visual contrast.
* **Left Column: Legacy Manual QA (The Risk)**
  - Card Style: Muted zinc background, red warning border.
  - Header: `5% Random Sampling`
  - Content: Simulates a grid of 100 tiny cards (representing calls). 5 are highlighted in Teal (Reviewed). 95 are dark and grayed out (Unreviewed).
  - Footer Alert: `"95% of compliance errors, regulatory escapes, and coaching opportunities go completely undetected."` (Red accent text).
* **Right Column: QAScope Auditing (The Security)**
  - Card Style: Deep zinc background, glowing teal border (`rgba(20, 184, 166, 0.2)`).
  - Header: `100% Automated Scoring`
  - Content: Simulates the same grid of 100 cards. **All 100 cards are active, green, and glowing.**
  - Footer Alert: `"Complete coverage. Compliance violations flagged instantly. Agent coaching cards generated every morning."` (Teal accent text).

---

### Block 4: Interactive Rupee ROI Calculator
* **Layout:** Single column card layout.
* **Title:** `"Calculate Your Operational Savings"`
* **Sliders (Interactive Input Controls):**
  1. **Campaign Size (Agents):** Slider range `10` to `500` agents (Default: `50`).
  2. **Total Conversations per Month:** Slider range `5,000` to `200,000` (Default: `22,000`).
  3. **QA Auditor Headcount:** Slider range `1` to `50` (Default: `5`).
  4. **QA Salary (per month):** Slider range `₹25,000` to `₹60,000` (Default: `₹35,000`).
* **Savings Display Panel (Outputs):**
  - **Your Current QA Spend:** `₹[Auditors * Salary] / mo`
  - **QAScope Spend (BYOK):** `₹[Seats * 1450 + Tokens * 0.20] / mo` (Assume 2 seats for 50 agents).
  - **Net Monthly Savings:** `₹[Spend Difference] / mo` (Rendered in giant Teal-500 text).

---

### Block 5: Live Auditing Mockup Section
* **Layout:** Centered two-column section.
* **Left Column:** Live interactive transcript card.
  - Displays a simulated customer-agent conversation transcript with marked up tags.
  - Highlighting a fatal rule fail (e.g., skips DOB verification).
* **Right Column:** QAScope QA Score Card.
  - Displays QA score: `48/100` (Red warning text).
  - Highlighted Criteria fails: `PII Verification: FAILED (CRITICAL RULE TRIGGERED)`.
  - Coaching note: `"Agent handled the loan collections discussion professionally but failed to verify customer date of birth prior to sharing balance details. Immediate feedback required."`

---

### Block 6: Pricing and "Bring Your Own Key" (BYOK) Explained
* **Layout:** 3-column grid showing Starter, Growth, and Scale plans, plus a dedicated side banner explaining BYOK.
* **BYOK Callout Box:**
  - Style: Glassmorphic panel with deep teal glow.
  - Content: `"Why is QAScope 10x cheaper? We don't mark up LLM tokens. You input your own OpenAI or OpenRouter API key. You pay the raw provider cost (~₹0.20 per audit) directly, saving Lakhs in middleman markups."`

---

### Block 7: High-Converting CTA & Calendar Booking
* **Layout:** Centered dark-zinc panel with a large prominent CTA form.
* **Form Inputs:** Name, Work Email, BPO Campaign Type, Volume estimate.
* **Submit CTA:** `Request 30-Min Walkthrough on Your Data` (Glow button).
