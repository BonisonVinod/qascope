"use client";

import { useActionState, useState, useEffect } from "react";
import {
  saveLlmSettings,
  testLlmSettings,
  testVoiceTranscriptionSettings,
  type LlmSettingsState,
} from "./llm-actions";
import {
  PROVIDER_INFO,
  PROVIDER_ORDER,
  PROVIDER_MODELS,
  CUSTOM_MODEL_SENTINEL,
  type LlmProvider,
  type ModelEntry,
} from "@/lib/llm/client";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Find the recommended model for a provider, or fall back to the first one. */
function defaultModelForProvider(provider: LlmProvider): string {
  const models = PROVIDER_MODELS[provider];
  const rec = models.find((m) => m.recommended);
  return rec?.id ?? models[0]?.id ?? "";
}

/** Check if the saved model matches any catalog entry for the current provider. */
function isKnownModel(provider: LlmProvider, modelId: string): boolean {
  return PROVIDER_MODELS[provider].some((m) => m.id === modelId);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

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

  // --- Provider state ---
  const [provider, setProvider] = useState<LlmProvider>(
    current.provider ?? "openrouter",
  );

  // --- Model state ---
  // Determine initial model selection: known catalog entry or custom
  const savedModel = current.model ?? "";
  const savedIsKnown =
    current.provider != null && isKnownModel(current.provider, savedModel);

  const [selectedModelId, setSelectedModelId] = useState<string>(
    savedIsKnown ? savedModel : savedModel ? CUSTOM_MODEL_SENTINEL : defaultModelForProvider(current.provider ?? "openrouter"),
  );
  const [customModelText, setCustomModelText] = useState(
    savedIsKnown ? "" : savedModel,
  );

  const isCustomModel = selectedModelId === CUSTOM_MODEL_SENTINEL || PROVIDER_MODELS[provider].length === 0;
  // The actual model value sent in the hidden form field
  const resolvedModel = isCustomModel ? customModelText : selectedModelId;

  // When provider changes, auto-select the recommended model
  useEffect(() => {
    const models = PROVIDER_MODELS[provider];
    if (models.length === 0) {
      // Custom/no catalog — always show text input
      setSelectedModelId(CUSTOM_MODEL_SENTINEL);
      setCustomModelText(PROVIDER_INFO[provider].defaultModel);
    } else {
      setSelectedModelId(defaultModelForProvider(provider));
      setCustomModelText("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  // --- Other fields ---
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState(current.baseUrl ?? "");
  const [useSeparateEmbedding, setUseSeparateEmbedding] = useState(
    current.hasEmbeddingApiKey,
  );
  const [embeddingApiKey, setEmbeddingApiKey] = useState("");
  const [embeddingBaseUrl, setEmbeddingBaseUrl] = useState(
    current.embeddingBaseUrl ?? "",
  );

  const info = PROVIDER_INFO[provider];
  const models: ModelEntry[] = PROVIDER_MODELS[provider];
  const baseUrlOptional = provider !== "azure" && provider !== "custom";
  const baseUrlPlaceholder = info.defaultBaseUrl || "https://your-endpoint.example.com/v1";
  const baseUrlHint = info.defaultBaseUrl
    ? `Defaults to ${info.defaultBaseUrl} when blank.`
    : "Required for this provider. Paste the endpoint URL from your dashboard.";

  return (
    <form action={formAction} className="space-y-5">
      {/* Hidden field that always carries the resolved model value */}
      <input type="hidden" name="model" value={resolvedModel} />

      {/* ── Provider Dropdown ── */}
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

      {/* ── Model Selection ── */}
      <div>
        <label
          htmlFor="modelSelect"
          className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Model
        </label>

        {models.length > 0 ? (
          <>
            <select
              id="modelSelect"
              value={selectedModelId}
              onChange={(e) => {
                setSelectedModelId(e.target.value);
                if (e.target.value !== CUSTOM_MODEL_SENTINEL) {
                  setCustomModelText("");
                }
              }}
              className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            >
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.recommended ? "⭐ " : ""}
                  {m.label}
                  {m.context ? ` (${m.context})` : ""}
                </option>
              ))}
              <option disabled>───────────</option>
              <option value={CUSTOM_MODEL_SENTINEL}>
                ✏️ Custom model ID...
              </option>
            </select>

            {isCustomModel && (
              <input
                id="customModel"
                value={customModelText}
                onChange={(e) => setCustomModelText(e.target.value)}
                placeholder="Enter custom model ID (e.g. gpt-4o-2024-08-06)"
                className="mt-2 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
              />
            )}
          </>
        ) : (
          /* Custom / no catalog — always a text input */
          <input
            id="customModel"
            value={customModelText}
            onChange={(e) => setCustomModelText(e.target.value)}
            placeholder="model-id (e.g. gpt-4o-mini)"
            className="mt-1 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 font-mono text-sm dark:border-zinc-700 dark:bg-zinc-900"
          />
        )}

        <p className="mt-1 text-xs text-zinc-500">
          {isCustomModel
            ? "Type the exact model ID from your provider's docs."
            : info.defaultModel
              ? `Selected model will be used for all QA scoring.`
              : "Required for this provider."}
        </p>
      </div>

      {/* ── API Key ── */}
      <div>
        <label
          htmlFor="apiKey"
          className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          API Key
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

      {/* ── Base URL ── */}
      <div>
        <label
          htmlFor="baseUrl"
          className="block text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          Base URL
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

      {/* ── Separate Embedding Key ── */}
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

      {/* ── Action Buttons ── */}
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
