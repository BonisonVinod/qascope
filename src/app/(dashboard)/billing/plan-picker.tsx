"use client";

import { useState } from "react";
import { PLANS, PLAN_ORDER, formatUsd } from "@/lib/billing/plans";
import { CheckoutButton } from "./checkout-button";
import type { PlanName } from "@/lib/database.types";

type Props = {
  currentPlanName: PlanName | null;
  seatsUsed: number;
  isAdmin: boolean;
};

export function PlanPicker({ currentPlanName, seatsUsed, isAdmin }: Props) {
  const [seats, setSeats] = useState<number>(Math.max(1, seatsUsed));

  function handleIncrement() {
    setSeats((prev) => prev + 1);
  }

  function handleDecrement() {
    setSeats((prev) => Math.max(1, prev - 1));
  }

  function handleSeatsChange(val: string) {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num > 0) {
      setSeats(num);
    } else if (val === "") {
      setSeats(0); // allow backspacing
    }
  }

  return (
    <div className="space-y-8">
      {/* Dynamic Seat Selection Control Panel */}
      <div className="relative overflow-hidden rounded-2xl border border-zinc-200 bg-gradient-to-br from-white to-zinc-50/50 p-6 shadow-sm transition-all duration-300 dark:border-zinc-800 dark:from-zinc-950 dark:to-zinc-900/50 dark:shadow-[0_0_30px_rgba(0,0,0,0.3)]">
        {/* Glow decorative effect */}
        <div className="absolute -right-24 -top-24 h-48 w-48 rounded-full bg-teal-500/10 blur-[80px] dark:bg-teal-400/5 pointer-events-none" />
        <div className="absolute -left-24 -bottom-24 h-48 w-48 rounded-full bg-indigo-500/10 blur-[80px] dark:bg-indigo-400/5 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-teal-500" />
              Dynamic Seat Selector
            </h3>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xl">
              Adjust your seat count below. Plan tiers and total pricing recalculate instantly. 
              Your active workspace currently occupies <strong className="text-zinc-700 dark:text-zinc-300">{seatsUsed} seat{seatsUsed === 1 ? "" : "s"}</strong> (active members + invites).
            </p>
            {seats < seatsUsed && (
              <div className="mt-2 inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 border border-amber-200/50 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40 animate-pulse">
                <span>⚠️ Warning: Selecting fewer seats ({seats}) than currently occupied ({seatsUsed}) means some members will be blocked.</span>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center sm:flex-row gap-4 shrink-0">
            {/* Number Selector Control */}
            <div className="flex items-center rounded-xl border border-zinc-200 bg-white p-1.5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
              <button
                type="button"
                onClick={handleDecrement}
                disabled={seats <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 12H6" />
                </svg>
              </button>

              <input
                type="number"
                min="1"
                value={seats === 0 ? "" : seats}
                onChange={(e) => handleSeatsChange(e.target.value)}
                onBlur={() => {
                  if (seats === 0 || isNaN(seats)) setSeats(Math.max(1, seatsUsed));
                }}
                className="h-10 w-20 border-0 bg-transparent text-center text-lg font-bold text-zinc-900 focus:outline-none focus:ring-0 dark:text-zinc-100 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />

              <button
                type="button"
                onClick={handleIncrement}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-900 dark:hover:text-zinc-100"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12M6 12h12" />
                </svg>
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-2">
              {[5, 25, 55, 120].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSeats(preset)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all hover:scale-105 active:scale-95 ${
                    seats === preset
                      ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {preset} seats
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Range Slider for visual feedback */}
        <div className="mt-6">
          <input
            type="range"
            min="1"
            max="150"
            value={seats}
            onChange={(e) => setSeats(parseInt(e.target.value, 10))}
            className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-zinc-200 accent-teal-500 dark:bg-zinc-800 dark:accent-teal-400"
          />
          <div className="mt-2 flex justify-between text-[10px] font-semibold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
            <span>1 Seat (Starter)</span>
            <span>50 Seats (Growth)</span>
            <span>100 Seats (Scale)</span>
            <span>150+ Seats</span>
          </div>
        </div>
      </div>

      {/* Plan picker grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {PLAN_ORDER.map((p) => {
          const plan = PLANS[p];
          const isCurrent = currentPlanName === p;

          // Determine if selected seat count is eligible for this plan card
          const isBelowMin = seats < plan.minSeats;
          const isAboveMax = plan.maxSeats !== -1 && seats > plan.maxSeats;
          const isExcluded = isAboveMax || (p === "pilot" && seats > 1);

          // Calculate seat billing pricing details
          // Plan B is a flat platform fee (no per-seat multiplication)
          const chargedSeats = plan.name === "team" ? 1 : Math.max(plan.minSeats, seats);
          const monthlyTotal = plan.name === "team" ? plan.pricePerSeatUsd : (plan.pricePerSeatUsd * chargedSeats);

          // Highlight the plan card recommended for this seat tier
          const isRecommended =
            !isCurrent &&
            seats >= plan.minSeats &&
            (plan.maxSeats === -1 || seats <= plan.maxSeats);

          return (
            <div
              key={p}
              className={`relative flex flex-col justify-between rounded-2xl border p-6 transition-all duration-300 hover:shadow-lg ${
                isCurrent
                  ? "border-emerald-400 bg-emerald-50/30 shadow-[0_0_20px_rgba(16,185,129,0.05)] dark:border-emerald-700/50 dark:bg-emerald-950/20"
                  : isRecommended
                    ? "border-teal-400 bg-teal-50/20 shadow-[0_0_20px_rgba(20,184,166,0.05)] dark:border-teal-700/50 dark:bg-teal-950/10 scale-[1.02] ring-2 ring-teal-500/20"
                    : isExcluded
                      ? "border-zinc-200 bg-zinc-50/50 opacity-40 hover:opacity-50 dark:border-zinc-800/80 dark:bg-zinc-950/20"
                      : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/60"
              }`}
            >
              {/* Badges / Header Indicators */}
              <div className="absolute -top-3 left-6 flex gap-1.5">
                {isCurrent && (
                  <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-emerald-800 shadow-sm dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-300/30">
                    Current
                  </span>
                )}
                {isRecommended && (
                  <span className="rounded-full bg-teal-100 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-teal-800 shadow-sm dark:bg-teal-950 dark:text-teal-400 border border-teal-300/30 animate-pulse">
                    Recommended
                  </span>
                )}
                {isExcluded && (
                  <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-rose-700 dark:bg-rose-950/30 dark:text-rose-400 border border-rose-200/20">
                    Exceeded
                  </span>
                )}
                {!isExcluded && isBelowMin && (
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border border-blue-200/20">
                    Min {plan.minSeats} seats
                  </span>
                )}
              </div>

              {/* Card Details */}
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2 mt-1">
                  <div>
                    <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                      {plan.label}
                    </h3>
                    <p className="text-xs text-zinc-400 dark:text-zinc-500">
                      {plan.seatRange}
                    </p>
                  </div>
                </div>

                <div className="border-b border-zinc-100 pb-4 dark:border-zinc-800/80">
                  <p className="text-4xl font-black text-zinc-900 dark:text-white tracking-tight">
                    {plan.pricePerSeatUsd === 0 ? (
                      "Free"
                    ) : plan.name === "team" ? (
                      <>
                        {formatUsd(plan.pricePerSeatUsd)}
                        <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">
                          {" "}/ month flat
                        </span>
                      </>
                    ) : (
                      <>
                        {formatUsd(plan.pricePerSeatUsd)}
                        <span className="text-xs font-normal text-zinc-400 dark:text-zinc-500">
                          {" "}/ seat / mo
                        </span>
                      </>
                    )}
                  </p>

                  {!isExcluded && plan.pricePerSeatUsd > 0 && (
                    <div className="mt-2 space-y-0.5">
                      <p className="text-sm font-extrabold text-teal-600 dark:text-teal-400">
                        Total: {formatUsd(monthlyTotal)} / mo
                      </p>
                      <p className="text-[11px] text-zinc-400">
                        {plan.name === "team" ? (
                          <span>Flat base fee (covers unlimited seats)</span>
                        ) : isBelowMin ? (
                          <span>Charged at {plan.minSeats}-seat minimum</span>
                        ) : (
                          <span>Based on {seats} requested seat{seats === 1 ? "" : "s"}</span>
                        )}
                      </p>
                    </div>
                  )}
                </div>

                {/* Savings helper callouts */}
                {plan.name === "team" && !isExcluded && (
                  <p className="rounded-lg bg-teal-50/40 p-2.5 text-xs font-medium text-teal-700 dark:bg-teal-950/10 dark:text-teal-400 border border-teal-200/20">
                    💡 <strong>Plan B Advantage:</strong> Covers unlimited agent & QA logins. You only pay for what you score (₹1.50/chat)!
                  </p>
                )}

                <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                  {plan.description}
                </p>

                <ul className="space-y-2 text-xs">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-zinc-600 dark:text-zinc-300">
                      <span className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400 font-extrabold">
                        ✓
                      </span>
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button Container */}
              <div className="mt-6 pt-4 border-t border-zinc-100 dark:border-zinc-800/80">
                {isExcluded ? (
                  <div className="space-y-2">
                    <button
                      disabled
                      className="w-full rounded-xl bg-zinc-100 py-2.5 text-xs font-bold text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
                    >
                      Plan Limit Exceeded
                    </button>
                    <p className="text-[10px] text-center text-rose-500 font-semibold animate-pulse">
                      {p === "pilot"
                        ? "Trial capped at 1 seat."
                        : `Requires higher tier plan (> ${plan.maxSeats} seats).`}
                    </p>
                  </div>
                ) : (
                  <CheckoutButton
                    planName={p}
                    planLabel={plan.label}
                    pricePerSeat={plan.pricePerSeatUsd}
                    currentPlan={currentPlanName}
                    seatCount={chargedSeats}
                    isAdmin={isAdmin}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
