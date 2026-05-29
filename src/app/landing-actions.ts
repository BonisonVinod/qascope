"use server";

import { sendEmail, fromEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";

type DemoRequestInput = {
  name: string;
  email: string;
  bpoType: string;
  agentCount: number;
};

export async function submitDemoRequest(input: DemoRequestInput) {
  const { name, email, bpoType, agentCount } = input;

  if (!name || !email || !bpoType || !agentCount) {
    return { error: "All fields are required" };
  }

  try {
    // 1. Log the lead in the Supabase database
    // We can insert into a demo_requests table if it exists, but to ensure
    // zero database errors, we can write directly to our super admin email 
    // and log the event server-side.
    console.log(`[landing-actions] Demo Request from ${name} (${email}):`, {
      bpoType,
      agentCount,
    });

    // 2. Fetch all super admin emails from the database to notify them!
    const admin = createAdminClient();
    const { data: superAdmins } = await admin
      .from("users")
      .select("email")
      .eq("is_super_admin", true);

    const adminEmails = (superAdmins ?? []).map((sa) => sa.email).filter(Boolean);
    
    // Fallback notification target: the environment fromEmail address
    const notifyTarget = adminEmails.length > 0 ? adminEmails : [fromEmail];

    // 3. Send Notification Email to Super Admins / Platform Owner
    const adminHtmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; rounded-lg: 8px;">
        <h2 style="color: #0d9488; margin-top: 0;">🚀 New QAScope Demo Lead!</h2>
        <p style="color: #71717a; font-size: 14px;">A new call center has requested a 30-minute private walkthrough pilot:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; border-b: 1px solid #f4f4f5; color: #18181b;">Full Name:</td>
            <td style="padding: 8px 0; border-b: 1px solid #f4f4f5; color: #52525b;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; border-b: 1px solid #f4f4f5; color: #18181b;">Work Email:</td>
            <td style="padding: 8px 0; border-b: 1px solid #f4f4f5; color: #52525b; font-family: monospace;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; border-b: 1px solid #f4f4f5; color: #18181b;">Campaign Vertical:</td>
            <td style="padding: 8px 0; border-b: 1px solid #f4f4f5; color: #52525b;">${bpoType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; border-b: 1px solid #f4f4f5; color: #18181b;">Agent Count:</td>
            <td style="padding: 8px 0; border-b: 1px solid #f4f4f5; color: #52525b; font-weight: bold;">${agentCount} agents</td>
          </tr>
        </table>
        <p style="color: #71717a; font-size: 12px; margin-top: 25px;">Please reach out to the lead within 24 hours to schedule their onboarding slot.</p>
      </div>
    `;

    await sendEmail({
      to: notifyTarget,
      subject: `[QAScope Lead] Demo Request: ${name} (${agentCount} Agents)`,
      html: adminHtmlBody,
    });

    // 4. Send Confirmation Email to the BPO Manager Lead
    const clientHtmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; rounded-lg: 8px;">
        <h2 style="color: #0d9488; margin-top: 0;">Welcome to QAScope, ${name}!</h2>
        <p style="color: #18181b; font-size: 14px; line-height: 1.5;">We have successfully received your request for a private **30-minute BPO pilot walkthrough** for your **${bpoType}** campaign.</p>
        <p style="color: #18181b; font-size: 14px; line-height: 1.5;">Here is what happens next:</p>
        <ol style="color: #52525b; font-size: 14px; line-height: 1.6; padding-left: 20px;">
          <li>One of our operations calibrators will review your BPO campaign requirements.</li>
          <li>We will reach out to you within 24 hours at <strong>${email}</strong> to schedule a direct Google Meet.</li>
          <li>On the call, we will calibrate your custom SOP rubric, upload a test batch of your call transcripts, and review your live 100% automated scoring console together.</li>
        </ol>
        <p style="color: #18181b; font-size: 14px; line-height: 1.5; margin-top: 20px;">If you want to bypass the demo and try the platform yourself immediately, you can register for an account here: <a href="https://qascope-sdiz.vercel.app/signup" style="color: #0d9488; text-decoration: underline; font-weight: bold;">Start My Free Trial</a></p>
        <hr style="border: 0; border-top: 1px solid #f4f4f5; margin: 25px 0;" />
        <p style="color: #71717a; font-size: 11px; text-align: center;">© 2026 QAScope Inc. All rights reserved. Ex-operator built call center AI solutions.</p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `Your QAScope Pilot Request Received!`,
      html: clientHtmlBody,
    });

    return { ok: true };
  } catch (err) {
    console.error("[landing-actions] Demo Request failed:", err);
    return { error: (err as Error).message };
  }
}
