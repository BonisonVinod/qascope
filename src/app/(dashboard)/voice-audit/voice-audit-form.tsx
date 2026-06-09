"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import {
  auditVoiceRecording,
  bulkAuditVoiceRecordings,
  type BulkVoiceAuditState,
  type VoiceAuditState,
} from "./actions";

export function VoiceAuditForm() {
  const [mode, setMode] = useState<"demo" | "recording_url" | "single_upload" | "bulk_upload">("demo");
  const [state, formAction, pending] = useActionState<VoiceAuditState, FormData>(
    auditVoiceRecording,
    undefined,
  );
  const [bulkState, bulkAction, bulkPending] = useActionState<
    BulkVoiceAuditState,
    FormData
  >(bulkAuditVoiceRecordings, undefined);

  return (
    <div className="space-y-6">
      <form
        action={mode === "bulk_upload" ? bulkAction : formAction}
        className="space-y-6 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      >
        <input
          type="hidden"
          name="mode"
          value={mode === "demo" ? "sample" : mode === "single_upload" ? "upload" : mode}
        />

        <div className="grid gap-2 sm:grid-cols-4">
          {[
            ["demo", "Run demo audit"],
            ["recording_url", "Recording URL"],
            ["single_upload", "Single audio"],
            ["bulk_upload", "Bulk audio + CSV"],
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMode(key as typeof mode)}
              className={`rounded-md border px-3 py-2 text-sm font-medium ${
                mode === key
                  ? "border-teal-600 bg-teal-50 text-teal-800 dark:border-teal-500 dark:bg-teal-950/40 dark:text-teal-200"
                  : "border-zinc-200 text-zinc-600 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-950"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {mode === "demo" && (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
            Runs a built-in demo conversation through the normal audit flow. No
            audio file is uploaded and no transcription is tested.
          </div>
        )}

        {mode === "recording_url" && (
          <Field label="Recording URL">
            <input
              name="recording_url"
              type="url"
              placeholder="https://your-dialer.com/recordings/call-1001.mp3"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </Field>
        )}

        {mode === "single_upload" && (
          <Field label="Audio file">
            <input
              name="audio"
              type="file"
              accept="audio/*,video/mp4,video/webm"
              className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </Field>
        )}

        {mode === "bulk_upload" && (
          <div className="space-y-4">
            <Field label="Metadata CSV">
              <input
                name="metadata_csv"
                type="file"
                accept=".csv,text/csv"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </Field>
            <Field label="Audio recordings">
              <input
                name="audio_files"
                type="file"
                accept="audio/*,video/mp4,video/webm"
                multiple
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </Field>
            <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 text-xs text-zinc-600 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
              CSV must include <span className="font-mono">call_id</span> and{" "}
              <span className="font-mono">audio_file</span>. Optional columns:
              <span className="font-mono"> agent_name, customer_id, campaign, language, date</span>.
            </div>
          </div>
        )}

        {mode !== "demo" && mode !== "bulk_upload" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Call ID">
              <input
                name="external_call_id"
                placeholder="CALL-1001"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </Field>
            <Field label="Agent name">
              <input
                name="agent_name"
                placeholder="Agent name"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </Field>
            <Field label="Customer ID">
              <input
                name="customer_id"
                placeholder="Optional"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </Field>
            <Field label="Language">
              <input
                name="language"
                placeholder="en, hi, or blank"
                className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </Field>
          </div>
        )}

        <button
          type="submit"
          disabled={mode === "bulk_upload" ? bulkPending : pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending || bulkPending
            ? "Submitting..."
            : mode === "demo"
              ? "Run demo audit"
              : mode === "bulk_upload"
                ? "Audit batch"
                : "Audit recording"}
        </button>
      </form>

      {state && <VoiceAuditResult state={state} />}
      {bulkState && <BulkVoiceAuditResult state={bulkState} />}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </span>
      {children}
    </label>
  );
}

function VoiceAuditResult({ state }: { state: NonNullable<VoiceAuditState> }) {
  if (!state.ok) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {state.error}
      </div>
    );
  }

  if (state.mode === "sample") {
    return (
      <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
        <p className="font-medium">Demo audit completed — Score: {Math.round(state.totalScore)}/100</p>
        <p className="mt-1 text-xs opacity-80">Status: {state.status.replace("_", " ")}</p>
        <div className="mt-3 flex gap-3">
          <Link href={`/results/${state.qaScoreId}`} className="underline">
            Open result
          </Link>
          <Link href="/results" className="underline">
            View all results
          </Link>
        </div>
      </div>
    );
  }

  // Upload or recording URL — job has been queued asynchronously
  return (
    <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-200">
      <p className="font-medium">{state.message}</p>
      <p className="mt-1 text-xs opacity-80">
        Job ID: <span className="font-mono">{state.jobId}</span> · Status: {state.status}
      </p>
      <p className="mt-2 text-xs opacity-70">
        The recording is being transcribed and scored in the background. Refresh this page or check below to track progress.
      </p>
      <div className="mt-3">
        <Link href="/voice-audit" className="underline">
          Check processing status ↓
        </Link>
      </div>
    </div>
  );
}


function BulkVoiceAuditResult({ state }: { state: NonNullable<BulkVoiceAuditState> }) {
  if (!state.ok) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
        {state.error}
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
      <p className="font-medium">
        Batch queued: {state.successCount}/{state.totalRows} recordings.
      </p>
      {state.errors.length > 0 && (
        <ul className="space-y-1 text-xs text-red-700 dark:text-red-300">
          {state.errors.map((error, index) => (
            <li key={`${error.row}-${index}`}>
              Row {error.row}
              {error.callId ? ` (${error.callId})` : ""}: {error.message}
            </li>
          ))}
        </ul>
      )}
      <Link href="/results" className="inline-block underline">
        View results
      </Link>
    </div>
  );
}
