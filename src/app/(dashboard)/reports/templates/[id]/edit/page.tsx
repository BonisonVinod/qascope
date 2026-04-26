import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { TemplateForm } from "../../template-form";
import { normalizeConfig } from "@/lib/reports/template-engine";

export const dynamic = "force-dynamic";

export default async function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("report_templates")
    .select("id, name, description, config")
    .eq("id", id)
    .single();
  if (!row) notFound();

  const config = normalizeConfig(row.config);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/reports/templates"
          className="text-xs text-zinc-500 hover:underline"
        >
          ← Back to templates
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Edit template</h1>
      </div>
      <TemplateForm
        mode="edit"
        initial={{
          id: row.id,
          name: row.name,
          description: row.description,
          config,
        }}
      />
    </div>
  );
}
