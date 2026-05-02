import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { UploadForm } from "./upload-form";
import { StatusBadge } from "./status-badge";
import { DeleteButton } from "./delete-button";

export const dynamic = "force-dynamic";

export default async function KnowledgePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch the app user row (name, role, client_id)
  const { data: appUser } = await supabase
    .from("users")
    .select("role, client_id")
    .eq("id", user.id)
    .single();

  const canEdit = appUser?.role === "admin" || appUser?.role === "qa_manager";

  // Fetch the workspace's documents
  const { data: documents } = appUser?.client_id
    ? await supabase
        .from("workspace_documents")
        .select("id, title, source_type, status, uploaded_at, chunk_count")
        .eq("workspace_id", appUser.client_id)
        .order("uploaded_at", { ascending: false })
    : { data: [] };

  const docs = documents ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Knowledge base</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Upload standard operating procedures and documentation. These are
          embedded and used to provide context during scoring.
        </p>
      </div>

      {docs.length === 0 ? (
        <div className="space-y-6">
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center dark:border-zinc-700 dark:bg-zinc-900">
            <p className="text-sm text-zinc-500">
              No documents uploaded yet.
            </p>
          </div>
          {canEdit && <UploadForm />}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
            <table className="w-full text-sm">
              <thead className="border-b border-zinc-200 bg-zinc-50 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-950">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3 text-right">Chunks</th>
                  {canEdit && <th className="px-4 py-3 text-right">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {docs.map((doc) => (
                  <tr key={doc.id}>
                    <td className="px-4 py-3 font-medium">{doc.title}</td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {doc.source_type === "markdown"
                        ? "Markdown"
                        : "Text"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={doc.status} />
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-500">
                      {new Date(doc.uploaded_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right text-xs">
                      {doc.chunk_count ?? 0}
                    </td>
                    {canEdit && (
                      <td className="px-4 py-3 text-right">
                        <DeleteButton documentId={doc.id} title={doc.title} />
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {canEdit && <UploadForm />}
        </>
      )}
    </div>
  );
}
