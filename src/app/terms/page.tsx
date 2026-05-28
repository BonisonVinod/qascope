import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — QAScope",
  description: "QAScope Terms of Service. Read before using the platform.",
};

const EFFECTIVE_DATE = "28 May 2026";
const COMPANY = "QAScope";
const CONTACT_EMAIL = "legal@qascope.app";

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Terms of Service</h1>
        <p className="mt-2 text-sm text-zinc-500">Effective date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-zinc dark:prose-invert mt-10 max-w-none text-sm leading-relaxed">

          <h2>1. Agreement to Terms</h2>
          <p>
            By accessing or using {COMPANY} ("the Service"), you agree to be bound by these Terms of Service
            ("Terms"). If you do not agree, do not use the Service. These Terms apply to all users including
            workspace administrators, QA managers, team leads, reviewers, and viewers.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            {COMPANY} is a B2B SaaS platform that uses artificial intelligence to score and analyse customer
            support conversations. The Service allows organisations ("Clients") to upload conversation
            transcripts, configure scoring rubrics, review AI-generated quality scores, manage team members,
            and generate QA reports.
          </p>

          <h2>3. Accounts and Workspaces</h2>
          <ul>
            <li>You must provide accurate information when creating an account.</li>
            <li>Each organisation operates within an isolated workspace. You are responsible for all activity in your workspace.</li>
            <li>You must not share account credentials. Each user must have their own login.</li>
            <li>You are responsible for maintaining the security of your account password.</li>
            <li>Notify us immediately at {CONTACT_EMAIL} if you suspect unauthorised access.</li>
          </ul>

          <h2>4. Bring Your Own API Key (BYOK)</h2>
          <p>
            On paid plans, you provide your own AI provider API key (OpenAI, Groq, OpenRouter, etc.).
            You are solely responsible for:
          </p>
          <ul>
            <li>The cost of AI provider API calls made through your key.</li>
            <li>Compliance with your AI provider's terms of service.</li>
            <li>Keeping your API key confidential. {COMPANY} stores keys encrypted and never logs them in plaintext.</li>
          </ul>

          <h2>5. Data and Privacy</h2>
          <ul>
            <li>You retain ownership of all conversation transcripts and data you upload.</li>
            <li>{COMPANY} processes your data solely to provide the Service.</li>
            <li>Conversation data is isolated per workspace — other clients cannot access your data.</li>
            <li>We may use anonymised, aggregated data to improve the Service.</li>
            <li>See our <a href="/privacy">Privacy Policy</a> for full details.</li>
          </ul>

          <h2>6. Acceptable Use</h2>
          <p>You must not:</p>
          <ul>
            <li>Upload content that is illegal, defamatory, or infringes third-party rights.</li>
            <li>Attempt to access another client's workspace or data.</li>
            <li>Use the Service to train competing AI models without written consent.</li>
            <li>Reverse engineer, decompile, or disassemble the Service.</li>
            <li>Exceed API rate limits or attempt to overload the Service.</li>
            <li>Use the Service to process data of individuals without appropriate consent.</li>
          </ul>

          <h2>7. Billing and Payment</h2>
          <ul>
            <li>Pricing is per-seat per month using a retroactive volume discount model.</li>
            <li>Payment is processed via Razorpay. By subscribing you agree to Razorpay's terms.</li>
            <li>Seats are counted as active users plus pending invitations in your workspace.</li>
            <li>Plans auto-renew monthly. Cancel at any time; access continues to end of billing period.</li>
            <li>Refunds are not provided for partial billing periods except where required by law.</li>
          </ul>

          <h2>8. Intellectual Property</h2>
          <p>
            {COMPANY} and its licensors own all rights to the Service, including software, design, and
            trademarks. You are granted a limited, non-exclusive, non-transferable licence to use the Service
            during your subscription. You retain all rights to your data.
          </p>

          <h2>9. Limitation of Liability</h2>
          <p>
            To the maximum extent permitted by applicable law, {COMPANY} shall not be liable for any indirect,
            incidental, special, or consequential damages arising from your use of the Service, including but
            not limited to loss of profits, data loss, or business interruption. Our total liability to you
            shall not exceed the amount you paid us in the 3 months preceding the claim.
          </p>
          <p>
            AI-generated scores are advisory only. You are solely responsible for any employment, performance,
            or business decisions made based on QA scores.
          </p>

          <h2>10. Disclaimers</h2>
          <p>
            The Service is provided "as is" without warranty of any kind. We do not warrant that the Service
            will be error-free, uninterrupted, or that AI-generated scores will be accurate in all cases.
          </p>

          <h2>11. Termination</h2>
          <p>
            Either party may terminate the subscription at any time. We may suspend or terminate your access
            if you violate these Terms. On termination, your data will be retained for 30 days then deleted,
            unless you request earlier deletion.
          </p>

          <h2>12. Governing Law</h2>
          <p>
            These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive
            jurisdiction of the courts of Bengaluru, Karnataka, India.
          </p>

          <h2>13. Changes to Terms</h2>
          <p>
            We may update these Terms at any time. Material changes will be notified by email or in-app notice
            at least 14 days before they take effect. Continued use after the effective date constitutes acceptance.
          </p>

          <h2>14. Contact</h2>
          <p>
            Questions about these Terms? Email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
          </p>
        </div>
      </div>
    </div>
  );
}
