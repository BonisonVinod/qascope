"use server";

import { sendEmail, fromEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";

type DemoRequestInput = {
  name: string;
  email: string;
  phone: string;
  preferredSlot: string;
  bpoType: string;
  agentCount: number;
};

export async function submitDemoRequest(input: DemoRequestInput) {
  const { name, email, phone, preferredSlot, bpoType, agentCount } = input;

  if (!name || !email || !phone || !preferredSlot || !bpoType || !agentCount) {
    return { error: "All fields are required" };
  }

  try {
    // 1. Log the lead in server-side logs
    console.log(`[landing-actions] Demo Request from ${name} (${email}, Phone: ${phone}):`, {
      bpoType,
      agentCount,
      preferredSlot,
    });

    // 2. Fetch all super admin emails from the database to notify them
    const admin = createAdminClient();
    const { data: superAdmins } = await admin
      .from("users")
      .select("email")
      .eq("is_super_admin", true);

    const adminEmails = (superAdmins ?? []).map((sa) => sa.email).filter(Boolean);
    
    // Check if we are using Resend's free shared sandbox domain (onboarding@resend.dev)
    const isSandbox = fromEmail.includes("resend.dev");

    // In sandbox, Resend ONLY allows sending to the registered account owner email.
    // We resolve the developer's email automatically from superadmins, falling back to the first user.
    let notifyTarget = adminEmails;
    if (isSandbox) {
      notifyTarget = [process.env.SANDBOX_RECIPIENT || "supportqascope@gmail.com"];
    } else if (notifyTarget.length === 0) {
      const { data: firstUser } = await admin
        .from("users")
        .select("email")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      if (firstUser?.email) {
        notifyTarget = [firstUser.email];
      } else {
        notifyTarget = [fromEmail];
      }
    }



    // 3. Define HTML Templates
    const adminHtmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
        <h2 style="color: #0d9488; margin-top: 0;">🚀 New QAScope Demo Lead!</h2>
        <p style="color: #71717a; font-size: 14px;">A new BPO call center has requested a 30-minute private walkthrough pilot:</p>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
          <tr>
            <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #f4f4f5; color: #18181b;">Full Name:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; color: #52525b;">${name}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #f4f4f5; color: #18181b;">Work Email:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; color: #52525b; font-family: monospace;">${email}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #f4f4f5; color: #18181b;">Phone Number:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; color: #52525b; font-family: monospace;">${phone}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #f4f4f5; color: #18181b;">Preferred Demo Slot:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; color: #52525b; font-weight: bold; color: #0d9488;">${preferredSlot}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #f4f4f5; color: #18181b;">Campaign Vertical:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; color: #52525b;">${bpoType}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; border-bottom: 1px solid #f4f4f5; color: #18181b;">Agent Count:</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f4f4f5; color: #52525b; font-weight: bold;">${agentCount} agents</td>
          </tr>
        </table>
        <p style="color: #71717a; font-size: 12px; margin-top: 25px;">Please reach out to the lead within 24 hours to schedule their onboarding slot.</p>
      </div>
    `;

    const clientHtmlBody = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
        <h2 style="color: #0d9488; margin-top: 0;">Welcome to QAScope, ${name}!</h2>
        <p style="color: #18181b; font-size: 14px; line-height: 1.5;">We have successfully received your request for a private **30-minute BPO pilot walkthrough** for your **${bpoType}** campaign.</p>
        <p style="color: #18181b; font-size: 14px; line-height: 1.5;">Here is what happens next:</p>
        <ol style="color: #52525b; font-size: 14px; line-height: 1.6; padding-left: 20px;">
          <li>One of our operations calibrators will review your BPO campaign requirements.</li>
          <li>We will reach out to you within 24 hours at <strong>${email}</strong> (or call <strong>${phone}</strong>) to confirm your preferred slot of <strong>${preferredSlot}</strong> and send the direct Google Meet link.</li>
          <li>On the call, we will calibrate your custom SOP rubric, upload a test batch of your call transcripts, and review your live 100% automated scoring console together.</li>
        </ol>
        <p style="color: #18181b; font-size: 14px; line-height: 1.5; margin-top: 20px;">If you want to bypass the demo and try the platform yourself immediately, you can register for an account here: <a href="https://qascope-sdiz.vercel.app/signup" style="color: #0d9488; text-decoration: underline; font-weight: bold;">Start My Free Trial</a></p>
        <hr style="border: 0; border-top: 1px solid #f4f4f5; margin: 25px 0;" />
        <p style="color: #71717a; font-size: 11px; text-align: center;">© 2026 QAScope Inc. All rights reserved. Ex-operator built call center AI solutions.</p>
      </div>
    `;

    // 4. Send Notification Email to Super Admins / Platform Owner
    const adminSubject = isSandbox 
      ? `[Sandbox Lead Alert] Demo Request: ${name} (${agentCount} Agents)`
      : `[QAScope Lead] Demo Request: ${name} (${agentCount} Agents)`;

    await sendEmail({
      to: notifyTarget,
      subject: adminSubject,
      html: adminHtmlBody,
    });

    // 5. Send Confirmation Email to the Lead
    // In sandbox, we send the client welcome template to the developer's own email as a "Preview"
    // to bypass Resend's validation block on external Gmail recipients.
    const clientRecipient = isSandbox ? notifyTarget : [email];
    const clientSubject = isSandbox
      ? `[Sandbox Client Preview] Your QAScope Pilot Request Received!`
      : `Your QAScope Pilot Request Received!`;

    await sendEmail({
      to: clientRecipient,
      subject: clientSubject,
      html: clientHtmlBody,
    });

    return { ok: true };
  } catch (err) {
    console.error("[landing-actions] Demo Request failed:", err);
    return { error: (err as Error).message };
  }
}
