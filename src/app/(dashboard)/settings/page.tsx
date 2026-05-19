import { createClient } from "@/lib/supabase/server";
import { ReviewSettingsForm } from "./review-settings-form";
import { LlmSettingsForm } from "./llm-settings-form";
import type { LlmProvider } from "@/lib/llm/client";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: appUser } = await supabase
    .from("users")
    .select("name, email, role, client_id")
    .eq("id", user!.id)
    .single();

  const canEdit = appUser?.role === "admin" || appUser?.role === "qa_manager";
  const clientId = appUser?.client_id ?? null;

  const { data: client } = clientId
    ? await supabase
        .from("clients")
        .select(
          "name, second_reviewer_user_id, sla_hours, pass_threshold, review_confidence_threshold, llm_provider, llm_api_key, llm_base_url, llm_model, llm_embedding_api_key, llm_embedding_base_url",
        )
        .eq("id", clientId)
        .single()
    : { data: null };

  const { data: teammates } = clientId
    ? await supabase
        .from("users")
        .select("id, name, email, role")
        .eq("client_id", clientId)
        .order("name", { ascending: true })
    : { data: [] };

  const reviewers = (teammates ?? []).map((t) => ({
    id: t.id,
    label: `${t.name ?? t.email}${t.role ? ` · ${t.role.replace("_", " ")}` : ""}`,
  }));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Workspace and account configuration.
        </p>
      </div>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Account
        </h2>
        <div className="mt-3 max-w-md space-y-4 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <Field label="Name" value={appUser?.name ?? "—"} />
          <Field label="Email" value={appUser?.email ?? user?.email ?? "—"} />
          <Field
            label="Role"
            value={appUser?.role?.replace("_", " ") ?? "—"}
          />
          {client?.name && <Field label="Workspace" value={client.name} />}
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Team
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Invite teammates, assign roles, and group them into teams.
        </p>
        <div className="mt-3 max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <a
            href="/settings/team"
            className="inline-flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900"
          >
            Manage team members &rarr;
          </a>
        </div>
      </section>

      {appUser?.role === "admin" && (
        <section>
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            QA engine provider
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
            QAScope works with any provider that speaks the OpenAI Chat
            Completions API. We recommend{" "}
            <a
              href="https://openrouter.ai"
              target="_blank"
              rel="noreferrer"
              className="underline hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              OpenRouter
            </a>{" "}
            (one key, hundreds of models, pay-as-you-go), but OpenAI direct,
            Together AI, Groq, Azure, or any custom endpoint also work. Every
            workspace must supply its own key &mdash; we never bill your
            scoring through ours.
          </p>
          <p className="mt-2 max-w-2xl text-xs text-zinc-500 dark:text-zinc-500">
            One key powers scoring, coaching notes, and the embeddings used
            for knowledge-base retrieval. Some providers (e.g. Groq) don&apos;t
            expose an embeddings endpoint &mdash; in that case, tick &ldquo;Use a
            separate API key for embeddings&rdquo; below and supply an OpenAI
            (or compatible) key alongside.
          </p>

          <div className="mt-3 max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
            <LlmSettingsForm
              current={{
                provider: (client?.llm_provider as LlmProvider | null) ?? null,
                apiKey: client?.llm_api_key ?? null,
                baseUrl: client?.llm_base_url ?? null,
                model: client?.llm_model ?? null,
                embeddingApiKey: client?.llm_embedding_api_key ?? null,
                embeddingBaseUrl: client?.llm_embedding_base_url ?? null,
              }}
            />
          </div>
        </section>
      )}

      <section>
        <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
          Review workflow
        </h2>
        <p className="mt-2 max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
          Flagged scores go through a two-tier review. Anyone can act on the first
          tier (Agree or Disagree). Disagreements escalate to the configured
          second reviewer below. Each tier auto-resolves after the SLA expires.
        </p>

        <div className="mt-3 max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          {canEdit ? (
            <ReviewSettingsForm
              currentSecondReviewer={client?.second_reviewer_user_id ?? null}
              currentSlaHours={client?.sla_hours ?? 24}
              currentPassThreshold={client?.pass_threshold ?? 70}
              currentReviewConfidenceThreshold={
                client?.review_confidence_threshold ?? 70
              }
              reviewers={reviewers}
            />
          ) : (
            <ReadOnlyReviewSettings
              currentSecondReviewer={client?.second_reviewer_user_id ?? null}
              currentSlaHours={client?.sla_hours ?? 24}
              currentPassThreshold={client?.pass_threshold ?? 70}
              currentReviewConfidenceThreshold={
                client?.review_confidence_threshold ?? 70
              }
              reviewers={reviewers}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-sm">{value}</p>
    </div>
  );
}

function ReadOnlyReviewSettings({
  currentSecondReviewer,
  currentSlaHours,
  currentPassThreshold,
  currentReviewConfidenceThreshold,
  reviewers,
}: {
  currentSecondReviewer: string | null;
  currentSlaHours: number;
  currentPassThreshold: number;
  currentReviewConfidenceThreshold: number;
  reviewers: { id: string; label: string }[];
}) {
  const reviewerLabel =
    reviewers.find((r) => r.id === currentSecondReviewer)?.label ?? "(not set)";
  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Second reviewer
        </p>
        <p className="mt-1 text-sm">{reviewerLabel}</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          SLA per tier
        </p>
        <p className="mt-1 text-sm">{currentSlaHours} hours</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Pass threshold
        </p>
        <p className="mt-1 text-sm">{currentPassThreshold}%</p>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          Send to review when confidence below
        </p>
        <p className="mt-1 text-sm">{currentReviewConfidenceThreshold}%</p>
      </div>
      <p className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-500 dark:bg-zinc-950">
        Only admins and QA managers can change these settings.
      </p>
    </div>
  );
}
