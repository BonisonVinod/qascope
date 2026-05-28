import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("name, email, is_super_admin")
    .eq("id", user.id)
    .single();

  // Hard block — non super admins get 404'd to avoid info leakage
  if (!me?.is_super_admin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="rounded bg-rose-600 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
              Super Admin
            </span>
            <span className="text-sm font-semibold text-zinc-100">
              QAScope Platform Console
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs text-zinc-400">
            <span>{me.email}</span>
            <Link
              href="/dashboard"
              className="rounded-md bg-zinc-800 px-3 py-1.5 text-zinc-300 transition hover:bg-zinc-700"
            >
              ← Back to app
            </Link>
          </div>
        </div>
        {/* Sub-nav */}
        <div className="mx-auto flex max-w-7xl gap-1 px-6 pb-2">
          {[
            { href: "/admin", label: "Overview" },
            { href: "/admin#clients", label: "All Clients" },
            { href: "/admin#revenue", label: "Revenue" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-1 text-xs text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">{children}</main>
    </div>
  );
}
