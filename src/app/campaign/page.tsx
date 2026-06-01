"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CampaignData {
  title: string;
  sopRule: string;
  transcript: { speaker: string; text: string; highlight?: boolean }[];
  score: number;
  status: "fail" | "warning" | "pass";
  failReason: string;
  coachingNote: string;
}

export default function CampaignPage() {
  // ROI Calculator State
  const [agents, setAgents] = useState<number>(50);
  const [salary, setSalary] = useState<number>(35000);
  const [auditors, setAuditors] = useState<number>(5);
  const [ticketsPerAgent, setTicketsPerAgent] = useState<number>(440);
  const [conversations, setConversations] = useState<number>(22000);

  // Auto-adjust conversations when agents change
  useEffect(() => {
    setConversations(agents * ticketsPerAgent);
    // Set a proportional auditor count (1 auditor per 10 agents is standard in legacy 5% QA)
    setAuditors(Math.max(1, Math.ceil(agents / 10)));
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

  // Form Submission State
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    bpoType: "BFSI Debt Recovery",
    agentCount: 50,
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  // Interactive Rubrics Tab State
  const [activeTab, setActiveTab] = useState<string>("bfsi-collections");

  const campaigns: Record<string, CampaignData> = {
    "bfsi-collections": {
      title: "BFSI Debt Recovery (Collections)",
      sopRule: "RBI SOP Rule: Must verify customer full name and date of birth before discussing outstanding loan details. No aggressive language allowed.",
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
      sopRule: "Compliance SOP: Agent must state the Annual Percentage Rate (APR) of 42.6% and late payment fee verbatim before booking the card.",
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
      sopRule: "Security SOP: To prevent SIM hijacking, agent must verify mother's maiden name and alternative phone number prior to confirming sim swap.",
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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-teal-500 selection:text-zinc-950 font-sans">
      {/* Visual background glows */}
      <div className="absolute top-0 left-1/4 h-[500px] w-[500px] rounded-full bg-teal-950/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/2 right-1/4 h-[600px] w-[600px] rounded-full bg-teal-900/10 blur-[150px] pointer-events-none" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-zinc-900 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight">
              <span className="text-teal-400">QA</span>
              <span className="text-zinc-100">Scope</span>
            </h1>
            <span className="rounded-full bg-teal-950 border border-teal-800/50 px-2 py-0.5 text-[10px] font-semibold text-teal-400">
              Launch Campaign
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#problem" className="transition hover:text-teal-400">The 95% Problem</a>
            <a href="#interactive-demo" className="transition hover:text-teal-400">Live Rubric Demo</a>
            <a href="#roi-calculator" className="transition hover:text-teal-400">ROI Calculator</a>
            <a href="#byok" className="transition hover:text-teal-400">BYOK Pricing</a>
          </nav>
          <div className="flex items-center gap-4">
            <a
              href="#book-demo"
              className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-bold text-zinc-950 transition hover:bg-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.3)]"
            >
              Book Pilot
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-6 pt-24 pb-16 text-center lg:pt-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-950/30 px-3.5 py-1 text-xs font-semibold text-teal-400">
          <span className="flex h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
          🇮🇳 Tailored for Indian SMB BPOs & Call Centers
        </div>
        
        <h2 className="mt-8 text-4xl font-extrabold tracking-tight text-white sm:text-6xl bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-tight max-w-4xl mx-auto">
          Stop Sampling. <br />
          <span className="text-teal-400 bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text">
            Audit the Unreviewed 95%.
          </span>
        </h2>
        
        <p className="mx-auto mt-6 max-w-3xl text-lg text-zinc-400 leading-relaxed">
          Traditional manual QA checks only a 5% sample. The other 95% is where compliance penalties, regulatory escapes, and coaching blindspots hide. QAScope scores **100% of your customer conversations** against your exact SOP rubrics instantly.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <a
            href="#book-demo"
            className="rounded-xl bg-teal-500 px-6 py-4 text-base font-bold text-zinc-950 transition hover:bg-teal-400 shadow-[0_0_25px_rgba(20,184,166,0.4)]"
          >
            Start Free Pilot Walkthrough
          </a>
          <a
            href="#interactive-demo"
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-4 text-base font-bold text-zinc-200 transition hover:bg-zinc-800 hover:border-zinc-700"
          >
            See Live Demo
          </a>
        </div>
      </section>

      {/* The 95% Problem Split Section */}
      <section id="problem" className="mx-auto max-w-6xl px-6 py-16 border-t border-zinc-900">
        <div className="text-center mb-12">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-400">The Operations Gap</h3>
          <h4 className="mt-2 text-3xl font-bold text-white">Manual QA is a Compliance Lottery</h4>
          <p className="mt-2 text-zinc-400 max-w-2xl mx-auto">Here is what a 100-agent campaign looks like side-by-side. Where would you rather hide your company's risk?</p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Legacy QA */}
          <div className="rounded-2xl border border-rose-950 bg-rose-950/5 p-8 flex flex-col justify-between">
            <div>
              <div className="inline-flex rounded-full bg-rose-950/40 border border-rose-800/40 px-3 py-1 text-xs font-semibold text-rose-400">
                Legacy Manual QA
              </div>
              <h5 className="mt-4 text-2xl font-bold text-white">5% Random Sampling</h5>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Auditors manually listen to 5 calls per agent per week. The unreviewed 95% goes completely unmonitored. 
              </p>
              
              {/* Dots grid representing unreviewed calls */}
              <div className="mt-6 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
                <p className="text-[10px] uppercase text-zinc-500 mb-2 font-mono">100 Conversation Sample (White = Checked, Muted = Unchecked)</p>
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
          <div className="rounded-2xl border border-teal-500 bg-teal-950/5 p-8 flex flex-col justify-between shadow-[0_0_30px_rgba(20,184,166,0.05)]">
            <div>
              <div className="inline-flex rounded-full bg-teal-950/40 border border-teal-800/40 px-3 py-1 text-xs font-semibold text-teal-400 animate-pulse">
                QAScope Auditing
              </div>
              <h5 className="mt-4 text-2xl font-bold text-white">100% Automated Scoring</h5>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Every uploaded conversation is scored instantly. Critical rule violations and low scorers trigger human escalations.
              </p>

              {/* Dots grid representing 100% audited calls */}
              <div className="mt-6 p-4 rounded-xl bg-zinc-950/60 border border-zinc-800">
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
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "bfsi-collections"
                ? "bg-teal-500 text-zinc-950 font-bold"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            BFSI Collections
          </button>
          <button
            onClick={() => setActiveTab("bfsi-disclosures")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "bfsi-disclosures"
                ? "bg-teal-500 text-zinc-950 font-bold"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            BFSI Card Disclosures
          </button>
          <button
            onClick={() => setActiveTab("telecom-sim")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "telecom-sim"
                ? "bg-teal-500 text-zinc-950 font-bold"
                : "bg-zinc-900 text-zinc-400 hover:bg-zinc-800"
            }`}
          >
            Telecom Sim Swaps
          </button>
          <button
            onClick={() => setActiveTab("ecommerce-refunds")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              activeTab === "ecommerce-refunds"
                ? "bg-teal-500 text-zinc-950 font-bold"
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
                <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-400">CSV/Webhook Stream</span>
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
                <span className="rounded-full bg-teal-950 border border-teal-800/40 px-2.5 py-0.5 text-[10px] font-semibold text-teal-400">
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
                <span className="text-teal-400 font-mono">₹{salary.toLocaleString("en-IN")}</span>
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
                <span className="text-lg font-bold text-white mt-1 block font-mono">{conversations.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase text-zinc-500 block font-mono">QA Process Audit Coverage</span>
                <span className="text-lg font-bold text-teal-400 mt-1 block font-mono">100% of Volume</span>
              </div>
            </div>
          </div>

          {/* Calculator Output Slate */}
          <div className="rounded-2xl border border-teal-500 bg-teal-950/10 p-6 flex flex-col justify-between shadow-[0_0_30px_rgba(20,184,166,0.05)]">
            <div className="space-y-6">
              <h5 className="text-lg font-bold text-white border-b border-teal-900 pb-3 font-mono">Spend Comparison</h5>

              {/* Legacy Cost */}
              <div>
                <span className="text-xs uppercase text-zinc-500 font-mono block">Traditional 5% Manual QA Cost</span>
                <span className="text-2xl font-bold text-zinc-300 mt-1 block font-mono">
                  ₹{traditionalSpend.toLocaleString("en-IN")}
                  <span className="text-xs font-normal text-zinc-500"> / mo</span>
                </span>
                <p className="text-[10px] text-zinc-500 mt-1">Based on {auditors} human auditors at ₹{salary.toLocaleString("en-IN")}/mo</p>
              </div>

              {/* QAScope Cost */}
              <div>
                <span className="text-xs uppercase text-teal-400 font-mono block">Recommended Option: {recommendedPlanLabel}</span>
                <span className="text-2xl font-extrabold text-teal-400 mt-1 block font-mono">
                  ₹{Math.round(qascopeTotalSpend).toLocaleString("en-IN")}
                  <span className="text-xs font-normal text-teal-500"> / mo</span>
                </span>
                
                <div className="rounded bg-zinc-950/60 p-2.5 mt-2 border border-zinc-800 text-[10px] text-zinc-400 space-y-2 font-mono">
                  <div className="border-b border-zinc-800 pb-1 text-[11px] font-bold text-white uppercase tracking-wider">Compare Plan Options:</div>
                  
                  {/* Plan A Breakdown */}
                  <div className={`p-1.5 rounded ${isPlanACheaper ? "bg-teal-950/30 border border-teal-800/40" : ""}`}>
                    <div className="flex justify-between font-semibold text-zinc-200">
                      <span>Plan A (Seat-Based):</span>
                      <span>₹{Math.round(planACost).toLocaleString("en-IN")}/mo</span>
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">
                      ₹799/agent × {agents} agents + ₹{Math.round(conversations * 0.20).toLocaleString("en-IN")} tokens
                    </div>
                  </div>
                  
                  {/* Plan B Breakdown */}
                  <div className={`p-1.5 rounded ${!isPlanACheaper ? "bg-teal-950/30 border border-teal-800/40" : ""}`}>
                    <div className="flex justify-between font-semibold text-zinc-200">
                      <span>Plan B (Usage-Based):</span>
                      <span>₹{Math.round(planBCost).toLocaleString("en-IN")}/mo</span>
                    </div>
                    <div className="text-[9px] text-zinc-500 mt-0.5">
                      ₹4,999 flat platform + ₹1.50/convo (₹{Math.round(conversations * 1.50).toLocaleString("en-IN")} usage + ₹{Math.round(conversations * 0.20).toLocaleString("en-IN")} infra)
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Result */}
            <div className="mt-8 pt-6 border-t border-teal-900 text-center">
              <span className="text-xs uppercase text-teal-400 font-mono tracking-widest block">Net Monthly Savings</span>
              <span className="text-4xl font-extrabold text-white mt-2 block font-mono shadow-teal-500">
                ₹{Math.max(0, Math.round(netMonthlySavings)).toLocaleString("en-IN")}
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

      {/* Campaign Lead Capture Form Section */}
      <section id="book-demo" className="mx-auto max-w-4xl px-6 py-16 border-t border-zinc-900">
        <div className="rounded-3xl border border-teal-500/30 bg-gradient-to-b from-zinc-900/80 to-zinc-950 p-8 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 h-[200px] w-[200px] rounded-full bg-teal-500/5 blur-[80px]" />
          
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
                A calendar invitation and direct setup instructions have been sent to <span className="text-zinc-400 font-mono">{formData.email}</span>.
              </p>
            </div>
          ) : (
            <form onSubmit={handleFormSubmit} className="max-w-md mx-auto space-y-6">
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
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder-zinc-600 outline-none transition focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
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
                className="w-full rounded-xl bg-teal-500 py-4 text-center text-sm font-bold text-zinc-950 transition hover:bg-teal-400 shadow-[0_0_20px_rgba(20,184,166,0.2)]"
              >
                Request 30-Min Walkthrough on My Data
              </button>

              <p className="text-[10px] text-zinc-500 text-center leading-normal">
                By clicking, you request a private beta slot for a 500-conversation audit run. We do not sell or share customer support transcripts. Multi-tenant Postgres row-level security is active.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* Footer linking back to terms */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12 text-zinc-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h4 className="text-sm font-bold text-zinc-400">QAScope Inc.</h4>
            <p className="text-xs mt-1">© 2026 QAScope. All rights reserved. Ex-operator built call center AI QA solutions.</p>
          </div>
          <div className="flex gap-6 text-xs">
            <Link href="/" className="hover:text-zinc-300 hover:underline">
              App Home Page
            </Link>
            <Link href="/terms" className="hover:text-zinc-300 hover:underline">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-zinc-300 hover:underline">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
