import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signout } from "../(auth)/actions";
import { ScoringProgress } from "./scoring-progress";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/upload", label: "Upload" },
  { href: "/rubrics", label: "Rubrics" },
  { href: "/knowledge", label: "Knowledge" },
  { href: "/results", label: "Results" },
  { href: "/review-queue", label: "Review queue" },
  { href: "/reports", label: "Reports" },
  { href: "/billing", label: "Billing" },
  { href: "/settings", label: "Settings" },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: appUser } = await supabase
    .from("users")
    .select("name, email, role, client_id, is_super_admin")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 dark:bg-zinc-950">
      <ScoringProgress />
      <div className="flex flex-1">
        <aside className="sticky top-0 flex h-screen w-60 flex-col overflow-y-auto border-r border-zinc-200 bg-white px-4 py-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8">
          <h1 className="text-lg font-semibold tracking-tight">
            <span className="text-teal-700 dark:text-teal-400">QA</span>
            <span className="text-zinc-900 dark:text-zinc-100">Scope</span>
          </h1>
          <p className="text-xs text-zinc-500">{appUser?.name ?? user.email}</p>
          {appUser?.role && (
            <p className="mt-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
              {appUser.role.replace("_", " ")}
            </p>
          )}
        </div>

        <nav className="flex-1 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-zinc-700 transition hover:bg-teal-50 hover:text-teal-800 dark:text-zinc-300 dark:hover:bg-teal-950/40 dark:hover:text-teal-300"
            >
              {item.label}
            </Link>
          ))}
          {appUser?.is_super_admin && (
            <Link
              href="/admin"
              className="mt-2 block rounded-md px-3 py-2 text-sm font-medium text-rose-600 transition hover:bg-rose-50 hover:text-rose-700 dark:text-rose-400 dark:hover:bg-rose-950/30"
            >
              ⚙ Admin Console
            </Link>
          )}
        </nav>

        <div className="mt-auto pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <div className="flex gap-4 px-3 mb-4 text-[11px] font-medium text-zinc-400">
            <Link href="/terms" className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline">
              Terms
            </Link>
            <Link href="/privacy" className="hover:text-zinc-900 dark:hover:text-zinc-100 hover:underline">
              Privacy
            </Link>
          </div>
          <form action={signout}>
            <button
              type="submit"
              className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

        <main className="flex-1 p-8">{children}</main>
      </div>
    </div>
  );
}
