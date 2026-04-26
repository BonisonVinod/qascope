import Link from "next/link";
import { NewTemplateWizard } from "./new-template-wizard";

export const dynamic = "force-dynamic";

export default function NewTemplatePage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/reports/templates"
          className="text-xs text-zinc-500 hover:underline"
        >
          ← Back to templates
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">New report template</h1>
        <p className="mt-2 max-w-2xl text-sm text-zinc-500">
          Either describe what you want in plain English (one LLM call) or
          fill in the editor directly. Either way, once saved the report runs
          straight from your data — no further LLM cost.
        </p>
      </div>
      <NewTemplateWizard />
    </div>
  );
}
