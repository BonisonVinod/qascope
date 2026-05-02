import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { signout } from "../(auth)/actions";

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
    .select("name, email, role, client_id")
    .eq("id", user.id)
    .single();

  return (
    <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950">
      <aside className="sticky top-0 flex h-screen w-60 flex-col overflow-y-auto border-r border-zinc-200 bg-white px-4 py-6 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-8">
          <h1 className="text-lg font-semibold tracking-tight">QAScope</h1>
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
              className="block rounded-md px-3 py-2 text-sm text-zinc-700 transition hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <form action={signout} className="mt-4">
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
          >
            Sign out
          </button>
        </form>
      </aside>

      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
