import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { StatCard } from "../components/StatCard";
import type { Summary } from "../types";

function formatNum(n: number) {
  return n.toLocaleString();
}

export function Dashboard() {
  const [s, setS] = useState<Summary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .summary()
      .then(setS)
      .catch((e) => setErr(String(e)));
  }, []);

  if (err) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
        Could not load dashboard. Is the API running on port 8000? ({err})
      </div>
    );
  }

  if (!s) {
    return <p className="text-bn-leaf/70">Loading summary…</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-bn-forest">Impact at a glance</h1>
        <p className="mt-1 text-bn-ink/70 max-w-2xl">
          Reported totals from logged distributions (Memphis is the only chapter with activity so far). Modeled food
          insecurity for <strong>Memphis, TN</strong> is <strong>not</strong> reduced just because we distributed food
          there—need can stay high even where we operate.
        </p>
        {s.data_note ? <p className="mt-2 text-xs text-bn-ink/50 max-w-3xl">{s.data_note}</p> : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard label="Total meal kits" value={formatNum(s.total_meal_kits)} />
        <StatCard label="Food distributed" value={`${formatNum(s.total_food_lbs)} lbs`} />
        <StatCard label="Individuals served" value={formatNum(s.people_reached)} />
        <StatCard label="Distribution events" value={formatNum(s.total_events)} />
        <StatCard label="Volunteers (reported)" value={formatNum(s.total_volunteers_reported)} />
        <StatCard
          label="Chapters"
          value={`${s.chapters_reporting_impact} / ${s.active_chapters}`}
          hint="Reporting impact vs total chartered"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-bn-mint/50 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg text-bn-forest">Top priority regions (modeled)</h2>
          <p className="text-sm text-bn-ink/60 mt-1">Highest composite scores from demo need data and outreach gaps (Memphis need is not discounted by local distribution).</p>
          <ul className="mt-4 space-y-3">
            {s.top_priority_regions.map((r) => (
              <li
                key={`${r.state ?? ""}-${r.zip}`}
                className="flex justify-between items-baseline gap-4 border-b border-bn-cream pb-3 last:border-0"
              >
                <span>
                  <span className="font-medium text-bn-forest">{r.city}</span>
                  {r.state ? <span className="text-bn-ink/50">, {r.state}</span> : null}{" "}
                  <span className="text-bn-ink/40">{r.zip}</span>
                  <span className="ml-2 text-xs uppercase text-bn-warn">{r.need_level}</span>
                </span>
                <span className="tabular-nums text-bn-leaf font-semibold">{r.priority_score}</span>
              </li>
            ))}
          </ul>
          <Link
            to="/recommendations"
            className="inline-block mt-4 text-sm font-medium text-bn-forest underline-offset-2 hover:underline"
          >
            Open full recommendations →
          </Link>
        </div>

        <div className="rounded-2xl border border-bn-mint/50 bg-gradient-to-br from-bn-forest to-bn-leaf p-6 text-white shadow-sm">
          <h2 className="font-display text-lg">US-wide need map</h2>
          <p className="mt-2 text-sm text-white/85">
            Search any city or zip to fly the map. Hotspots use the bundled demo dataset until you upload your own areas
            CSV.
          </p>
          <Link
            to="/map"
            className="inline-block mt-6 px-4 py-2 rounded-xl bg-white text-bn-forest text-sm font-semibold hover:bg-bn-cream transition-colors"
          >
            Open map
          </Link>
        </div>
      </div>
    </div>
  );
}
