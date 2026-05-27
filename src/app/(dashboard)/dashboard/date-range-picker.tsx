"use client";

/**
 * Calendar-style date-range picker, shared by Dashboard and Reports.
 *
 * Two native HTML5 date inputs + Apply / Reset buttons. State is held in
 * the URL (?from=YYYY-MM-DD&to=YYYY-MM-DD) so refreshing the page or
 * sharing the link preserves the window. Native inputs keep the bundle
 * small and give us a real OS-level calendar on every platform.
 *
 * Pass `basePath` to target a different route — e.g. "/reports". Defaults
 * to "/dashboard" for backward compat.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

export function DateRangePicker({
  from,
  to,
  basePath = "/dashboard",
}: {
  from: string;
  to: string;
  basePath?: string;
}) {
  const router = useRouter();
  const [fromVal, setFromVal] = useState(from);
  const [toVal, setToVal] = useState(to);

  function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!fromVal || !toVal) return;
    if (fromVal > toVal) {
      router.push(`${basePath}?from=${toVal}&to=${fromVal}`);
    } else {
      router.push(`${basePath}?from=${fromVal}&to=${toVal}`);
    }
  }

  function reset() {
    router.push(basePath);
  }

  function preset(days: number) {
    const today = new Date();
    const todayUtc = new Date(
      Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
    );
    const start = new Date(todayUtc.getTime() - (days - 1) * 86400 * 1000);
    const f = start.toISOString().slice(0, 10);
    const t = todayUtc.toISOString().slice(0, 10);
    setFromVal(f);
    setToVal(t);
    router.push(`${basePath}?from=${f}&to=${t}`);
  }

  return (
    <form
      onSubmit={apply}
      className="flex flex-col items-end gap-2 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
    >
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          From
          <input
            type="date"
            value={fromVal}
            max={toVal || undefined}
            onChange={(e) => setFromVal(e.target.value)}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <label className="flex flex-col text-[10px] font-medium uppercase tracking-wider text-zinc-500">
          To
          <input
            type="date"
            value={toVal}
            min={fromVal || undefined}
            onChange={(e) => setToVal(e.target.value)}
            className="mt-1 rounded-md border border-zinc-300 bg-white px-2 py-1 text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        </label>
        <button
          type="submit"
          className="rounded-md bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Apply
        </button>
        <button
          type="button"
          onClick={reset}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Reset
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1 text-[11px] text-zinc-500">
        <span>Quick:</span>
        <PresetBtn onClick={() => preset(7)}>7d</PresetBtn>
        <PresetBtn onClick={() => preset(30)}>30d</PresetBtn>
        <PresetBtn onClick={() => preset(90)}>90d</PresetBtn>
        <PresetBtn onClick={() => preset(180)}>6m</PresetBtn>
        <PresetBtn onClick={() => preset(365)}>1y</PresetBtn>
      </div>
    </form>
  );
}

function PresetBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-zinc-200 px-1.5 py-0.5 text-[11px] hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-800"
    >
      {children}
    </button>
  );
}
