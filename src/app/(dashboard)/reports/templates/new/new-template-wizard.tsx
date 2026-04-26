"use client";

import { useActionState, useState } from "react";
import { TemplateForm } from "../template-form";
import {
  generateConfigFromDescription,
  type NlGenerateState,
} from "../nl-actions";
import {
  DEFAULT_TEMPLATE_CONFIG,
  type ReportTemplateConfig,
} from "@/lib/reports/template-engine";

/**
 * Two-stage create flow:
 *   Stage A: optional plain-English prompt that calls the LLM once and
 *            pre-fills the structured editor.
 *   Stage B: the structured editor (always visible) — the manager tweaks
 *            and clicks Save & run. After save, runs cost zero tokens.
 *
 * The stage-A "Generate" button is purely optional. If you skip it, the
 * editor still defaults to a sensible config and you can fill it in by hand.
 */
export function NewTemplateWizard() {
  const [state, formAction, pending] = useActionState<
    NlGenerateState,
    FormData
  >(generateConfigFromDescription, undefined);

  const [config, setConfig] = useState<ReportTemplateConfig>(
    DEFAULT_TEMPLATE_CONFIG,
  );
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  // Bumping this remounts TemplateForm so it picks up the new `initial`.
  const [formKey, setFormKey] = useState(0);

  const applyGenerated = () => {
    if (state?.ok === true) {
      setConfig(state.config);
      setDescription(state.description);
      // Suggest a name if the field is still empty.
      if (!name) {
        const auto =
          state.description.length > 60
            ? state.description.slice(0, 57).trim() + "…"
            : state.description;
        setName(auto);
      }
      setFormKey((k) => k + 1);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Describe your report (optional)
        </h2>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          Type what you want to see in plain English. We&rsquo;ll convert it to
          a structured config and pre-fill the editor below. This step uses
          one OpenAI call; once saved, future runs are LLM-free.
        </p>
        <form action={formAction} className="mt-3 space-y-3">
          <textarea
            name="description"
            rows={3}
            placeholder="e.g. Top 10 agents in Mumbai-Tier2 below 70% this week, sorted by lowest score"
            className="block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={pending}
              className="rounded-md border border-zinc-900 bg-white px-3 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-100 dark:bg-zinc-900 dark:text-zinc-100"
            >
              {pending ? "Thinking..." : "Generate config"}
            </button>
            {state?.ok === true && (
              <>
                <span className="text-xs text-emerald-700 dark:text-emerald-400">
                  Got it. Click &ldquo;Use this&rdquo; to load it into the
                  editor.
                </span>
                <button
                  type="button"
                  onClick={applyGenerated}
                  className="rounded-md bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  Use this
                </button>
              </>
            )}
            {state?.ok === false && (
              <span className="text-xs text-red-600 dark:text-red-400">
                {state.error}
              </span>
            )}
          </div>
          {state?.ok === true && (
            <details className="text-xs text-zinc-500">
              <summary className="cursor-pointer">Preview generated config</summary>
              <pre className="mt-2 max-h-40 overflow-auto rounded-md border border-zinc-200 bg-zinc-50 p-2 text-[11px] dark:border-zinc-800 dark:bg-zinc-950">
                {JSON.stringify(state.config, null, 2)}
              </pre>
            </details>
          )}
        </form>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Structured editor
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Tweak any field, then save. The editor is the source of truth — even
          if you used the description above, what you save is what runs.
        </p>
        <div className="mt-4">
          <TemplateForm
            key={formKey}
            mode="create"
            initial={{
              id: "",
              name,
              description,
              config,
            }}
          />
        </div>
      </section>
    </div>
  );
}
