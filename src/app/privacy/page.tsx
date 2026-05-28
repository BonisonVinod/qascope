import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — QAScope",
  description: "QAScope Privacy Policy. How we collect, use, and protect your data.",
};

const EFFECTIVE_DATE = "28 May 2026";
const COMPANY = "QAScope";
const CONTACT_EMAIL = "privacy@qascope.app";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-zinc-900 dark:text-white">Privacy Policy</h1>
        <p className="mt-2 text-sm text-zinc-500">Effective date: {EFFECTIVE_DATE}</p>

        <div className="prose prose-zinc dark:prose-invert mt-10 max-w-none text-sm leading-relaxed">

          <h2>1. Who We Are</h2>
          <p>
            {COMPANY} ("we", "us", "our") is a B2B SaaS platform for AI-powered QA of customer support
            conversations. This Privacy Policy explains how we collect, use, disclose, and protect information
            when you use our Service. By using the Service, you agree to this policy.
          </p>

          <h2>2. Information We Collect</h2>
          <h3>2a. Account Information</h3>
          <ul>
            <li>Name, email address, and role (collected at sign-up or team invite)</li>
            <li>Organisation name and industry (provided by workspace admin)</li>
            <li>Authentication tokens (managed by Supabase Auth)</li>
          </ul>

          <h3>2b. Conversation Data</h3>
          <ul>
            <li>Customer support transcripts uploaded by your organisation</li>
            <li>Agent names, customer IDs, and conversation metadata you provide</li>
            <li>AI-generated quality scores, criterion breakdowns, and coaching notes</li>
          </ul>

          <h3>2c. Usage and Technical Data</h3>
          <ul>
            <li>API call logs (LLM token counts, costs) for billing and usage display</li>
            <li>Page views and feature usage (via Vercel Analytics, anonymised)</li>
            <li>Error logs (via Sentry, if enabled) — never includes transcript content</li>
            <li>IP addresses and browser metadata for security purposes</li>
          </ul>

          <h3>2d. Payment Data</h3>
          <p>
            Payment information is processed directly by Razorpay. We do not store card numbers or
            banking details. We receive subscription status and transaction IDs only.
          </p>

          <h2>3. How We Use Your Data</h2>
          <ul>
            <li><strong>Provide the Service:</strong> scoring, review queue, reports, alerts</li>
            <li><strong>Billing:</strong> seat counting, plan management via Razorpay</li>
            <li><strong>Security:</strong> fraud detection, access control, audit logging</li>
            <li><strong>Support:</strong> diagnosing bugs and responding to support requests</li>
            <li><strong>Product improvement:</strong> anonymised aggregate usage patterns only</li>
          </ul>
          <p>We do <strong>not</strong> sell your data to third parties or use it to train AI models.</p>

          <h2>4. Data Isolation (Multi-Tenant)</h2>
          <p>
            Each organisation's data is stored in a logically isolated workspace using Supabase Row-Level
            Security (RLS). Your conversation transcripts, scores, and user data are not accessible to other
            organisations on the platform.
          </p>

          <h2>5. AI Processing</h2>
          <p>
            On paid plans, conversation transcripts are sent to the AI provider whose API key you configure
            (e.g. OpenAI, Groq, OpenRouter). You control which provider processes your data. Review that
            provider's privacy policy before configuring their key.
          </p>
          <p>
            We send data to AI providers solely to generate QA scores and coaching notes. We do not retain
            transcripts at the AI provider level — data is sent per request and not stored by us outside
            your Supabase workspace.
          </p>

          <h2>6. Data Retention</h2>
          <ul>
            <li>Active subscriptions: data retained for the duration of the subscription</li>
            <li>After cancellation: data retained for 30 days, then permanently deleted</li>
            <li>You can request immediate deletion by emailing {CONTACT_EMAIL}</li>
            <li>Backups may persist for up to 7 additional days after deletion</li>
          </ul>

          <h2>7. Third-Party Services</h2>
          <table>
            <thead>
              <tr><th>Service</th><th>Purpose</th><th>Data shared</th></tr>
            </thead>
            <tbody>
              <tr><td>Supabase</td><td>Database & Auth</td><td>All user + conversation data</td></tr>
              <tr><td>Vercel</td><td>Hosting & Edge</td><td>Request logs, IP addresses</td></tr>
              <tr><td>Razorpay</td><td>Payments</td><td>Email, subscription amounts</td></tr>
              <tr><td>Resend</td><td>Email alerts</td><td>Email address, alert content</td></tr>
              <tr><td>Your AI provider</td><td>Scoring</td><td>Conversation transcripts</td></tr>
            </tbody>
          </table>

          <h2>8. Security</h2>
          <ul>
            <li>All data in transit encrypted via TLS 1.2+</li>
            <li>AI API keys encrypted at rest using Supabase's encrypted storage</li>
            <li>Row-Level Security enforced at the database level for all tables</li>
            <li>Authentication via Supabase Auth (bcrypt password hashing)</li>
            <li>Webhook tokens are cryptographically random 32-byte secrets</li>
          </ul>

          <h2>9. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the right to:</p>
          <ul>
            <li><strong>Access:</strong> request a copy of data we hold about you</li>
            <li><strong>Correction:</strong> update inaccurate personal data</li>
            <li><strong>Deletion:</strong> request erasure of your personal data</li>
            <li><strong>Portability:</strong> receive your data in a machine-readable format (CSV export available in Reports)</li>
            <li><strong>Objection:</strong> object to certain processing activities</li>
          </ul>
          <p>
            To exercise any of these rights, email {CONTACT_EMAIL}. We will respond within 30 days.
          </p>

          <h2>10. Cookies</h2>
          <p>
            We use only strictly necessary cookies for authentication session management. We do not use
            advertising, tracking, or analytics cookies. No consent banner required.
          </p>

          <h2>11. Children</h2>
          <p>
            The Service is not directed at children under 18. We do not knowingly collect data from minors.
          </p>

          <h2>12. Changes to This Policy</h2>
          <p>
            We may update this policy from time to time. Material changes will be notified by email at least
            14 days in advance. The current version is always available at this URL.
          </p>

          <h2>13. Contact</h2>
          <p>
            Privacy questions or requests:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>
        </div>
      </div>
    </div>
  );
}
