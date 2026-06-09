"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { submitDemoRequest } from "@/app/landing-actions";

export default function PitchPage() {
  // Preset agent sizes for quick mobile tapping
  const agentPresets = [25, 50, 100, 200];
  const [selectedAgents, setSelectedAgents] = useState<number>(50);
  const [salary] = useState<number>(35000);
  const [isVoice, setIsVoice] = useState<boolean>(true);
  const [aht, setAht] = useState<number>(4);
  
  // Lead form state
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [formLoading, setFormLoading] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    preferredSlot: "",
    bpoType: "BFSI Debt Recovery",
    agentCount: 50,
  });

  const [copiedType, setCopiedType] = useState<string | null>(null);

  // Sync agent count from selector to form data
  useEffect(() => {
    setFormData((prev) => ({ ...prev, agentCount: selectedAgents }));
  }, [selectedAgents]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);
    try {
      const res = await submitDemoRequest(formData);
      if (res && "error" in res && res.error) {
        setFormError(res.error);
      } else {
        setFormSubmitted(true);
      }
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setFormLoading(false);
    }
  };

  // Calculations
  const conversationsPerAgent = 440; // Standard monthly target per agent
  const totalConversations = selectedAgents * conversationsPerAgent;
  
  // Traditional QA Setup (1 auditor per 10 agents standard)
  const traditionalAuditors = Math.max(1, Math.ceil(selectedAgents / 10));
  const traditionalLaborSpend = traditionalAuditors * salary;
  const traditionalSoftwareSpend = 10000; // Average legacy platform fee
  const traditionalTotalSpend = traditionalLaborSpend + traditionalSoftwareSpend;

  const apiUnitCost = isVoice ? 0.20 + aht * 0.50 : 0.20;

  // QAScope Automated Audit Setup
  // Plan A: ₹799/agent/month + Direct Cloud API cost
  const qascopePlatformSpend = selectedAgents * 799;
  const qascopeCloudInfraSpend = totalConversations * apiUnitCost;
  const qascopeTotalSpend = qascopePlatformSpend + qascopeCloudInfraSpend;

  // Net Savings
  const netMonthlySavings = traditionalTotalSpend - qascopeTotalSpend;
  const percentSaved = Math.round((netMonthlySavings / traditionalTotalSpend) * 100);

  // Copy templates generator
  const getWhatsAppTemplate = () => {
    return `Hi! 

Hope you're doing well. Quick operational question: In your BPO campaigns, what percentage of agent conversations does your QA team manually score? 

Usually, it’s about 5% because manual auditing is too labor-intensive. That means 95% of customer interactions go unreviewed. 

The unreviewed 95% is a compliance lottery—it's where regulatory slips (like RBI verification skips in India), verbal tone slips, and SLA breaches hide.

We built QAScope to solve this. It is an automated Quality Assurance platform calibrated specifically for BPOs. 

Here is how we help campaigns:
1. 📈 100% Audit Coverage: Continuous, touchless auditing of every single email, chat, and voice transcript.
2. 🛡️ SOP Adherence: Catch compliance errors, missed disclosures, or RBI skips instantly.
3. 📉 Cost Reduction: A typical ${selectedAgents}-agent campaign saves ₹${netMonthlySavings.toLocaleString('en-IN')} every single month in manual labor costs while getting 20x better coverage. 
4. ⚙️ Direct Cloud Billing: Pay raw infrastructure cloud processing costs directly (~₹${apiUnitCost.toFixed(2)}/convo${isVoice ? ` including ${aht}m AHT Whisper transcription` : ""}) with zero software markup.

We can set up a secure sandbox workspace, calibrate your exact campaign SOP, and audit 100 test conversations for free.

Check out our brochure page here: https://qascope.com/pitch

Would you have 10 minutes for a brief screen-share walkthrough tomorrow afternoon?`;
  };

  const getEmailTemplate = () => {
    return `Subject: Streamlining Campaign SOP Adherence & Auditing Costs

Dear Team,

Most call center campaigns operate under a major quality assurance blindspot: manual QA teams only have the bandwidth to review a random 5% sample of customer interactions. 

The remaining 95% represents a compliance lottery. It is where client SLA breaches, missed regulatory disclosures, and coaching leaks slip through undetected.

We built QAScope—a Quality Assurance & SOP Adherence platform designed specifically to automate BPO auditing workflows. 

Rather than random sampling, QAScope continuously scores 100% of customer interactions against your campaign's exact SOP guidelines instantly. Low scores are routed directly to your Team Leads (TLs) in a dedicated review-and-appeal queue, keeping your supervisors in complete control.

Here are the Campaign Economics for a ${selectedAgents}-Agent Team:
* Traditional QA Cost (${traditionalAuditors} Auditors @ ₹${salary.toLocaleString('en-IN')}/mo + platform): ₹${traditionalTotalSpend.toLocaleString('en-IN')} / month
* QAScope Platform Cost (Plan A Seat-Based): ₹${qascopePlatformSpend.toLocaleString('en-IN')} / month (₹799/agent)
* Cloud Ingestion Processing Cost (~₹${apiUnitCost.toFixed(2)}/convo raw cost${isVoice ? ` including ${aht}m AHT Whisper` : ""}): ₹${qascopeCloudInfraSpend.toLocaleString('en-IN')} / month
* NET MARGIN SAVED: ₹${netMonthlySavings.toLocaleString('en-IN')} / month (Save ${percentSaved}% in margins while getting 20x better coverage!)

Because we operate on a direct cloud connection model, we charge zero markup on transaction processing. Your transcripts are processed securely through your own OpenAI/OpenRouter API credentials, guaranteeing 100% data sovereignty and Mumbai AWS compliant residency.

We have set up a secure sandbox workspace for you to test this. We would love to calibrate one of your exact campaign SOP rubrics and run a free, 100-conversation anonymized pilot batch for your team to evaluate.

Read the visual pitch sheet here: https://qascope.com/pitch

Are you available for a brief, 10-minute visual demo this week? 

Best regards,

[Your Name]
Founder, QAScope
[Your Phone Number] | https://qascope.com`;
  };

  const handleCopyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2500);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-teal-500 selection:text-zinc-950 overflow-x-hidden">
      {/* Decorative Glow Elements */}
      <div className="absolute top-0 left-1/4 h-[400px] w-[400px] rounded-full bg-teal-950/15 blur-[100px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 h-[400px] w-[400px] rounded-full bg-emerald-950/10 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link href="/" className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-teal-400">QA</span>
              <span className="text-zinc-100">Scope</span>
            </h1>
            <span className="rounded-full bg-teal-950 border border-teal-800/40 px-2.5 py-0.5 text-[9px] font-semibold text-teal-400 uppercase tracking-widest">
              BPO SOLUTIONS BRIEF
            </span>
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-zinc-400 hover:text-teal-400 transition"
          >
            ← Back to Home
          </Link>
        </div>
      </header>

      {/* Main Pitch Container */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Pitch Intro */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-950/30 px-3 py-1 text-xs font-semibold text-teal-400 font-mono mb-4">
            <span className="flex h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
            Designed for WhatsApp & Email Sharing
          </div>
          <h2 className="text-3xl font-extrabold sm:text-5xl tracking-tight text-white leading-tight bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">
            QAScope — Automated SOP Auditing for BPOs
          </h2>
          <p className="mt-4 text-zinc-400 max-w-2xl mx-auto text-base leading-relaxed">
            Stop relying on a 5% random sampling compliance lottery. Audit 100% of customer interactions against your campaign SOPs automatically, cut auditing overhead by 50%, and eliminate client SLA fines.
          </p>
        </div>

        {/* Founder's Toolbox Alert */}
        <div className="rounded-xl border border-teal-950 bg-teal-950/10 p-5 mb-10 text-left">
          <h3 className="text-sm font-bold text-teal-400 flex items-center gap-2">
            💼 Founder Sharing Toolbox
          </h3>
          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
            Need to send details immediately? Select a team size below to customize the pricing math, then copy these copy-paste-ready pitch templates optimized for WhatsApp or Email.
          </p>
          
          <div className="grid gap-4 mt-4 sm:grid-cols-2">
            {/* WhatsApp Copier */}
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">📱 Mobile Pitch</span>
                <h4 className="text-sm font-bold text-zinc-200 mt-1">WhatsApp Pitch Card</h4>
                <p className="text-xs text-zinc-400 mt-1">Short, visual, high-impact bullet points with calculated BPO margin savings.</p>
              </div>
              <button
                onClick={() => handleCopyToClipboard(getWhatsAppTemplate(), "whatsapp")}
                className="mt-4 w-full rounded-md bg-emerald-600 hover:bg-emerald-500 px-3 py-2 text-xs font-bold text-white transition flex items-center justify-center gap-1"
              >
                {copiedType === "whatsapp" ? "✓ Copied WhatsApp Pitch!" : "Copy WhatsApp Template"}
              </button>
            </div>

            {/* Email Copier */}
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-4 flex flex-col justify-between">
              <div>
                <span className="text-xs font-bold text-teal-400 uppercase tracking-wider">✉️ Corporate Intro</span>
                <h4 className="text-sm font-bold text-zinc-200 mt-1">Email Introduction Brief</h4>
                <p className="text-xs text-zinc-400 mt-1">Structured pitch detailing campaign economics, compliance auditing, and BYOK cost advantages.</p>
              </div>
              <button
                onClick={() => handleCopyToClipboard(getEmailTemplate(), "email")}
                className="mt-4 w-full rounded-md bg-teal-600 hover:bg-teal-500 px-3 py-2 text-xs font-bold text-white transition flex items-center justify-center gap-1"
              >
                {copiedType === "email" ? "✓ Copied Email Pitch!" : "Copy Email Template"}
              </button>
            </div>
          </div>
        </div>

        {/* Section 1: The BPO QA Challenge */}
        <section className="grid gap-6 md:grid-cols-3 mb-12">
          <div className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-6">
            <div className="h-8 w-8 rounded-lg bg-teal-950 border border-teal-800/40 flex items-center justify-center text-teal-400 text-base font-bold">1</div>
            <h4 className="text-base font-bold text-white mt-4">100% Touchless Audit</h4>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Standard manual QA checks are capped at 5% volume. QAScope scores every conversation—emails, chats, and transcripts—instantly against your exact campaign rubrics.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-6">
            <div className="h-8 w-8 rounded-lg bg-emerald-950 border border-emerald-800/40 flex items-center justify-center text-emerald-400 text-base font-bold">2</div>
            <h4 className="text-base font-bold text-white mt-4">SOP Compliance Control</h4>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Instantly flag customer identity verification skips (e.g. RBI guidelines), aggressive verbal behavior, or missed mandatory interest disclosures before they hit regulatory triggers.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-6">
            <div className="h-8 w-8 rounded-lg bg-purple-950 border border-purple-800/40 flex items-center justify-center text-purple-400 text-base font-bold">3</div>
            <h4 className="text-base font-bold text-white mt-4">Two-Tier Calibration Queue</h4>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Audits are calibrated with a human-in-the-loop queue. Poorly scored interaction tickets route directly to Team Leads for secondary manual validation and agent coaching.
            </p>
          </div>
        </section>

        {/* Section 2: Interactive Pricing & ROI Ledger */}
        <section className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-6 sm:p-8 mb-12">
          <div className="text-center mb-6">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 font-mono">Campaign Economics Simulator</h3>
            <h4 className="text-2xl font-bold text-white mt-1">Dynamic Cost Comparison</h4>
            <p className="text-xs text-zinc-400 mt-1 max-w-xl mx-auto">
              Select your campaign team size to simulate QAScope savings versus traditional manual auditing.
            </p>
          </div>

          {/* Quick presets selectors */}
          <div className="flex justify-center gap-3 mb-4">
            {agentPresets.map((preset) => (
              <button
                key={preset}
                onClick={() => setSelectedAgents(preset)}
                className={`px-4 py-2 rounded-lg text-xs font-bold tracking-wide transition ${
                  selectedAgents === preset
                    ? "bg-teal-500 text-zinc-950 shadow-[0_0_15px_rgba(20,184,166,0.25)]"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                }`}
              >
                {preset} Agents
              </button>
            ))}
          </div>

          {/* Voice vs Non-Voice toggle & AHT slider for sales pitch */}
          <div className="max-w-md mx-auto mb-8 bg-zinc-950/40 rounded-xl p-4 border border-zinc-800 space-y-4">
            <div className="space-y-1.5">
              <span className="text-[10px] uppercase text-zinc-500 font-mono tracking-wider font-bold">Campaign Channel Type</span>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setIsVoice(true)}
                  className={`rounded-lg py-2 text-xs font-bold tracking-wide transition flex items-center justify-center gap-2 ${
                    isVoice
                      ? "bg-teal-500 text-zinc-950 shadow-[0_0_15px_rgba(20,184,166,0.25)]"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span>📞</span> Voice
                </button>
                <button
                  type="button"
                  onClick={() => setIsVoice(false)}
                  className={`rounded-lg py-2 text-xs font-bold tracking-wide transition flex items-center justify-center gap-2 ${
                    !isVoice
                      ? "bg-teal-500 text-zinc-950 shadow-[0_0_15px_rgba(20,184,166,0.25)]"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
                  }`}
                >
                  <span>💬</span> Chat / Email
                </button>
              </div>
            </div>

            {isVoice && (
              <div className="space-y-2 transition-all duration-300 border-t border-zinc-900 pt-3">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-zinc-400">Average Handling Time (AHT)</span>
                  <span className="text-teal-400 font-mono font-bold">{aht} minutes</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={aht}
                  onChange={(e) => setAht(parseInt(e.target.value))}
                  className="w-full h-1 bg-zinc-850 rounded-lg appearance-none cursor-pointer accent-teal-500"
                />
                <div className="flex justify-between text-[9px] text-zinc-500 font-mono">
                  <span>1m</span>
                  <span>10m</span>
                </div>
                <p className="text-[9px] text-zinc-500 font-mono text-center">
                  Estimated Whisper transcription raw cost: ₹{(aht * 0.50).toFixed(2)} per call
                </p>
              </div>
            )}
          </div>

          {/* Cost Ledger Table */}
          <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-900 text-[10px] uppercase tracking-wider text-zinc-500 font-mono">
                  <th className="pb-3 pr-4">Expense Ledger</th>
                  <th className="pb-3 pr-4 text-center">Traditional Manual QA (5% Sample)</th>
                  <th className="pb-3 text-right text-teal-400">QAScope Automated (100% Volume)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-xs font-medium">
                {/* Labor Component */}
                <tr>
                  <td className="py-4 pr-4 text-zinc-300">
                    <span className="block font-bold">QA Auditor Salaries</span>
                    <span className="text-[10px] text-zinc-500 font-normal">
                      Manual: {traditionalAuditors} auditors @ ₹35k · QAScope: Continuous touchless auditing
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-center text-zinc-400">
                    ₹{traditionalLaborSpend.toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 text-right text-teal-400">
                    ₹0 <span className="text-[10px] text-zinc-500 font-normal">(Included)</span>
                  </td>
                </tr>

                {/* Software Component */}
                <tr>
                  <td className="py-4 pr-4 text-zinc-300">
                    <span className="block font-bold">Software Seat Fee</span>
                    <span className="text-[10px] text-zinc-500 font-normal">
                      Standard platform seat licensing (₹799/agent)
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-center text-zinc-400">
                    ₹{traditionalSoftwareSpend.toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 text-right text-teal-400">
                    ₹{qascopePlatformSpend.toLocaleString('en-IN')}
                  </td>
                </tr>

                {/* Cloud API Cost */}
                <tr>
                  <td className="py-4 pr-4 text-zinc-300">
                    <span className="block font-bold">Direct Cloud Processing (BYOK)</span>
                    <span className="text-[10px] text-zinc-500 font-normal">
                      Raw computation infrastructure cost (~₹{apiUnitCost.toFixed(2)} per convo audit{isVoice ? ` including ${aht}m Whisper` : ""}, zero vendor markup)
                    </span>
                  </td>
                  <td className="py-4 pr-4 text-center text-zinc-400">
                    N/A
                  </td>
                  <td className="py-4 text-right text-teal-400">
                    ₹{qascopeCloudInfraSpend.toLocaleString('en-IN')}
                  </td>
                </tr>

                {/* Total Expense */}
                <tr className="bg-zinc-950 font-bold border-t border-zinc-800">
                  <td className="py-4 pr-4 text-white uppercase text-[10px] tracking-widest font-mono">
                    Total Monthly Spend
                  </td>
                  <td className="py-4 pr-4 text-center text-rose-500 text-sm">
                    ₹{traditionalTotalSpend.toLocaleString('en-IN')}
                  </td>
                  <td className="py-4 text-right text-teal-400 text-sm">
                    ₹{qascopeTotalSpend.toLocaleString('en-IN')}
                  </td>
                </tr>

                {/* Auditing Volume */}
                <tr className="bg-zinc-900/20 font-bold border-t border-zinc-850">
                  <td className="py-4 pr-4 text-zinc-400 uppercase text-[10px] tracking-widest font-mono">
                    Audit Coverage
                  </td>
                  <td className="py-4 pr-4 text-center text-rose-400 font-mono">
                    5% random sample
                  </td>
                  <td className="py-4 text-right text-teal-400 font-mono">
                    100% full volume
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* ROI callout banner */}
          <div className="mt-6 rounded-xl border border-emerald-950 bg-emerald-950/10 px-5 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div>
              <p className="text-[10px] uppercase font-mono tracking-widest text-emerald-400">Operational Margin Gains</p>
              <h4 className="text-base font-bold text-white mt-0.5">
                Save ₹{netMonthlySavings.toLocaleString('en-IN')} every month
              </h4>
            </div>
            <div className="rounded-full bg-emerald-500 text-zinc-950 text-xs font-bold px-4 py-1.5 shadow-[0_0_15px_rgba(16,185,129,0.35)]">
              Cut Spend by {percentSaved}%
            </div>
          </div>
        </section>

        {/* Section 3: Tech Security & Sovereign Cloud */}
        <section className="border-t border-zinc-900 pt-10 mb-12">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400 font-mono text-center mb-8">
            Data Sovereign Infrastructure
          </h3>
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-5">
              <h4 className="text-sm font-bold text-white">🔒 Multi-Tenant RLS Security</h4>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                We implement Postgres Row-Level Security (RLS) policies at the database layer. Your conversation records are completely isolated and fully encrypted in transit and at rest.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-5">
              <h4 className="text-sm font-bold text-white">🇮🇳 Mumbai AWS Data Residency</h4>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Perfect compliance with RBI, TRAI, and Indian data storage policies. All text records and analytics databases reside inside secure AWS region in Mumbai, ensuring zero cross-border telemetry leaks.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-5">
              <h4 className="text-sm font-bold text-white">⚙️ The Zero-Markup BYOK Advantage</h4>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Legacy QA systems mark up AI API costs by 300%. QAScope is "Bring Your Own Key" (BYOK). Process transcript evaluation at raw API rates (~₹0.20 per audit) under your own credentials.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-900 bg-zinc-900/30 p-5">
              <h4 className="text-sm font-bold text-white">🔌 CRM Direct Ingestion Webhooks</h4>
              <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
                Zero agent workspace friction. Seamlessly ingest ticketing files or voice recording logs directly from Zendesk, Freshdesk, or cloud dialers through simple API hooks.
              </p>
            </div>
          </div>
        </section>

        {/* Pilot Signup CTA Form */}
        <section className="rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-8">
          <div className="text-center mb-8">
            <span className="rounded-full bg-teal-950 border border-teal-900 px-3 py-1 text-[10px] font-mono font-bold text-teal-400 uppercase tracking-widest">
              LAUNCH PILOT OFFER
            </span>
            <h3 className="text-2xl font-bold text-white mt-3">Start with 100 Free Audited Conversations</h3>
            <p className="text-xs text-zinc-400 mt-1.5 max-w-xl mx-auto leading-relaxed">
              We will set up a isolated sandbox space, calibrate your campaign's custom SOP rubric, and evaluate a batch of 100 interaction records for free. No credit cards, using sample dummy transcripts.
            </p>
          </div>

          {formSubmitted ? (
            <div className="rounded-xl border border-teal-900/50 bg-teal-950/20 p-6 text-center">
              <span className="text-2xl">🎉</span>
              <h4 className="text-base font-bold text-white mt-2">SOP Calibration Request Received</h4>
              <p className="text-xs text-zinc-400 mt-1 max-w-md mx-auto leading-relaxed">
                Thank you! Our engineering team will prepare your sandbox workspace and reach out within 2 hours to calibrate your custom compliance rubrics.
              </p>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="space-y-4 max-w-xl mx-auto">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="name" className="block text-[10px] uppercase font-mono tracking-wider text-zinc-400 mb-1">
                    Your Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="e.g. Rajesh Nair"
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-[10px] uppercase font-mono tracking-wider text-zinc-400 mb-1">
                    Corporate Email
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="e.g. rajesh@bposervices.com"
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="phone" className="block text-[10px] uppercase font-mono tracking-wider text-zinc-400 mb-1">
                    WhatsApp Number
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="e.g. +91 98765 43210"
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  />
                </div>

                <div>
                  <label htmlFor="bpoType" className="block text-[10px] uppercase font-mono tracking-wider text-zinc-400 mb-1">
                    Campaign Focus Area
                  </label>
                  <select
                    id="bpoType"
                    name="bpoType"
                    value={formData.bpoType}
                    onChange={handleInputChange}
                    className="w-full rounded-lg bg-zinc-950 border border-zinc-800 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition"
                  >
                    <option value="BFSI Debt Recovery">BFSI Debt Recovery (RBI Rubrics)</option>
                    <option value="Customer Tech Support">Customer Tech Support (FCR Rubrics)</option>
                    <option value="Lead Generation / Sales">Lead Generation / Sales (Disclosure Rubrics)</option>
                    <option value="General SLA Quality Audit">General Quality & SOP Auditing</option>
                  </select>
                </div>
              </div>

              {formError && (
                <p className="text-xs text-rose-500 font-semibold bg-rose-950/20 px-3 py-2 rounded-lg border border-rose-900/50">
                  ⚠️ Error: {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={formLoading}
                className="w-full rounded-lg bg-teal-500 hover:bg-teal-400 disabled:bg-teal-700 py-3 text-xs font-bold text-zinc-950 transition uppercase tracking-wider shadow-[0_0_20px_rgba(20,184,166,0.3)] mt-2"
              >
                {formLoading ? "Sending Calibration Request..." : "Calibrate My 100 Free Audits"}
              </button>
            </form>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950/80 py-8 text-center text-[10px] text-zinc-500">
        <p>© 2026 QAScope. All Rights Reserved. Mumbai Region AWS Server Node Compliant.</p>
      </footer>
    </div>
  );
}
