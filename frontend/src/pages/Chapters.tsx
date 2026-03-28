import { useEffect, useState } from "react";
import { api } from "../api";
import type { Chapter } from "../types";

export function Chapters() {
  const [rows, setRows] = useState<Chapter[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .chapters()
      .then(setRows)
      .catch((e) => setErr(String(e)));
  }, []);

  if (err) {
    return <div className="text-red-700 text-sm">{err}</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-bn-forest">Chapters</h1>
        <p className="mt-1 text-bn-ink/70 max-w-2xl">
          Memphis is the only chapter with logged distributions today. Texas, Atlanta, Florida, and India are chartered for
          scale-up; metrics will populate automatically as you add events for those chapters.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-bn-mint/50 bg-white shadow-sm">
        <table className="min-w-full text-sm">
          <thead className="bg-bn-cream/80 text-left text-bn-forest">
            <tr>
              <th className="px-4 py-3 font-semibold">Chapter</th>
              <th className="px-4 py-3 font-semibold">Location</th>
              <th className="px-4 py-3 font-semibold">Launch</th>
              <th className="px-4 py-3 font-semibold">Lead</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold tabular-nums">Events logged</th>
              <th className="px-4 py-3 font-semibold tabular-nums">Meal kits</th>
              <th className="px-4 py-3 font-semibold tabular-nums">Food (lbs)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.name} className="border-t border-bn-mint/30 hover:bg-bn-cream/40">
                <td className="px-4 py-3 font-medium text-bn-forest">
                  {c.name}
                  {!c.has_impact ? (
                    <span className="ml-2 text-xs font-normal text-bn-ink/45">(no impact logged)</span>
                  ) : null}
                </td>
                <td className="px-4 py-3">
                  {c.city}, {c.state}
                </td>
                <td className="px-4 py-3 tabular-nums">{c.launch_date}</td>
                <td className="px-4 py-3">{c.lead_contact}</td>
                <td className="px-4 py-3 capitalize">{c.status}</td>
                <td className="px-4 py-3 tabular-nums">{c.reported_events}</td>
                <td className="px-4 py-3 tabular-nums">{c.reported_meal_kits.toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums">{c.reported_pounds.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
