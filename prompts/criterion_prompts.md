# QAScope — Criterion scoring prompts

One prompt per criterion. Each returns strict JSON:

```json
{
  "score": 0 | 1 | 2,
  "confidence": 0.00 - 1.00,
  "explanation": "short rationale",
  "evidence": "direct quote from transcript"
}
```

Scoring scale:
- 0 = failed
- 1 = partial
- 2 = met

All prompts take the same inputs: `{{transcript}}`, `{{channel}}`, `{{agent_name}}`.

---

## 1. Compliance / process adherence (weight 20, CRITICAL FAIL)

```
You are a QA auditor scoring a support conversation on COMPLIANCE AND PROCESS ADHERENCE.

Compliance means the agent followed required process steps: verifying identity before sharing account info, using correct disclosures, following escalation rules, and not promising anything outside policy. A failure here is a critical business risk.

Score:
- 2 (met): Agent followed all compliance and process steps.
- 1 (partial): Minor lapse, not material risk.
- 0 (failed): Meaningful compliance or process violation. If in doubt, score 0.

Conversation (channel: {{channel}}, agent: {{agent_name}}):
---
{{transcript}}
---

Return ONLY a JSON object with keys: score, confidence, explanation, evidence. Evidence must be a direct quote from the transcript, or "" if none applies.
```

---

## 2. Resolution accuracy (weight 30)

```
You are a QA auditor scoring RESOLUTION ACCURACY.

Did the agent correctly identify the customer's issue and provide an accurate, complete solution? Partial resolutions, wrong information, or unresolved issues score lower.

Score:
- 2 (met): Issue correctly identified AND resolved, or correctly routed.
- 1 (partial): Issue identified, resolution incomplete or partially correct.
- 0 (failed): Wrong diagnosis, incorrect info given, or issue left unresolved with no plan.

Conversation (channel: {{channel}}, agent: {{agent_name}}):
---
{{transcript}}
---

Return ONLY a JSON object with keys: score, confidence, explanation, evidence.
```

---

## 3. Empathy / tone (weight 15)

```
You are a QA auditor scoring EMPATHY AND TONE.

Did the agent use an appropriate, empathetic, customer-centric tone? Acknowledge frustration when relevant, avoid dismissive or robotic replies, match formality to the channel.

Score:
- 2 (met): Tone is warm, professional, and appropriate throughout.
- 1 (partial): Mostly appropriate, one or two flat or slightly off moments.
- 0 (failed): Dismissive, rude, sarcastic, or notably cold tone.

Conversation (channel: {{channel}}, agent: {{agent_name}}):
---
{{transcript}}
---

Return ONLY a JSON object with keys: score, confidence, explanation, evidence.
```

---

## 4. Clarity / communication (weight 10)

```
You are a QA auditor scoring CLARITY AND COMMUNICATION.

Were the agent's messages clear, well-structured, and easy to understand? Penalize jargon, ambiguity, or instructions that would confuse a non-technical customer.

Score:
- 2 (met): Clear, concise, correct language; easy to follow.
- 1 (partial): Mostly clear but some jargon, ambiguity, or grammatical issues.
- 0 (failed): Confusing, contradictory, or garbled enough to hurt comprehension.

Conversation (channel: {{channel}}, agent: {{agent_name}}):
---
{{transcript}}
---

Return ONLY a JSON object with keys: score, confidence, explanation, evidence.
```

---

## 5. Escalation handling (weight 10)

```
You are a QA auditor scoring ESCALATION HANDLING.

Did the agent correctly recognize when to escalate (out-of-policy requests, threats, complex technical issues, VIP customers) and handle the handoff properly? If no escalation was warranted, score 2.

Score:
- 2 (met): Correct escalation decision and clean handoff; or no escalation needed and none made.
- 1 (partial): Correct decision but rough handoff, or borderline miss.
- 0 (failed): Should have escalated and didn't; or escalated unnecessarily and abandoned customer.

Conversation (channel: {{channel}}, agent: {{agent_name}}):
---
{{transcript}}
---

Return ONLY a JSON object with keys: score, confidence, explanation, evidence.
```

---

## 6. Documentation / wrap-up (weight 10)

```
You are a QA auditor scoring DOCUMENTATION AND WRAP-UP.

Did the conversation end with a clear summary, next steps, confirmation, or appropriate closing? For chat/email this means a proper sign-off; for voice transcripts, a recap and expectation-setting.

Score:
- 2 (met): Clean wrap-up with recap, next steps, and polite closing.
- 1 (partial): Wrap-up present but missing one key piece (e.g., no next steps).
- 0 (failed): Abrupt end, no recap, customer unclear on what happens next.

Conversation (channel: {{channel}}, agent: {{agent_name}}):
---
{{transcript}}
---

Return ONLY a JSON object with keys: score, confidence, explanation, evidence.
```

---

## 7. Proactive next steps (weight 5)

```
You are a QA auditor scoring PROACTIVE NEXT STEPS.

Did the agent anticipate the customer's next question or need and offer something helpful beyond the minimum (e.g., "here's a link to set up 2FA so this doesn't happen again", "I'll also waive the fee this time")?

Score:
- 2 (met): Clear proactive move that added value.
- 1 (partial): Minor proactive touch (brief tip or acknowledgment).
- 0 (failed): Strictly reactive, no anticipation at all.

Conversation (channel: {{channel}}, agent: {{agent_name}}):
---
{{transcript}}
---

Return ONLY a JSON object with keys: score, confidence, explanation, evidence.
```

---

## Coaching note prompt (runs once after all criteria scored)

```
You are writing a short coaching note for the agent's team lead based on the QA scores below.

Agent: {{agent_name}}
Conversation summary: {{transcript_excerpt}}
Criterion scores:
{{scores_table}}

Write a 3–5 sentence coaching note that:
1. Opens with what the agent did well (specific, grounded in the transcript).
2. Names 1–2 concrete areas to improve, with an example.
3. Ends with one practical suggestion the agent can try next shift.

Avoid platitudes. Be direct but kind. Do NOT repeat the raw scores — the team lead already has them.
```
