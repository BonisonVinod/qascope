export function StatusBadge({ status }: { status: string }) {
  if (status === "ready") {
    return (
      <span className="inline-flex rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
        Ready
      </span>
    );
  }
  if (status === "processing" || status === "pending") {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950 dark:text-amber-400">
        Processing
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className="inline-flex rounded-full bg-red-50 px-2 py-1 text-xs font-medium text-red-700 dark:bg-red-950 dark:text-red-400">
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex rounded-full bg-zinc-50 px-2 py-1 text-xs font-medium text-zinc-700 dark:bg-zinc-950 dark:text-zinc-400">
      {status}
    </span>
  );
}
