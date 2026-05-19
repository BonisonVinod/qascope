"use client";

import { useActionState, useState } from "react";
import { saveLlmSettings, type LlmSettingsState } from "./llm-actions";
import {
  PROVIDER_INFO,
  PROVIDER_ORDER,
  type LlmProvider,
} from "@/lib/llm/client";

export function LlmSettingsForm({
  current,
}: {
  current: {
    provider: LlmProvider | null;
    apiKey: string | null;
    baseUrl: string | null;
    model: string | null;
    embeddingApiKey: string | null;
    embeddingBaseUrl: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState<
    LlmSettingsState,
    FormData
  >(saveLlmSettings, undefined);

  const [provider, setProvider] = useState<LlmProvider>(
    current.provider ?? "openrouter",
  );
  const [apiKey, setApiKey] = useState(current.apiKey ?? "");
  const [baseUrl, setBaseUrl] = useState(current.baseUrl ?? "");
  const [model, setModel] = useState(current.model ?? "");
  const [useSeparateEmbedding, setUseSeparateEmbedding] = useState(
    !!current.embeddingApiKey,
  );
  const [embeddingApiKey, setEmbeddingApiKey] = useState(
    current.embeddingApiKey ?? "",
  );
  const [embeddingBaseUrl, setEmbeddingBaseUrl] = useState(
    current.embeddingBaseUrl ?? "",
  );

  const info = PROVIDER_INFO[provider];

  const maskedKey = current.apiKey
    ? current.apiKey.slice(0, 6) + "…" + current.apiKey.slice(-4)
    : null;
  const maskedEmbeddingKey = current.embeddingApiKey
    ? current.embeddingApiKey.slice(0, 6) + "…" + current.embeddingApiKey.slice(-4)
    : null;

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <label
          htmlFor="provider"
          className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Provider
        </label>
        <select
          id="provider"
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as LlmProvider)}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        >
          {PROVIDER_ORDER.map((p) => (
            <option key={p} value={p}>
              {PROVIDER_INFO[p].label}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-zinc-500">{info.description}</p>
      </div>

      <div>
        <label
          htmlFor="apiKey"
          className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          API key
        </label>
        <input
          id="apiKey"
          name="apiKey"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={
            maskedKey ?? "sk-or-v1-... (paste from your provider dashboard)"
          }
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          {maskedKey
            ? `Currently saved: ${maskedKey}. Leave blank to keep the existing key, or paste a new one to replace it.`
            : "Stored securely in your workspace. Only admins can read or update it."}
        </p>
      </div>

      <div>
        <label
          htmlFor="baseUrl"
          className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Base URL <span className="text-zinc-400">(optional)</span>
        </label>
        <input
          id="baseUrl"
          name="baseUrl"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={info.defaultBaseUrl || "https://your-endpoint.example.com/v1"}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          {info.defaultBaseUrl
            ? `Defaults to ${info.defaultBaseUrl} when blank.`
            : "Required for this provider — paste the endpoint URL from your dashboard."}
        </p>
      </div>

      <div>
        <label
          htmlFor="model"
          className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Model <span className="text-zinc-400">(optional)</span>
        </label>
        <input
          id="model"
          name="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder={info.defaultModel || "model-id"}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          {info.defaultModel
            ? `Defaults to ${info.defaultModel} when blank.`
            : "Required for this provider — copy the model id from your provider's docs."}
        </p>
      </div>

      <div className="rounded-md border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={useSeparateEmbedding}
            onChange={(e) => setUseSeparateEmbedding(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          Use a separate API key for embeddings
        </label>
        <p className="ml-6 mt-1 text-xs text-zinc-500">
          By default the same key powers scoring and embeddings. Tick this if
          you want to use a different (often cheaper) provider for the
          embeddings used in knowledge-base retrieval.
        </p>

        {useSeparateEmbedding && (
          <div className="mt-3 ml-6 space-y-3 border-l-2 border-zinc-200 pl-4 dark:border-zinc-800">
            <div>
              <label
                htmlFor="embeddingApiKey"
                className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
              >
                Embedding API key
              </label>
              <input
                id="embeddingApiKey"
                name="embeddingApiKey"
                type="password"
                autoComplete="off"
                value={embeddingApiKey}
                onChange={(e) => setEmbeddingApiKey(e.target.value)}
                placeholder={maskedEmbeddingKey ?? "sk-... (from your provider)"}
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <p className="mt-1 text-xs text-zinc-500">
                {maskedEmbeddingKey
                  ? `Currently saved: ${maskedEmbeddingKey}. Leave blank to keep, or paste a new one to replace.`
                  : "Used only for /embeddings calls. Stored securely in your workspace."}
              </p>
            </div>
            <div>
              <label
                htmlFor="embeddingBaseUrl"
                className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
              >
                Embedding base URL <span className="text-zinc-400">(optional)</span>
              </label>
              <input
                id="embeddingBaseUrl"
                name="embeddingBaseUrl"
                value={embeddingBaseUrl}
                onChange={(e) => setEmbeddingBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Defaults to OpenAI&rsquo;s embeddings endpoint when blank.
              </p>
            </div>
          </div>
        )}
        {!useSeparateEmbedding && (
          <input type="hidden" name="clearEmbeddingKey" value="1" />
        )}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving..." : "Save provider"}
        </button>
        {state?.ok === true && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            {state.message}
          </span>
        )}
        {state?.ok === false && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {state.error}
          </span>
        )}
      </div>

      <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
        We don&rsquo;t store your data through any third party — every
        QA-engine call goes directly from your QAScope server to the provider
        you select. Your API key never leaves your workspace.
      </p>
    </form>
  );
}
