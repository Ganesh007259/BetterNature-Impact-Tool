export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-bn-mint/50 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-bn-leaf/70">{label}</p>
      <p className="mt-2 font-display text-2xl sm:text-3xl text-bn-forest tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-bn-ink/50">{hint}</p> : null}
    </div>
  );
}
