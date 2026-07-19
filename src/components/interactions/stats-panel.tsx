export function StatsPanel({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <div className="flex flex-col gap-1 rounded-xl border border-neutral-200 p-3 text-xs dark:border-neutral-800">
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-3 py-0.5">
          <span className="text-neutral-400">{r.label}</span>
          <span className="font-medium">{r.value}</span>
        </p>
      ))}
    </div>
  );
}
