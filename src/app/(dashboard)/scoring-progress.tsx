"use client";

/**
 * Top-of-page progress bar for long-running scoring jobs.
 *
 * Polls /api/scoring-progress every 3 seconds. When isActive is true, shows
 * a fixed sticky bar across the top of the viewport with "Scored X / Y", a
 * percent fill, and a Stop button. Hides itself when scoring is idle.
 */

import { useEffect, useState, useTransition } from "react";
import { requestScoringStop } from "./results/actions";

type Progress = {
  total: number;
  scored: number;
  isActive: boolean;
  stopRequested: boolean;
  percent: number;
};

const POLL_MS = 3000;
const STALL_WARN_MS = 30_000;

export function ScoringProgress() {
  const [p, setP] = useState<Progress | null>(null);
  const [lastChangeAt, setLastChangeAt] = useState<number>(Date.now());
  const [lastScored, setLastScored] = useState<number>(0);
  const [isStopping, startStop] = useTransition();

  useEffect(() => {
    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const tick = async () => {
      try {
        const res = await fetch("/api/scoring-progress", { cache: "no-store" });
        if (!res.ok) {
          if (mounted) setP(null);
        } else {
          const data = (await res.json()) as Progress;
          if (mounted) {
            setP(data);
            if (data.scored !== lastScored) {
              setLastScored(data.scored);
              setLastChangeAt(Date.now());
            }
          }
        }
      } catch {
        // retry on next tick
      } finally {
        if (mounted) timer = setTimeout(tick, POLL_MS);
      }
    };
    tick();

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!p || !p.isActive) return null;

  const stalled = Date.now() - lastChangeAt > STALL_WARN_MS;
  const stopping = p.stopRequested || isStopping;

  const dotClass = stopping
    ? "bg-zinc-400"
    : stalled
      ? "bg-amber-500"
      : "bg-emerald-500";
  const fillClass = stopping
    ? "bg-zinc-400"
    : stalled
      ? "bg-amber-500"
      : "bg-emerald-500";

  let label: string;
  if (stopping) {
    label = `Stopping… we let the conversation already in progress finish, then exit. ${p.scored} of ${p.total} done.`;
  } else if (stalled) {
    label = `Scoring is slow — your QA engine provider may be rate-limited. ${p.scored} of ${p.total} done.`;
  } else {
    label = `Scoring conversations… ${p.scored} of ${p.total} (${p.percent}%)`;
  }

  return (
    <div className="sticky top-0 z-50 w-full border-b border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2">
        <div className="flex flex-1 items-center gap-3">
          <span className={`inline-flex h-2 w-2 animate-pulse rounded-full ${dotClass}`} />
          <p className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
            {label}
          </p>
        </div>
        <div className="hidden flex-1 sm:block">
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className={`h-full transition-all duration-700 ${fillClass}`}
              style={{ width: `${Math.max(2, p.percent)}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          disabled={stopping}
          onClick={() => {
            startStop(async () => {
              await requestScoringStop();
            });
          }}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1 text-xs font-medium text-zinc-700 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {stopping ? "Stopping…" : "Stop"}
        </button>
      </div>
    </div>
  );
}
