export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 dark:bg-zinc-950">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            <span className="text-teal-700 dark:text-teal-400">QA</span>
            <span className="text-zinc-900 dark:text-zinc-100">Scope</span>
          </h1>
          <p className="text-sm text-zinc-500">QA Copilot for small BPOs</p>
        </div>
        {children}
      </div>
    </div>
  );
}
