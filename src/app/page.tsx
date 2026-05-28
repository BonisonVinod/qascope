import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // If already authenticated, bypass landing page and go to dashboard
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 selection:bg-teal-500 selection:text-zinc-950">
      {/* Glow effects */}
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
          </div>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="transition hover:text-teal-400">Features</a>
            <a href="#workflow" className="transition hover:text-teal-400">How it Works</a>
            <a href="#pricing" className="transition hover:text-teal-400">Pricing</a>
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
              className="rounded-lg bg-teal-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.3)]"
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto max-w-5xl px-6 pt-20 pb-16 text-center lg:pt-32">
        <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-teal-950/30 px-3.5 py-1 text-xs font-medium text-teal-400">
          <span className="flex h-1.5 w-1.5 rounded-full bg-teal-400 animate-pulse" />
          Next-Generation Call Center AI Auditing
        </div>
        <h2 className="mt-8 text-4xl font-extrabold tracking-tight text-white sm:text-6xl bg-gradient-to-b from-white via-zinc-100 to-zinc-400 bg-clip-text text-transparent leading-none">
          100% Agent Auditing.<br />
          <span className="text-teal-400 bg-gradient-to-r from-teal-400 to-emerald-400 bg-clip-text">Zero Backlog.</span>
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400 leading-relaxed">
          Automate conversation scoring, SLA tracking, and agent coaching. Connect your CRM via webhook, upload your SOPs, and watch your QA coverage skyrocket from 2% to 100% overnight.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <Link
            href="/signup"
            className="rounded-xl bg-teal-500 px-6 py-3.5 text-base font-bold text-zinc-950 transition hover:bg-teal-400 shadow-[0_0_25px_rgba(20,184,166,0.4)]"
          >
            Get Started Free
          </Link>
          <a
            href="#pricing"
            className="rounded-xl border border-zinc-800 bg-zinc-900/60 px-6 py-3.5 text-base font-bold text-zinc-200 transition hover:bg-zinc-800 hover:border-zinc-700"
          >
            View Pricing
          </a>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="mt-16 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl shadow-teal-950/20">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 text-left">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500/80" />
                <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
                <span className="h-3 w-3 rounded-full bg-green-500/80" />
                <span className="ml-2 text-xs text-zinc-500">qascope.com/dashboard</span>
              </div>
              <span className="rounded bg-teal-950 border border-teal-800/40 px-2 py-0.5 text-[10px] font-semibold text-teal-400 uppercase">
                Live Audit Console
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
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Conversations Audited</p>
                <p className="mt-1 text-2xl font-bold text-teal-400">12,481</p>
                <p className="text-[10px] text-zinc-500 mt-1">100% of entire ticket volume</p>
              </div>
              <div className="rounded-lg border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">Human Reviews Pending</p>
                <p className="mt-1 text-2xl font-bold text-rose-500">3</p>
                <p className="text-[10px] text-zinc-500 mt-1">SLA compliant (within 24h)</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Banner / Key Pillars */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20 border-t border-zinc-900">
        <h3 className="text-center text-xs font-semibold uppercase tracking-wider text-zinc-500">
          The QAScope Advantage
        </h3>
        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              title: "100% Volume Coverage",
              description: "Legacy manual QA only reviews a 2% random sample. QAScope audits 100% of your tickets instantly, catching compliance and accuracy gaps that used to slip through.",
              icon: "🎯"
            },
            {
              title: "Bring Your Own Key (BYOK)",
              description: "Provide your own OpenAI or Bedrock API key. We bill purely for seats with absolutely zero markup on AI tokens, making the software 10x more affordable than competitors.",
              icon: "🔑"
            },
            {
              title: "Human-in-the-Loop Review",
              description: "Low-confidence AI scores, critical compliance failures, and agent appeals automatically escalate to your QA managers. AI efficiency backed by human accountability.",
              icon: "🤝"
            }
          ].map((feature) => (
            <div key={feature.title} className="rounded-2xl border border-zinc-900 bg-zinc-900/20 p-6 transition hover:border-zinc-800 hover:bg-zinc-900/30">
              <span className="text-3xl">{feature.icon}</span>
              <h4 className="mt-4 text-lg font-bold text-white">{feature.title}</h4>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it Works / Workflow */}
      <section id="workflow" className="mx-auto max-w-5xl px-6 py-20 border-t border-zinc-900">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">How QAScope Works</h2>
          <p className="mt-2 text-sm text-zinc-400">From raw ticket to verified QA audit in seconds</p>
        </div>
        <div className="mt-16 space-y-12 relative">
          <div className="absolute left-[27px] top-6 bottom-6 w-0.5 bg-zinc-900 hidden md:block" />
          {[
            {
              step: "01",
              title: "Automatic Ticket Ingest",
              description: "Teammates upload standard CSV batches, or your Freshdesk, Zendesk, or website telephony systems POST directly to the QAScope ingest webhook in real time."
            },
            {
              step: "02",
              title: "Live Verification Checking",
              description: "While scoring, the AI automatically queries your company policies, SOP documents, and live order status APIs to verify if the agent gave factual, accurate information."
            },
            {
              step: "03",
              title: "Rubric & Compliance Audit",
              description: "AI scores the interaction against your customized 7-tier rubric, flags critical fatal-rule triggers, and creates an actionable, plain-English coaching note."
            },
            {
              step: "04",
              title: "Human Approval & Appeals",
              description: "Scores below your target threshold or those with low confidence are queued for team leads to review. Agents can appeal any score, which escalates to upper management."
            }
          ].map((item, idx) => (
            <div key={item.step} className="flex flex-col md:flex-row gap-6 relative">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-teal-500/20 bg-teal-950/60 font-bold text-teal-400 z-10">
                {item.step}
              </div>
              <div>
                <h4 className="text-xl font-bold text-white">{item.title}</h4>
                <p className="mt-2 text-zinc-400 leading-relaxed text-sm max-w-2xl">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Tiers Section */}
      <section id="pricing" className="mx-auto max-w-6xl px-6 py-20 border-t border-zinc-900">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-white">Simple, Volume-Based Seat Pricing</h2>
          <p className="mt-2 text-sm text-zinc-400">Enjoy retroactive discounts — your tier rate applies to all seats from seat 1.</p>
        </div>
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {[
            {
              name: "Starter",
              price: "$20",
              seats: "1 – 49 seats",
              desc: "Perfect for pilot operations and small BPO teams looking to automate their basic auditing.",
              btn: "Start Free Trial",
              active: false
            },
            {
              name: "Growth",
              price: "$18",
              seats: "50 – 99 seats",
              desc: "Save 10% on all seats! High-performance settings, webhook channels, and custom templates.",
              btn: "Get Growth Now",
              active: true
            },
            {
              name: "Scale",
              price: "$16",
              seats: "100+ seats",
              desc: "Save 20% on all seats! Deep enterprise RLS protection, multi-tenant managers, and SLA sweeps.",
              btn: "Scale Workspace",
              active: false
            }
          ].map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl border p-6 flex flex-col justify-between transition hover:-translate-y-1 hover:shadow-xl ${
                plan.active
                  ? "border-teal-500 bg-teal-950/10 shadow-lg shadow-teal-950/20 relative"
                  : "border-zinc-900 bg-zinc-900/10"
              }`}
            >
              {plan.active && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal-500 px-3 py-0.5 text-[10px] font-bold uppercase text-zinc-950">
                  Most Popular
                </span>
              )}
              <div>
                <h4 className="text-lg font-bold text-zinc-300">{plan.name}</h4>
                <p className="mt-4 text-4xl font-extrabold text-white">
                  {plan.price}
                  <span className="text-sm font-medium text-zinc-500">/seat/mo</span>
                </p>
                <p className="mt-2 text-xs font-semibold uppercase text-teal-400 tracking-widest">{plan.seats}</p>
                <p className="mt-4 text-xs text-zinc-400 leading-relaxed">{plan.desc}</p>
              </div>
              <div className="mt-6">
                <Link
                  href="/signup"
                  className={`block w-full rounded-xl py-3 text-center text-xs font-bold transition ${
                    plan.active
                      ? "bg-teal-500 text-zinc-950 hover:bg-teal-400"
                      : "bg-zinc-900 text-zinc-200 border border-zinc-800 hover:bg-zinc-800"
                  }`}
                >
                  {plan.btn}
                </Link>
              </div>
            </div>
          ))}
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
              q: "What is Bring Your Own Key (BYOK) billing?",
              a: "BYOK means you input your own LLM provider API keys (OpenAI or AWS Bedrock) in the settings panel. We score conversations using your credentials directly. We never markup your AI usage — you only pay our flat per-seat software fee, making QA operations extremely cost-efficient."
            },
            {
              q: "How does the two-tier human audit/appeals queue work?",
              a: "When AI scores conversations, any score falling below your defined threshold or flagged with low confidence goes into the review queue. A team lead reviews it first (Tier 1). If there is a disagreement, the score is escalated to a configured second reviewer (Tier 2) for final override, protecting agent relations."
            },
            {
              q: "Is our CRM data secure with tenant isolation?",
              a: "Yes. QAScope is built on top of Supabase with strict, multi-tenant Row-Level Security (RLS) policies. Every query has client isolation, ensuring your agents, rubrics, and CRM transcripts are accessible strictly within your workspace."
            },
            {
              q: "How do we connect our CRM via webhook?",
              a: "Under Settings → Webhooks, you can create ingestion tokens. This generates a unique API endpoint for your company. You can configure Zendesk, Freshdesk, or your telephony provider to automatically POST tickets as JSON to this webhook for instantaneous, touchless AI audits."
            }
          ].map((faq, idx) => (
            <div key={idx} className="rounded-xl border border-zinc-900 bg-zinc-900/10 p-5">
              <h4 className="text-base font-bold text-white">{faq.q}</h4>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">{faq.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer (linking to Terms & Privacy) */}
      <footer className="border-t border-zinc-900 bg-zinc-950 py-12 text-zinc-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div>
            <h4 className="text-sm font-bold text-zinc-400">QAScope Inc.</h4>
            <p className="text-xs mt-1">© 2026 QAScope. All rights reserved. Made for enterprise call centers and BPOs.</p>
          </div>
          <div className="flex gap-6 text-xs">
            <Link href="/terms" className="hover:text-zinc-300 hover:underline">
              Terms of Service
            </Link>
            <Link href="/privacy" className="hover:text-zinc-300 hover:underline">
              Privacy Policy
            </Link>
            <a href="#features" className="hover:text-zinc-300 hover:underline">
              Features
            </a>
            <a href="#pricing" className="hover:text-zinc-300 hover:underline">
              Pricing
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
