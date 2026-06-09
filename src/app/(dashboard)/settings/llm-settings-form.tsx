"use client";

import { useActionState, useState } from "react";
import {
  saveLlmSettings,
  testLlmSettings,
  testVoiceTranscriptionSettings,
  type LlmSettingsState,
} from "./llm-actions";
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
    hasApiKey: boolean;
    baseUrl: string | null;
    model: string | null;
    hasEmbeddingApiKey: boolean;
    embeddingBaseUrl: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState<
    LlmSettingsState,
    FormData
  >(saveLlmSettings, undefined);
  const [testState, testAction, testPending] = useActionState<
    LlmSettingsState,
    FormData
  >(testLlmSettings, undefined);
  const [voiceTestState, voiceTestAction, voiceTestPending] = useActionState<
    LlmSettingsState,
    FormData
  >(testVoiceTranscriptionSettings, undefined);

  const [provider, setProvider] = useState<LlmProvider>(
    current.provider ?? "openrouter",
  );
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(current.baseUrl ?? "");
  const [model, setModel] = useState(current.model ?? "");
  const [useSeparateEmbedding, setUseSeparateEmbedding] = useState(
    current.hasEmbeddingApiKey,
  );
  const [embeddingApiKey, setEmbeddingApiKey] = useState("");
  const [embeddingBaseUrl, setEmbeddingBaseUrl] = useState(
    current.embeddingBaseUrl ?? "",
  );

  const info = PROVIDER_INFO[provider];
  const isBedrock = provider === "bedrock";
  const apiKeyLabel = isBedrock ? "AWS Bedrock Bearer token" : "API key";
  const baseUrlLabel = isBedrock ? "AWS Region" : "Base URL";
  const baseUrlOptional = !isBedrock;
  const baseUrlPlaceholder = isBedrock
    ? "us-east-1"
    : info.defaultBaseUrl || "https://your-endpoint.example.com/v1";
  const baseUrlHint = isBedrock
    ? "Required for Bedrock. Use the AWS region where your inference profile lives, e.g. us-east-1."
    : info.defaultBaseUrl
      ? `Defaults to ${info.defaultBaseUrl} when blank.`
      : "Required for this provider. Paste the endpoint URL from your dashboard.";
  const modelPlaceholder = isBedrock
    ? "us.anthropic.claude-3-5-sonnet-20241022-v2:0"
    : info.defaultModel || "model-id";
  const modelHint = isBedrock
    ? "Bedrock inference profile ID. Default is Claude 3.5 Sonnet."
    : info.defaultModel
      ? `Defaults to ${info.defaultModel} when blank.`
      : "Required for this provider. Copy the model id from your provider docs.";

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
          {apiKeyLabel}
        </label>
        <input
          id="apiKey"
          name="apiKey"
          type="password"
          autoComplete="off"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Paste a new key to replace the saved one"
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">
          {current.hasApiKey
            ? "A key is saved. Leave blank to keep it, or paste a new one to replace it."
            : "Stored securely in your workspace. Only admins can update it."}
        </p>
      </div>

      <div>
        <label
          htmlFor="baseUrl"
          className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          {baseUrlLabel}
          {baseUrlOptional && <span className="text-zinc-400"> (optional)</span>}
        </label>
        <input
          id="baseUrl"
          name="baseUrl"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder={baseUrlPlaceholder}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">{baseUrlHint}</p>
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
          placeholder={modelPlaceholder}
          className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <p className="mt-1 text-xs text-zinc-500">{modelHint}</p>
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
          Tick this if your scoring provider does not expose an embeddings
          endpoint, or if you want to use a cheaper embeddings provider.
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
                placeholder="Paste a new embedding key to replace the saved one"
                className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
              <p className="mt-1 text-xs text-zinc-500">
                {current.hasEmbeddingApiKey
                  ? "An embedding key is saved. Leave blank to keep it, or paste a new one to replace it."
                  : "Used only for embeddings. Stored securely in your workspace."}
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
                Defaults to OpenAI&apos;s embeddings endpoint when blank.
              </p>
            </div>
          </div>
        )}
        {!useSeparateEmbedding && (
          <input type="hidden" name="clearEmbeddingKey" value="1" />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
        >
          {pending ? "Saving..." : "Save provider"}
        </button>
        <button
          type="submit"
          formAction={testAction}
          disabled={testPending}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {testPending ? "Testing..." : "Test provider"}
        </button>
        <button
          type="submit"
          formAction={voiceTestAction}
          disabled={voiceTestPending}
          className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          {voiceTestPending ? "Testing voice..." : "Test voice"}
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
        {testState?.ok === true && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            {testState.message}
          </span>
        )}
        {testState?.ok === false && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {testState.error}
          </span>
        )}
        {voiceTestState?.ok === true && (
          <span className="text-xs text-emerald-600 dark:text-emerald-400">
            {voiceTestState.message}
          </span>
        )}
        {voiceTestState?.ok === false && (
          <span className="text-xs text-red-600 dark:text-red-400">
            {voiceTestState.error}
          </span>
        )}
      </div>

      <p className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-xs text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
        Every QA-engine call goes directly from your QAScope server to the
        provider you select. Saved keys are never sent back to the browser.
      </p>
    </form>
  );
}
