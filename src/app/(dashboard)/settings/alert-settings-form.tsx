"use client";

/**
 * AlertSettingsForm
 *
 * Admin/QA Manager-only panel to configure workspace-level alert preferences.
 * Renders a card in the Settings page.
 */

import { useState } from "react";

interface AlertSettingsFormProps {
  current: {
    email_on_critical_fail: boolean;
    email_on_low_score: boolean;
    alert_score_threshold: number | null;
  };
  passThreshold: number;
}

export function AlertSettingsForm({ current, passThreshold }: AlertSettingsFormProps) {
  const [emailOnCritical, setEmailOnCritical] = useState(current.email_on_critical_fail);
  const [emailOnLowScore, setEmailOnLowScore] = useState(current.email_on_low_score);
  const [threshold, setThreshold] = useState<number | "">(
    current.alert_score_threshold ?? passThreshold,
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const res = await fetch("/api/alert-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email_on_critical_fail: emailOnCritical,
          email_on_low_score: emailOnLowScore,
          alert_score_threshold: threshold === "" ? null : Number(threshold),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Critical Fail Email */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Critical Fail email alert
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Send an urgent email to all admins and QA managers when a critical fail is detected.
          </p>
        </div>
        <Toggle checked={emailOnCritical} onChange={setEmailOnCritical} id="toggle-critical" />
      </div>

      <hr className="border-zinc-100 dark:border-zinc-800" />

      {/* Low Score Email */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Low score email alert
          </p>
          <p className="mt-0.5 text-xs text-zinc-500">
            Send an alert email when an agent scores below the alert threshold.
          </p>
        </div>
        <Toggle checked={emailOnLowScore} onChange={setEmailOnLowScore} id="toggle-low-score" />
      </div>

      <hr className="border-zinc-100 dark:border-zinc-800" />

      {/* Custom threshold */}
      <div>
        <label
          htmlFor="alert-threshold"
          className="text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Alert score threshold
        </label>
        <p className="mt-0.5 text-xs text-zinc-500">
          Send low-score alerts when the score falls below this value. Your workspace pass
          threshold is{" "}
          <strong className="text-zinc-700 dark:text-zinc-300">{passThreshold}%</strong>.
          Leave this to use the same value.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <input
            id="alert-threshold"
            type="number"
            min={0}
            max={100}
            value={threshold}
            onChange={(e) =>
              setThreshold(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="w-24 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
          />
          <span className="text-sm text-zinc-500">/ 100</span>
        </div>
      </div>

      {/* Info note about push */}
      <div className="rounded-md bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 px-4 py-3">
        <p className="text-xs text-indigo-700 dark:text-indigo-300">
          <strong>Browser push notifications</strong> are personal preferences — each team
          member can enable or disable them individually from their{" "}
          <a href="/my-feedback" className="underline">
            My Feedback
          </a>{" "}
          page.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300 transition"
        >
          {saving ? "Saving…" : "Save preferences"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400 font-medium">
            ✓ Saved
          </span>
        )}
        {error && (
          <span className="text-sm text-red-600 dark:text-red-400">{error}</span>
        )}
      </div>
    </form>
  );
}

function Toggle({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex-shrink-0"
      style={{
        width: 44,
        height: 24,
        borderRadius: 99,
        background: checked ? "#6366f1" : "#d4d4d8",
        border: "none",
        cursor: "pointer",
        position: "relative",
        transition: "background 0.2s",
        padding: 0,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 22 : 2,
          width: 20,
          height: 20,
          borderRadius: "50%",
          background: "#fff",
          transition: "left 0.2s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}
