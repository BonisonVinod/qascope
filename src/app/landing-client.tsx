"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { PLANS, PLAN_ORDER, formatUsd } from "@/lib/billing/plans";
import { submitDemoRequest } from "@/app/landing-actions";

interface CampaignData {
  title: string;
  sopRule: string;
  transcript: { speaker: string; text: string; highlight?: boolean }[];
  score: number;
  status: "fail" | "warning" | "pass";
  failReason: string;
  coachingNote: string;
}

export function LandingClient() {
  // ROI Calculator State
  const [agents, setAgents] = useState<number>(50);
  const [salary, setSalary] = useState<number>(35000);
  const [auditors, setAuditors] = useState<number>(5);
  const [ticketsPerAgent, setTicketsPerAgent] = useState<number>(440);
  const [conversations, setConversations] = useState<number>(22000);

  // Form Submission State
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

  // Auto-adjust conversations and auditors when agents slider moves
  useEffect(() => {
    setConversations(agents * ticketsPerAgent);
    setAuditors(Math.max(1, Math.ceil(agents / 10))); // 1 auditor per 10 agents standard
  }, [agents, ticketsPerAgent]);

  // Plan A: ₹799/agent/mo + Cloud API infrastructure cost
  const planACost = agents * 799 + conversations * 0.20;
  
  // Plan B: ₹4,999 flat platform + ₹1.50/convo usage + Cloud API infrastructure cost
  const planBCost = 4999 + conversations * (1.50 + 0.20);
  
  const isPlanACheaper = planACost < planBCost;
  const qascopeTotalSpend = isPlanACheaper ? planACost : planBCost;
  const recommendedPlanLabel = isPlanACheaper ? "Plan A" : "Plan B";

  const traditionalSpend = auditors * salary;
  const qascopeInfraSpend = conversations * 0.20; // ₹0.20 per conversation raw API cloud cost
  const netMonthlySavings = traditionalSpend - qascopeTotalSpend;

  // Interactive Rubrics Tab State
  const [activeTab, setActiveTab] = useState<string>("bfsi-collections");

  const campaigns: Record<string, CampaignData> = {
    "bfsi-collections": {
      title: "BFSI Debt Recovery (Collections)",
      sopRule: "RBI Compliance Rule: Must verify customer full name and date of birth before discussing outstanding loan details. Verbal threats or aggressive language are strictly prohibited.",
      transcript: [
        { speaker: "Agent", text: "Good morning, am I speaking with Mr. Rajesh Kumar?" },
        { speaker: "Customer", text: "Yes, this is Rajesh. Who is this?" },
        { speaker: "Agent", text: "Sir, I am calling from FastCash Finance regarding your outstanding loan payment of ₹45,500 which is overdue by 12 days.", highlight: true },
        { speaker: "Customer", text: "Wait, what overdue? Let me check..." },
        { speaker: "Agent", text: "Sir, pay the amount immediately today or we will initiate legal action against your account.", highlight: true },
      ],
      score: 42,
      status: "fail",
      failReason: "CRITICAL COMPLIANCE FAILURE: Outstanding balance details disclosed prior to Date of Birth verification. Verbal threat used.",
      coachingNote: "Agent Rajesh Kumar jumped straight into debt collections details without verifying secondary credentials (DOB), directly violating RBI's fair practices code. Agent also used inappropriate verbal escalation. Flagged for immediate 1-on-1 coaching.",
    },
    "bfsi-disclosures": {
      title: "BFSI Credit Card Sales",
      sopRule: "Compliance SOP: Agent must state the Annual Percentage Rate (APR) of 42.6% and late payment fees verbatim before booking the credit card.",
      transcript: [
        { speaker: "Agent", text: "Congratulations sir! Your profile has been pre-approved for the Gold Elite Credit Card." },
        { speaker: "Customer", text: "Is there any annual fee for this card?" },
        { speaker: "Agent", text: "No annual fee for the first year, sir. I'll initiate the card activation code now.", highlight: true },
        { speaker: "Customer", text: "Okay, go ahead." },
        { speaker: "Agent", text: "Great, booking complete! You will receive the card in 3 working days." },
      ],
      score: 55,
      status: "warning",
      failReason: "MANDATORY DISCLOSURE MISSING: Fails to disclose the annual credit card interest rate (APR: 42.6%) and late charge fees.",
      coachingNote: "Agent booked the pre-approved card successfully but bypassed regulatory interest disclosures. This is a severe audit warning. Schedule disclosure calibration session.",
    },
    "telecom-sim": {
      title: "Telecom Sim Swap / Activation",
      sopRule: "Security SOP: To prevent SIM hijacking, agent must verify mother's maiden name and alternative phone number prior to confirming sim replacement.",
      transcript: [
        { speaker: "Agent", text: "Welcome to Mobile Support, my name is Amit. How can I help you?" },
        { speaker: "Customer", text: "Hi, I lost my SIM card yesterday. I need to issue a replacement SIM swap immediately." },
        { speaker: "Agent", text: "No worries, sir. Let me activate the replacement SIM request code for you.", highlight: true },
        { speaker: "Customer", text: "Thank you. Will the old SIM be blocked?" },
        { speaker: "Agent", text: "Yes, it is blocked now. Your new SIM is active.", highlight: true },
      ],
      score: 30,
      status: "fail",
      failReason: "SECURITY SOP VIOLATION: SIM swap completed with zero security token validation. Missing mother's maiden name.",
      coachingNote: "Agent Amit bypassed critical fraud-prevention procedures by swap-activating a replacement card without asking for identity verification tokens. High-security risk. Agent suspended from swaps pending re-training.",
    },
    "ecommerce-refunds": {
      title: "D2C E-Commerce Support (Refunds)",
      sopRule: "Refund SOP: Refund can only be processed if order ID matches database and order delivery occurred within the past 30 days.",
      transcript: [
        { speaker: "Customer", text: "Hi, I ordered a jacket 45 days ago and it fits too tight. I want a full refund." },
        { speaker: "Agent", text: "Let me check your Order ID #55891." },
        { speaker: "Agent", text: "Sure sir, although the 30-day window has expired, I have processed a full refund of ₹4,999 to your credit card.", highlight: true },
        { speaker: "Customer", text: "Awesome, thanks!" },
      ],
      score: 68,
      status: "warning",
      failReason: "SOP BREAKAGE: Refund approved for transaction exceeding standard 30-day delivery policy without manager escalation.",
      coachingNote: "Agent approved a customer refund for a 45-day-old purchase, breaching standard D2C policy. While customer satisfaction is high, unauthorized refund approvals erode product margins. Refresh refund guidelines.",
    },
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-teal-500 selection:text-zinc-950">
      {/* Background Decorative Glow Effects */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-teal-950/20 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 h-[600px] w-[600px] rounded-full bg-purple-950/10 blur-[150px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-teal-400">QA</span>
              <span className="text-zinc-100">Scope</span>
            </h1>
            <span className="rounded-full bg-teal-950 border border-teal-800/40 px-2 py-0.5 text-[9px] font-semibold text-teal-400 uppercase tracking-wider">
              BPO CALIBRATED
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#gap" className="transition hover:text-teal-400">The 95% Problem</a>
            <a href="#interactive-demo" className="transition hover:text-teal-400">Live Demo</a>
            <a href="#roi-calculator" className="transition hover:text-teal-400">ROI Calculator</a>
            <a href="#pricing" className="transition hover:text-teal-400">Pricing Tiers</a>
            <a href="#faqs" className="transition hover:text-teal-400">FAQs</a>
          </nav>
          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-sm font-medium text-zinc-400 transition hover:text-zinc-100"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.3)]"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-6 pt-20 pb-16 text-center lg:pt-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-950/30 px-3.5 py-1 text-xs font-semibold text-teal-400 font-mono">
          <span className="flex h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
          Enterprise Quality Assurance & Process Compliance Control · Built for Indian BPOs
        </div>
        <h2 className="mt-8 text-4xl font-extrabold tracking-tight text-white sm:text-6xl bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-tight max-w-4xl mx-auto">
          100% Process Auditing. <br />
          <span className="text-teal-400 bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text">
            Eliminate Compliance Leakage.
          </span>
        </h2>
        <p className="mx-auto mt-6 max-w-3xl text-lg text-zinc-400 leading-relaxed">
          Standard manual QA checks review a minor 5% sample. QAScope automates the quality audit process, continuously scoring **100% of client interactions** against standard operating procedures, protecting your SLAs and reducing team lead overhead.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-xl bg-teal-500 px-6 py-4 text-base font-bold text-zinc-950 transition hover:bg-teal-400 shadow-[0_0_25px_rgba(20,184,166,0.4)]"
          >
            Get Started Free
          </Link>
          <a
            href="#interactive-demo"
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-4 text-base font-bold text-zinc-200 transition hover:bg-zinc-800 hover:border-zinc-700"
          >
            See Live Demo
          </a>
          {/* Dashboard Preview Mockup */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-zinc-900 bg-zinc-950 p-3 shadow-2xl shadow-teal-950/10">
          <div className="rounded-xl border border-zinc-900 bg-zinc-900/40 p-4 text-left">
            <div className="flex items-center justify-between border-b border-zinc-900 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/85" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/85" />
                <span className="h-3 w-3 rounded-full bg-green-500/85" />
                <span className="ml-2 text-xs text-zinc-500 font-mono">qascope.com/dashboard</span>
              </div>
              <span className="rounded bg-teal-950 border border-teal-800/40 px-2 py-0.5 text-[10px] font-semibold text-teal-400 uppercase tracking-widest">
                Process Compliance Console
              </span>
            </div>
            {/* Visual cards mimicking app layout */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">QA Pass Rate</p>
                <p className="mt-1 text-2xl font-bold text-white">94.2%</p>
                <div className="mt-2 h-1.5 w-full rounded bg-zinc-800"><div className="h-full rounded bg-teal-500" style={{width: '94%'}} /></div>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Audited Interactions</p>
                <p className="mt-1 text-2xl font-bold text-teal-400">12,481</p>
                <p className="text-[10px] text-zinc-500 mt-1">100% of entire client volume</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Supervisor Review Queue</p>
                <p className="mt-1 text-2xl font-bold text-rose-500">3</p>
                <p className="text-[10px] text-zinc-500 mt-1">SLA compliant (within 24h)</p>
              </div>
            </div>
          </div>
        </div>       </div>
      </section>

      {/* The 95% Operations Gap Section */}
      <section id="gap" className="mx-auto max-w-6xl px-6 py-16 border-t border-zinc-900">
        <div className="text-center mb-12">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">The Operations Gap</h3>
          <h4 className="mt-2 text-3xl font-bold text-white">Manual QA is a Compliance Lottery</h4>
          <p className="mt-2 text-zinc-400 max-w-2xl mx-auto">Here is what a 100-agent campaign looks like side-by-side. Where would you rather hide your company's risk?</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Legacy QA */}
          <div className="rounded-2xl border border-rose-950/50 bg-rose-950/5 p-8 flex flex-col justify-between">
            <div>
              <div className="inline-flex rounded-full bg-rose-950/40 border border-rose-800/40 px-3 py-1 text-xs font-semibold text-rose-400">
                Legacy Manual QA
              </div>
              <h5 className="mt-4 text-2xl font-bold text-white">5% Random Sampling</h5>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Auditors manually listen to 5 calls per agent per week. The unreviewed 95% goes completely unmonitored. 
              </p>
              
              {/* Dots grid representing unreviewed calls */}
              <div className="mt-6 p-4 rounded-xl bg-zinc-950/60 border border-zinc-850">
                <p className="text-[10px] uppercase text-zinc-500 mb-2 font-mono">100 Conversation Sample (Red = Checked, Muted = Unchecked)</p>
                <div className="grid grid-cols-10 gap-1.5">
                  {Array.from({ length: 100 }).map((_, i) => {
                    const isChecked = i < 5;
                    return (
                      <span
                        key={i}
                        className={`h-2.5 w-2.5 rounded-full ${
                          isChecked ? "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" : "bg-zinc-800/50"
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
            
            <div className="mt-6 pt-4 border-t border-rose-950/40 text-xs font-medium text-rose-400">
              ⚠️ 95% of regulatory errors and coaching leaks slip through undetected.
            </div>
          </div>

          {/* QAScope QA */}
          <div className="rounded-2xl border border-teal-500 bg-teal-950/5 p-8 flex flex-col justify-between shadow-[0_0_30px_rgba(20,184,166,0.03)]">
            <div>
              <div className="inline-flex rounded-full bg-teal-950/40 border border-teal-800/40 px-3 py-1 text-xs font-semibold text-teal-400 animate-pulse">
                QAScope Auditing
              </div>
              <h5 className="mt-4 text-2xl font-bold text-white">100% Automated Scoring</h5>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Every uploaded conversation is scored instantly. Critical rule violations and low scorers trigger human escalations.
              </p>

              {/* Dots grid representing 100% audited calls */}
              <div className="mt-6 p-4 rounded-xl bg-zinc-950/60 border border-zinc-850">
                <p className="text-[10px] uppercase text-teal-500 mb-2 font-mono">100 Conversation Sample (All Glowing = Audited)</p>
                <div className="grid grid-cols-10 gap-1.5">
                  {Array.from({ length: 100 }).map((_, i) => (
                    <span
                      key={i}
                      className="h-2.5 w-2.5 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(20,184,166,0.8)]"
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-teal-800/40 text-xs font-medium text-teal-400">
              ✅ Total coverage. Absolute safety. Structured daily agent feedback cards.
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Rubrics Demo Section */}
      <section id="interactive-demo" className="mx-auto max-w-6xl px-6 py-16 border-t border-zinc-900">
        <div className="text-center mb-12">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">Interactive Preview</h3>
          <h4 className="mt-2 text-3xl font-bold text-white">How QAScope Scrutinizes Transcripts</h4>
          <p className="mt-2 text-zinc-400 max-w-2xl mx-auto">
            Choose a common compliance vertical below to see QAScope catch violations in agent transcripts in real-time.
          </p>
        </div>

        {/* Campaign Tabs */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab("bfsi-collections")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "bfsi-collections"
                ? "bg-teal-500 text-zinc-950 font-extrabold"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            BFSI Collections
          </button>
          <button
            onClick={() => setActiveTab("bfsi-disclosures")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "bfsi-disclosures"
                ? "bg-teal-500 text-zinc-950 font-extrabold"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            BFSI Card Disclosures
          </button>
          <button
            onClick={() => setActiveTab("telecom-sim")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "telecom-sim"
                ? "bg-teal-500 text-zinc-950 font-extrabold"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            Telecom Sim Swaps
          </button>
          <button
            onClick={() => setActiveTab("ecommerce-refunds")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
              activeTab === "ecommerce-refunds"
                ? "bg-teal-500 text-zinc-950 font-extrabold"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            D2C E-commerce Refunds
          </button>
        </div>

        {/* Tab Display Panel */}
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Transcript Panel */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 font-mono">Agent Transcript</span>
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400 font-bold">CSV/Webhook Stream</span>
              </div>
              
              <div className="rounded-lg bg-zinc-950 p-4 border border-zinc-800 font-mono text-xs leading-relaxed space-y-4 max-h-[300px] overflow-y-auto">
                {campaigns[activeTab].transcript.map((line, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded ${
                      line.highlight
                        ? "bg-red-950/20 border-l-2 border-red-500 text-rose-100"
                        : "text-zinc-300"
                    }`}
                  >
                    <span className="font-bold text-teal-400">{line.speaker}:</span> {line.text}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-zinc-950/80 border border-zinc-800 text-xs text-zinc-400 leading-normal">
              <strong className="text-teal-400">Target SOP: </strong>
              {campaigns[activeTab].sopRule}
            </div>
          </div>

          {/* QAScope Output Panel */}
          <div className="rounded-2xl border border-teal-500/30 bg-zinc-900/60 p-6 flex flex-col justify-between shadow-[0_0_20px_rgba(20,184,166,0.03)]">
            <div>
              <div className="flex justify-between items-center mb-4">
                <span className="text-xs font-semibold uppercase tracking-widest text-zinc-500 font-mono">QAScope Scoring Engine</span>
                <span className="rounded-full bg-teal-950 border border-teal-800/40 px-2.5 py-0.5 text-[10px] font-semibold text-teal-400 uppercase tracking-widest">
                  AI Calibrated
                </span>
              </div>

              {/* Score Display Box */}
              <div className="flex items-center gap-4 p-4 rounded-xl bg-zinc-950 border border-zinc-800">
                <div className="text-center">
                  <span className="text-xs uppercase text-zinc-500 block font-mono">QA Score</span>
                  <span className={`text-4xl font-extrabold block mt-0.5 ${
                    campaigns[activeTab].score < 50 ? "text-rose-500" : "text-amber-500"
                  }`}>
                    {campaigns[activeTab].score}
                    <span className="text-sm font-medium text-zinc-500">/100</span>
                  </span>
                </div>
                <div className="h-10 w-px bg-zinc-800" />
                <div>
                  <span className="text-xs uppercase text-zinc-500 block font-mono">Status Flag</span>
                  <span className={`inline-block mt-1 rounded px-2.5 py-0.5 text-xs font-bold uppercase ${
                    campaigns[activeTab].status === "fail"
                      ? "bg-rose-950 border border-rose-800/40 text-rose-400 animate-pulse"
                      : "bg-amber-950 border border-amber-800/40 text-amber-400"
                  }`}>
                    {campaigns[activeTab].status === "fail" ? "CRITICAL FAIL" : "WARNING"}
                  </span>
                </div>
              </div>

              {/* Reason Details */}
              <div className="mt-4 p-3 rounded-lg bg-rose-950/15 border border-rose-900/30 text-xs font-medium text-rose-400 leading-relaxed font-mono">
                {campaigns[activeTab].failReason}
              </div>

              {/* Coaching summary */}
              <div className="mt-4">
                <span className="text-xs uppercase tracking-wider text-zinc-500 font-mono block mb-1">Generated Coaching Card</span>
                <div className="rounded-lg bg-zinc-950 p-3 border border-zinc-800 text-xs text-zinc-300 italic leading-relaxed">
                  "{campaigns[activeTab].coachingNote}"
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-zinc-800 text-[10px] text-zinc-500 font-mono">
              ⚡ Audited in 12.4s. Escalated to Team Lead queue with 24h SLA.
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Savings ROI Calculator Section */}
      <section id="roi-calculator" className="mx-auto max-w-5xl px-6 py-16 border-t border-zinc-900 bg-zinc-900/10">
        <div className="text-center mb-12">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">Rupee ROI Calculator</h3>
          <h4 className="mt-2 text-3xl font-bold text-white">Compare Your Operational Auditing Cost</h4>
          <p className="mt-2 text-zinc-400 max-w-2xl mx-auto">
            Drag the sliders below to match your BPO campaign dimensions. See how much QAScope saves you in software-vs-labor margins.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Sliders Input Panel */}
          <div className="lg:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-6">
            <h5 className="text-lg font-bold text-white border-b border-zinc-800 pb-3 font-mono">Campaign Configuration</h5>

            {/* Slider 1: Agents */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-zinc-300">Active Agents on Campaign</span>
                <span className="text-teal-400 font-mono">{agents} agents</span>
              </div>
              <input
                type="range"
                min="10"
                max="300"
                step="5"
                value={agents}
                onChange={(e) => setAgents(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>10 agents</span>
                <span>300 agents</span>
              </div>
            </div>

            {/* Slider 2: Monthly Conversations per Agent */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-zinc-300">Avg Monthly Conversations per Agent</span>
                <span className="text-teal-400 font-mono">{ticketsPerAgent} conversations / mo</span>
              </div>
              <input
                type="range"
                min="100"
                max="1500"
                step="50"
                value={ticketsPerAgent}
                onChange={(e) => setTicketsPerAgent(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>100 convos</span>
                <span>1,500 convos</span>
              </div>
            </div>

            {/* Slider 3: Auditor Salary */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-zinc-300">Avg Human QA Salary / mo</span>
                <span className="text-teal-400 font-mono">₹{salary.toLocaleString("en-US")}</span>
              </div>
              <input
                type="range"
                min="20000"
                max="60000"
                step="2500"
                value={salary}
                onChange={(e) => setSalary(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>₹20,000</span>
                <span>₹60,000</span>
              </div>
            </div>

            {/* Slider 3: Auditor Count */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-zinc-300">Auditors Employed (Legacy 5% sample)</span>
                <span className="text-teal-400 font-mono">{auditors} QA auditors</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="1"
                value={auditors}
                onChange={(e) => setAuditors(parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-teal-500"
              />
              <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
                <span>1 auditor</span>
                <span>30 auditors</span>
              </div>
            </div>

            {/* Static volume info */}
            <div className="rounded-lg bg-zinc-950 p-4 border border-zinc-800 grid grid-cols-2 gap-4 text-center">
              <div>
                <span className="text-[10px] uppercase text-zinc-500 block font-mono">Total Monthly Conversations</span>
                <span className="text-lg font-bold text-white mt-1 block font-mono">{conversations.toLocaleString("en-US")}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-zinc-500 block font-mono">QA Process Audit Coverage</span>
                <span className="text-lg font-bold text-teal-400 mt-1 block font-mono">100% of Volume</span>
              </div>
            </div>
          </div>

          {/* Calculator Output Slate */}
          <div className="rounded-2xl border border-teal-500 bg-teal-950/10 p-6 flex flex-col justify-between shadow-[0_0_30px_rgba(20,184,166,0.03)]">
            <div className="space-y-6">
              <h5 className="text-lg font-bold text-white border-b border-teal-905 pb-3 font-mono">Spend Comparison</h5>

              {/* Legacy Cost */}
              <div>
                <span className="text-xs uppercase text-zinc-500 font-mono block">Traditional 5% Manual QA Cost</span>
                <span className="text-2xl font-bold text-zinc-300 mt-1 block font-mono">
                  ₹{traditionalSpend.toLocaleString("en-US")}
                  <span className="text-xs font-normal text-zinc-500"> / mo</span>
                </span>
                <p className="text-[10px] text-zinc-500 mt-1">Based on {auditors} human auditors at ₹{salary.toLocaleString("en-US")}/mo</p>
              </div>

              {/* QAScope Cost */}
              <div>
                <span className="text-xs uppercase text-teal-400 font-mono block">Recommended Option: {recommendedPlanLabel}</span>
                <span className="text-2xl font-extrabold text-teal-400 mt-1 block font-mono">
                  ₹{Math.round(qascopeTotalSpend).toLocaleString("en-US")}
                  <span className="text-xs font-normal text-teal-500"> / mo</span>
                </span>
                
                <div className="rounded bg-zinc-950/60 p-2.5 mt-2 border border-zinc-800 text-[10px] text-zinc-400 space-y-2 font-mono">
                  <div className="border-b border-zinc-800 pb-1 text-[11px] font-bold text-white uppercase tracking-wider">Compare Plan Options:</div>
                  
                  {/* Plan A Breakdown */}
                  <div className={`p-1.5 rounded ${isPlanACheaper ? "bg-teal-950/30 border border-teal-800/40" : ""}`}>
                    <div className="flex justify-between font-semibold text-zinc-200">
                      <span>Plan A (Seat-Based):</span>
                      <span>₹{Math.round(planACost).toLocaleString("en-US")}/mo</span>
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">
                      ₹799/agent × {agents} agents + ₹{Math.round(conversations * 0.20).toLocaleString("en-US")} tokens
                    </div>
                  </div>
                  
                  {/* Plan B Breakdown */}
                  <div className={`p-1.5 rounded ${!isPlanACheaper ? "bg-teal-950/30 border border-teal-800/40" : ""}`}>
                    <div className="flex justify-between font-semibold text-zinc-200">
                      <span>Plan B (Usage-Based):</span>
                      <span>₹{Math.round(planBCost).toLocaleString("en-US")}/mo</span>
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">
                      ₹4,999 flat platform + ₹1.50/convo (₹{Math.round(conversations * 1.50).toLocaleString("en-US")} usage + ₹{Math.round(conversations * 0.20).toLocaleString("en-US")} infra)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Result */}
            <div className="mt-8 pt-6 border-t border-teal-900 text-center">
              <span className="text-xs uppercase text-teal-400 font-mono tracking-widest block">Net Monthly Savings</span>
              <span className="text-4xl font-extrabold text-white mt-2 block font-mono">
                ₹{Math.max(0, Math.round(netMonthlySavings)).toLocaleString("en-US")}
              </span>
              <span className="inline-block mt-3 rounded-full bg-teal-950 border border-teal-800 px-3.5 py-1 text-[10px] font-bold text-teal-400 uppercase animate-pulse">
                95%+ Savings Locked In
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Direct Cloud Ingestion Section */}
      <section id="byok" className="mx-auto max-w-6xl px-6 py-16 border-t border-zinc-900">
        <div className="grid gap-12 lg:grid-cols-2 items-center">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">Process Cost Control</h3>
            <h4 className="mt-2 text-3xl font-bold text-white">Direct Cloud API Processing Model</h4>
            <p className="mt-4 text-zinc-400 leading-relaxed">
              Standard auditing platforms charge high software markups on transaction processing, adding 400% to 800% profit margins on top of standard cloud computation. 
            </p>
            <p className="mt-3 text-zinc-400 leading-relaxed">
              QAScope operates on a direct, secure cloud API model. You securely link your own OpenAI or OpenRouter credential node in the settings console. Audit scoring runs through your dedicated infrastructure connection, billing you at raw cost (~₹0.20 per audit) directly from the cloud provider, eliminating software margins.
            </p>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
                <span className="text-2xl block">🔑</span>
                <h5 className="mt-2 font-bold text-white text-sm">Data Control</h5>
                <p className="mt-1 text-xs text-zinc-500 leading-normal">Your transcripts process securely through your direct network connection, bypassing third-party proxies.</p>
              </div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
                <span className="text-2xl block">📈</span>
                <h5 className="mt-2 font-bold text-white text-sm">Cost Transparency</h5>
                <p className="mt-1 text-xs text-zinc-500 leading-normal">Monitor your exact cloud infrastructure token utilization on your billing console to the paisa.</p>
              </div>
            </div>
          </div>

          {/* Configuration Visual Mockup */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 font-mono text-xs">
              <div className="flex items-center gap-2 border-b border-zinc-800 pb-3 mb-4 text-zinc-500">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <span className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-2">Console → Data Ingestion settings</span>
              </div>
              <div className="space-y-3">
                <div>
                  <span className="text-zinc-500">// Connect secure API credential endpoint</span>
                  <p className="mt-1">
                    <span className="text-teal-400">const</span> connectionConfig = &#123;
                  </p>
                  <p className="pl-4">
                    endpoint: <span className="text-teal-300">"https://openrouter.ai/api/v1"</span>,
                  </p>
                  <p className="pl-4">
                    complianceModel: <span className="text-teal-300">"openai/gpt-4o-mini"</span>,
                  </p>
                  <p className="pl-4">
                    secureKeyHash: <span className="text-amber-500">"sk-or-v1-****************"</span>
                  </p>
                  <p>&#125;;</p>
                </div>
                <div className="h-px bg-zinc-800" />
                <div className="text-[10px] text-zinc-500 leading-normal">
                  <p>✔️ Direct integration with Claude 3.5, Llama 3, Gemini, and custom enterprise endpoints.</p>
                  <p className="mt-1">✔️ Raw cloud processing rates apply. Zero markup added by QAScope.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="mx-auto max-w-5xl px-6 py-20 border-t border-zinc-900">
        <div className="text-center mb-16">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">Service Plan Catalog</h3>
          <h4 className="mt-2 text-3xl font-bold text-white">Simple, Transparent Pricing Plans</h4>
          <p className="mt-2 text-sm text-zinc-400">No complex negotiations. Choose the model that matches your campaign scale.</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
          {/* Plan A card */}
          <div className="rounded-2xl border border-zinc-900 bg-zinc-900/10 p-8 flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-xl">
            <div>
              <div className="inline-flex rounded-full bg-zinc-950 border border-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-400 uppercase tracking-widest font-mono">
                Plan A: Seat-Based
              </div>
              <h4 className="mt-4 text-xl font-bold text-white">Linear Seat Billing</h4>
              <p className="mt-4 text-4xl font-extrabold text-white tracking-tight">
                ₹799
                <span className="text-sm font-medium text-zinc-500"> / active agent / mo</span>
              </p>
              <p className="mt-4 text-xs text-zinc-400 leading-relaxed">
                Perfect for small-to-mid operations and campaign desks looking for flat, linear budgeting without platform fees.
              </p>
              <ul className="mt-6 space-y-3 text-xs text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 font-extrabold">✓</span>
                  <span>100% interaction audits (direct cloud connection)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 font-extrabold">✓</span>
                  <span>Custom compliance rubric + fatal criteria rules</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 font-extrabold">✓</span>
                  <span>Unified Team Lead (TL) review queue</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 font-extrabold">✓</span>
                  <span>Standard webhook ingestion API & CSV uploads</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 font-extrabold">✓</span>
                  <span>Low-score email alerts & saved templates</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/signup"
                className="block w-full rounded-xl bg-zinc-900 py-3 text-center text-xs font-bold text-zinc-200 border border-zinc-800 hover:bg-zinc-800 transition"
              >
                Get Seat-Based Plan
              </Link>
            </div>
          </div>

          {/* Plan B card */}
          <div className="rounded-2xl border border-teal-500 bg-teal-950/10 p-8 flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-xl shadow-lg shadow-teal-950/15 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-500 px-3 py-0.5 text-[9px] font-bold uppercase text-zinc-950 tracking-wider font-mono">
              Cheaper for Scaling Volumes
            </span>
            <div>
              <div className="inline-flex rounded-full bg-teal-950/50 border border-teal-800/40 px-3 py-1 text-xs font-semibold text-teal-400 uppercase tracking-widest font-mono">
                Plan B: Usage-Based
              </div>
              <h4 className="mt-4 text-xl font-bold text-white">Flat Platform Billing</h4>
              <p className="mt-4 text-4xl font-extrabold text-white tracking-tight">
                ₹4,999
                <span className="text-sm font-medium text-zinc-500"> / mo platform + ₹1.50/convo</span>
              </p>
              <p className="mt-4 text-xs text-zinc-400 leading-relaxed">
                Best value for scaling campaigns. Includes **unlimited seats** to prevent single-account sharing risks across QA auditor staff!
              </p>
              <ul className="mt-6 space-y-3 text-xs text-zinc-300">
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 font-extrabold">✓</span>
                  <span className="font-semibold text-teal-300">Unlimited monitored Agent & Auditor logins</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 font-extrabold">✓</span>
                  <span>Everything in Plan A (custom rubrics, alerts)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 font-extrabold">✓</span>
                  <span>Freshdesk, Zoho Desk, and native CRM integrations</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 font-extrabold">✓</span>
                  <span>Live fact-checking against web data sources</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 font-extrabold">✓</span>
                  <span>Automated daily PDF report digest schedules</span>
                </li>
              </ul>
            </div>
            <div className="mt-8">
              <Link
                href="/signup"
                className="block w-full rounded-xl bg-teal-500 py-3 text-center text-xs font-bold text-zinc-950 hover:bg-teal-400 transition shadow-[0_0_15px_rgba(20,184,166,0.25)]"
              >
                Get Usage-Based Plan
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs Section */}
      <section id="faqs" className="mx-auto max-w-4xl px-6 py-20 border-t border-zinc-900">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-white">Frequently Asked Questions</h2>
          <p className="mt-2 text-sm text-zinc-400">Everything you need to know about the platform.</p>
        </div>
        <div className="space-y-6">
          {[
            {
              q: "What is direct cloud infrastructure billing?",
              a: "Instead of charging inflated markups on processing, QAScope connects directly to your own standard cloud API credentials (like OpenAI or OpenRouter). You pay for processing at absolute raw infrastructure cost (approx. ₹0.20 per transcript scored), ensuring maximum cost transparency."
            },
            {
              q: "How does the human review workflow prevent agent disputes?",
              a: "Any automated score falling below your client's SLA threshold or flagged with low evaluation confidence is instantly routed to your Team Leads (Tier 1) review queue. If an agent appeals, the audit is escalated to a Campaign Manager (Tier 2) for final override, maintaining absolute process calibration."
            },
            {
              q: "Is our client data secure and compliant?",
              a: "Absolutely. QAScope enforces strict, multi-tenant Row-Level Security (RLS) policies within your dedicated workspace database, complying with standard data protection policies. Client transcripts, rubrics, and QA scores are completely isolated."
            },
            {
              q: "How do we ingest conversations from our CRM?",
              a: "Under Settings, you can configure unified webhook endpoints to accept JSON logs from any CRM (Freshdesk, Zoho, Zendesk) or telephony dialer. The system handles all interaction formats as a standardized conversation audit stream."
            }
          ].map((faq, idx) => (
            <div key={idx} className="rounded-xl border border-zinc-900 bg-zinc-900/10 p-5">
              <h4 className="text-base font-bold text-white">{faq.q}</h4>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Campaign Lead Capture Form Section */}
      <section id="book-demo" className="mx-auto max-w-4xl px-6 py-16 border-t border-zinc-900">
        <div className="rounded-3xl border border-teal-500/30 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-[200px] w-[200px] rounded-full bg-teal-500/5 blur-[80px] pointer-events-none" />
          
          <div className="max-w-2xl mx-auto text-center mb-8">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">Launch Partner Offer</h3>
            <h4 className="mt-2 text-3xl font-extrabold text-white">Audit 500 Conversations Free</h4>
            <p className="mt-3 text-zinc-400">
              No payment card required. We set up your workspace, calibrate the rubric for your target campaign, and upload your first CSV batch live on a 30-minute call.
            </p>
          </div>

          {formSubmitted ? (
            <div className="rounded-2xl border border-teal-500 bg-teal-950/20 p-8 text-center max-w-md mx-auto space-y-4">
              <span className="text-4xl">🚀</span>
              <h5 className="text-2xl font-bold text-white">Walkthrough Scheduled!</h5>
              <p className="text-sm text-zinc-300 leading-relaxed">
                Thank you, <span className="text-teal-400 font-semibold">{formData.name}</span>. We've received your pilot request for the <span className="text-teal-400 font-semibold">{formData.bpoType}</span> campaign. 
              </p>
              <p className="text-xs text-zinc-500">
                A calendar invitation for your preferred slot (<span className="text-teal-400 font-semibold">{formData.preferredSlot}</span>) and setup instructions have been sent to <span className="text-zinc-400 font-mono">{formData.email}</span>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="max-w-md mx-auto space-y-6">
              {formError && (
                <div className="rounded-lg bg-rose-950/30 border border-rose-900/40 p-3 text-xs text-rose-400 font-medium">
                  ⚠️ {formError}
                </div>
              )}

              {/* Input Name */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase text-zinc-400 tracking-wider font-mono font-bold" htmlFor="name">
                  Full Name
                </label>
                <input
                  required
                  type="text"
                  id="name"
                  name="name"
                  placeholder="e.g. Bonison Vinod"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-655 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Input Email */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase text-zinc-400 tracking-wider font-mono font-bold" htmlFor="email">
                  Work Email Address
                </label>
                <input
                  required
                  type="email"
                  id="email"
                  name="email"
                  placeholder="e.g. name@bpo-operations.com"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-655 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Input Phone */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase text-zinc-400 tracking-wider font-mono font-bold" htmlFor="phone">
                  Phone Number
                </label>
                <input
                  required
                  type="tel"
                  id="phone"
                  name="phone"
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-655 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Input Preferred Slot */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase text-zinc-400 tracking-wider font-mono font-bold" htmlFor="preferredSlot">
                  Preferred Demo Slot / Timing
                </label>
                <input
                  required
                  type="text"
                  id="preferredSlot"
                  name="preferredSlot"
                  placeholder="e.g. Tomorrow 3 PM, or Monday afternoon"
                  value={formData.preferredSlot}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-655 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Select Campaign SOP */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase text-zinc-400 tracking-wider font-mono font-bold" htmlFor="bpoType">
                  Target BPO Campaign Vertical
                </label>
                <select
                  id="bpoType"
                  name="bpoType"
                  value={formData.bpoType}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                >
                  <option value="BFSI Debt Recovery">BFSI Debt Recovery (Collections)</option>
                  <option value="BFSI Credit Cards">BFSI Credit Cards Sales</option>
                  <option value="Telecom Swaps">Telecom SIM Swap & Verification</option>
                  <option value="D2C Refunds">D2C Customer Refunds</option>
                  <option value="Custom SOP">Other Campaign / Custom SOP Rubric</option>
                </select>
              </div>

              {/* Agents Count */}
              <div className="space-y-1.5">
                <label className="text-xs uppercase text-zinc-400 tracking-wider font-mono font-bold" htmlFor="agentCount">
                  Total Active Campaign Agents
                </label>
                <input
                  type="number"
                  id="agentCount"
                  name="agentCount"
                  min="10"
                  max="1000"
                  value={formData.agentCount}
                  onChange={handleInputChange}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={formLoading}
                className="w-full rounded-xl bg-teal-500 py-4 text-center text-sm font-bold text-zinc-950 transition hover:bg-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.2)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {formLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Scheduling Demo Walkthrough…
                  </>
                ) : (
                  "Request 30-Min Walkthrough on My Data"
                )}
              </button>

              {/* Direct Escape Sign In / Sign Up CTA */}
              <div className="text-center text-xs text-zinc-500 mt-4 border-t border-zinc-900 pt-4">
                Skip the walkthrough?{" "}
                <Link href="/login" className="text-teal-400 font-bold hover:underline">
                  Sign In
                </Link>
                {" "}or{" "}
                <Link href="/signup" className="text-teal-400 font-bold hover:underline">
                  Register for Free Trial
                </Link>
              </div>

              <p className="text-[10px] text-zinc-500 text-center leading-normal">
                By clicking, you request a private beta slot for a 500-conversation audit run. We do not sell or share customer support transcripts. Multi-tenant Postgres row-level security is active.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12 text-zinc-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h4 className="text-sm font-bold text-zinc-400 font-mono">QAScope Inc.</h4>
            <p className="text-xs mt-1">© 2026 QAScope. All rights reserved. Made for enterprise call centers and BPOs.</p>
          </div>
          <div className="flex gap-6 text-xs font-mono">
            <Link href="/terms" className="hover:text-zinc-300 hover:underline">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-zinc-300 hover:underline">
              Privacy Policy
            </Link>
            <a href="#gap" className="hover:text-zinc-300 hover:underline">
              The Gap
            </a>
            <a href="#roi-calculator" className="hover:text-zinc-300 hover:underline">
              ROI
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
