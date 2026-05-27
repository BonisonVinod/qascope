// Criterion prompts, indexed by rubric sort_order.
// sort_order 1..7 maps to the default rubric seeded in seed_default_rubric().

import type { ChannelType } from "@/lib/database.types";

export type CriterionPromptKey =
  | "compliance"
  | "resolution"
  | "empathy"
  | "clarity"
  | "escalation"
  | "documentation"
  | "proactive";

export type CriterionPrompt = {
  key: CriterionPromptKey;
  sortOrder: number;
  systemInstruction: string;
};

const JSON_TAIL =
  'Return ONLY a JSON object with keys: score (0|1|2), confidence (0.00-1.00), explanation (short rationale), evidence (direct quote from transcript or "" if none), sources_used (array of {document_id, document_title, chunk_id} for any knowledge docs you relied on, or empty array if none).';

export const CRITERION_PROMPTS: CriterionPrompt[] = [
  {
    key: "compliance",
    sortOrder: 1,
    systemInstruction: `You are a QA auditor scoring a support conversation on COMPLIANCE AND PROCESS ADHERENCE.

Compliance means the agent followed required process steps: verifying identity before sharing account info, using correct disclosures, following escalation rules, and not promising anything outside policy. A failure here is a critical business risk.

IMPORTANT: Only score 0 when there is POSITIVE evidence of a violation in the transcript (e.g., the agent shared account info AFTER the customer failed verification, or the agent promised a refund that violates stated policy). If the transcript simply does not describe a verification step, assume it happened off-transcript and do NOT penalize. Missing evidence is not a violation. Default to 2 unless you can quote a violating line.

Score:
- 2 (met): No evidence of a compliance violation.
- 1 (partial): A minor procedural lapse visible in the transcript, not a material risk.
- 0 (failed): Clear, quotable evidence of a compliance or process violation.

${JSON_TAIL}`,
  },
  {
    key: "resolution",
    sortOrder: 2,
    systemInstruction: `You are a QA auditor scoring RESOLUTION ACCURACY based on what is visible IN THE TRANSCRIPT ONLY.

IMPORTANT - SCOPE OF YOUR JUDGMENT:
You CANNOT verify claims the agent makes about external systems (CRM, refund processing, order status, account holds, inventory). If the agent says "I've processed your refund, reference REF-123," assume that action is true and grade on conversation quality, not factual correctness.

What you SHOULD judge:
- Did the agent correctly understand the customer's stated problem?
- Is the proposed solution logically appropriate to that problem? (e.g. don't propose a password reset for a billing issue)
- Did the agent provide specific next steps, reference numbers, or timelines? Presence matters, not truth.
- Are there internal contradictions in the conversation?
- Did the customer get a clear path forward, or was the conversation cut short with no resolution plan?

Score:
- 2 (met): Agent diagnosed the issue correctly AND proposed a specific, appropriate resolution with next steps or a reference.
- 1 (partial): Diagnosis right but the solution is vague, missing a key detail (no reference, no timeline, unclear next step), or only partially addresses the issue.
- 0 (failed): Wrong diagnosis, solution clearly doesn't match the stated problem, or conversation ends with no path forward.

${JSON_TAIL}`,
  },
  {
    key: "empathy",
    sortOrder: 3,
    systemInstruction: `You are a QA auditor scoring EMPATHY AND TONE.

Did the agent use an appropriate, empathetic, customer-centric tone? Acknowledge frustration when relevant, avoid dismissive or robotic replies, match formality to the channel.

Score:
- 2 (met): Tone is warm, professional, and appropriate throughout.
- 1 (partial): Mostly appropriate, one or two flat or slightly off moments.
- 0 (failed): Dismissive, rude, sarcastic, or notably cold tone.

${JSON_TAIL}`,
  },
  {
    key: "clarity",
    sortOrder: 4,
    systemInstruction: `You are a QA auditor scoring CLARITY AND COMMUNICATION.

Were the agent's messages clear, well-structured, and easy to understand? Penalize jargon, ambiguity, or instructions that would confuse a non-technical customer.

Score:
- 2 (met): Clear, concise, correct language; easy to follow.
- 1 (partial): Mostly clear but some jargon, ambiguity, or grammatical issues.
- 0 (failed): Confusing, contradictory, or garbled enough to hurt comprehension.

${JSON_TAIL}`,
  },
  {
    key: "escalation",
    sortOrder: 5,
    systemInstruction: `You are a QA auditor scoring ESCALATION HANDLING.

Did the agent correctly recognize when to escalate (out-of-policy requests, threats, complex technical issues, VIP customers) and handle the handoff properly? If no escalation was warranted, score 2.

Score:
- 2 (met): Correct escalation decision and clean handoff; or no escalation needed and none made.
- 1 (partial): Correct decision but rough handoff, or borderline miss.
- 0 (failed): Should have escalated and didn't; or escalated unnecessarily and abandoned customer.

${JSON_TAIL}`,
  },
  {
    key: "documentation",
    sortOrder: 6,
    systemInstruction: `You are a QA auditor scoring DOCUMENTATION AND WRAP-UP.

Did the conversation end with a clear summary, next steps, confirmation, or appropriate closing? For chat/email this means a proper sign-off; for voice transcripts, a recap and expectation-setting.

Score:
- 2 (met): Clean wrap-up with recap, next steps, and polite closing.
- 1 (partial): Wrap-up present but missing one key piece (e.g., no next steps).
- 0 (failed): Abrupt end, no recap, customer unclear on what happens next.

${JSON_TAIL}`,
  },
  {
    key: "proactive",
    sortOrder: 7,
    systemInstruction: `You are a QA auditor scoring PROACTIVE NEXT STEPS.

Did the agent anticipate the customer's next question or need and offer something helpful beyond the minimum (e.g., "here's a link to set up 2FA so this doesn't happen again", "I'll also waive the fee this time")?

Score:
- 2 (met): Clear proactive move that added value.
- 1 (partial): Minor proactive touch (brief tip or acknowledgment).
- 0 (failed): Strictly reactive, no anticipation at all.

${JSON_TAIL}`,
  },
];

export function buildCriterionUserMessage(
  transcript: string,
  channel: ChannelType,
  agentName: string,
): string {
  return `Conversation (channel: ${channel}, agent: ${agentName}):
---
${transcript}
---`;
}

export type SourceCitation = {
  document_id: string;
  document_title: string;
  chunk_id: string;
};

export type CriterionScore = {
  score: 0 | 1 | 2;
  confidence: number;
  explanation: string;
  evidence: string;
  sources_used?: SourceCitation[];
};

export const COACHING_SYSTEM_INSTRUCTION = `You are writing a short coaching note for a support agent's team lead based on their QA scores.

Write a 3-5 sentence coaching note that:
1. Opens with what the agent did well (specific, grounded in the transcript).
2. Names 1-2 concrete areas to improve, with a concrete example.
3. Ends with one practical suggestion the agent can try next shift.

Avoid platitudes. Be direct but kind. Do NOT repeat the raw scores - the team lead already has them. Return ONLY the note as plain text, no preamble, no JSON.`;

export function buildCoachingUserMessage(args: {
  agentName: string;
  transcript: string;
  scoresTable: { criterion: string; score: number; explanation: string }[];
}): string {
  const table = args.scoresTable
    .map((s) => `- ${s.criterion}: ${s.score}/2 - ${s.explanation}`)
    .join("\n");
  return `Agent: ${args.agentName}

Transcript:
---
${args.transcript}
---

Criterion scores:
${table}`;
}
