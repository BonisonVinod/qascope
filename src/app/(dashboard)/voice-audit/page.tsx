import { VoiceAuditForm } from "./voice-audit-form";
import { createClient } from "@/lib/supabase/server";
import { retryVoiceAudit } from "./actions";
import Link from "next/link";

export default async function VoiceAuditPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: appUser } = user
    ? await supabase
        .from("users")
        .select("client_id")
        .eq("id", user.id)
        .single()
    : { data: null };

  const { data: jobs } = appUser?.client_id
    ? await supabase
        .from("voice_audit_jobs")
        .select(`
          id,
          external_call_id,
          source_type,
          source_system,
          status,
          error_message,
          conversation_id,
          recording_url,
          audio_filename,
          created_at,
          updated_at,
          conversations (
            qa_scores (
              id
            )
          )
        `)
        .eq("client_id", appUser.client_id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };
  const { data: events } = appUser?.client_id
    ? await supabase
        .from("voice_audit_events")
        .select("id, event_type, message, created_at")
        .eq("client_id", appUser.client_id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: [] };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Voice audit</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Test post-call voice QA with a demo, recording URL, single audio file,
          or bulk audio plus CSV. QAScope transcribes recordings, creates
          conversations, and runs the same rubric-based audit used by Results
          and Review queue.
        </p>
      </div>

      <VoiceAuditForm />
      <VoiceAuditHistory jobs={jobs ?? []} />
      <VoiceAuditEvents events={events ?? []} />
    </div>
  );
}

function VoiceAuditEvents({
  events,
}: {
  events: { id: string; event_type: string; message: string; created_at: string }[];
}) {
  return (
    <section>
      <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
        Processing log
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-zinc-500">
        Recordings are stored privately for 30 days, then deleted automatically.
        Transcripts, scores, and this audit history remain available.
      </p>
      <div className="mt-3 divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {events.length === 0 ? (
          <p className="p-5 text-sm text-zinc-500">No processing events yet.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="flex items-start justify-between gap-4 px-4 py-3">
              <div>
                <p className="text-sm font-medium">{event.message}</p>
                <p className="mt-1 text-xs uppercase tracking-wider text-zinc-400">
                  {event.event_type.replaceAll("_", " ")}
                </p>
              </div>
              <time className="shrink-0 text-xs text-zinc-500">
                {new Date(event.created_at).toLocaleString("en-IN")}
              </time>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

type VoiceJob = {
  id: string;
  external_call_id: string | null;
  source_type: string;
  source_system: string | null;
  status: string;
  error_message: string | null;
  conversation_id: string | null;
  recording_url: string | null;
  audio_filename: string | null;
  created_at: string;
  updated_at: string;
  conversations?: {
    qa_scores: { id: string }[];
  } | null;
};

function VoiceAuditHistory({ jobs }: { jobs: VoiceJob[] }) {
  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="text-sm font-medium uppercase tracking-wider text-zinc-500">
            Recent voice jobs
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-zinc-500">
            Track transcription, scoring, failures, and completed call audits.
          </p>
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        {jobs.length === 0 ? (
          <p className="p-6 text-sm text-zinc-500">No voice audit jobs yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wider text-zinc-500 dark:bg-zinc-950">
              <tr>
                <th className="px-4 py-3 font-medium">Call</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {jobs.map((job) => (
                <tr key={job.id}>
                  <td className="px-4 py-3 align-top">
                    <p className="font-medium text-zinc-900 dark:text-zinc-100">
                      {job.external_call_id ?? job.audio_filename ?? "Voice job"}
                    </p>
                    {job.error_message && (
                      <p className="mt-1 max-w-md text-xs text-red-600 dark:text-red-300">
                        {job.error_message}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 align-top text-zinc-500">
                    {job.source_system ?? job.source_type}
                  </td>
                  <td className="px-4 py-3 align-top">
                    <StatusPill status={job.status} />
                  </td>
                  <td className="px-4 py-3 align-top text-xs text-zinc-500">
                    {new Date(job.updated_at ?? job.created_at).toLocaleString("en-IN")}
                  </td>
                  <td className="px-4 py-3 align-top">
                    {job.conversation_id && job.status === "completed" ? (
                      (() => {
                        const qaScores = job.conversations?.qa_scores;
                        const scoreId = Array.isArray(qaScores) && qaScores.length > 0 ? qaScores[0]?.id : null;
                        return (
                          <Link
                            href={scoreId ? `/results/${scoreId}` : "/results"}
                            className="text-sm underline"
                          >
                            View results
                          </Link>
                        );
                      })()
                    ) : job.status === "failed" ? (
                      <form action={retryVoiceAudit}>
                        <input type="hidden" name="job_id" value={job.id} />
                        <button
                          type="submit"
                          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-700 dark:hover:bg-zinc-950"
                        >
                          Retry
                        </button>
                      </form>
                    ) : (
                      <span className="text-xs text-zinc-400">Processing</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "completed"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
      : status === "failed"
        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300";

  return (
    <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${cls}`}>
      {status.replace("_", " ")}
    </span>
  );
}
