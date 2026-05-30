import { Resend } from "resend";

const apiKey = process.env.RESEND_API_KEY;

if (!apiKey) {
  console.error("RESEND_API_KEY is missing from environment!");
  process.exit(1);
}

const resend = new Resend(apiKey);

const recipients = [
  "pvxv100224@gmail.com",
  "ai.ops.automation@gmail.com",
  "ai.ops.automation17@gmail.com",
  "bonnison.vinod@gmail.com"
];

async function testEmail(toEmail: string) {
  console.log(`\nAttempting to send test email to: ${toEmail}...`);
  try {
    const result = await resend.emails.send({
      from: "onboarding@resend.dev",
      to: [toEmail],
      subject: `Resend Sandbox Test to ${toEmail}`,
      html: `<p>If you see this, sending to <strong>${toEmail}</strong> is allowed in your Resend sandbox!</p>`,
    });

    if (result.error) {
      console.log(`❌ Failed to send to ${toEmail}:`, result.error);
    } else {
      console.log(`✅ SUCCESS! Email sent to ${toEmail}. ID:`, result.data?.id);
    }
  } catch (err) {
    console.error(`💥 Error while sending to ${toEmail}:`, err);
  }
}

async function main() {
  console.log("Using API Key:", apiKey);
  for (const recipient of recipients) {
    await testEmail(recipient);
  }
}

main().catch(console.error);
