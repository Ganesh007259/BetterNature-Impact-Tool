import { useEffect, useState } from "react";
import { api } from "../api";
import type { Recommendation } from "../types";

export function Recommendations() {
  const [rows, setRows] = useState<Recommendation[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    api
      .recommendations(15)
      .then(setRows)
      .catch((e) => setErr(String(e)));
  }, []);

  if (err) {
    return <div className="text-red-700 text-sm">Could not load recommendations. {err}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-bn-forest">Recommendations</h1>
          <p className="mt-1 text-bn-ink/70 max-w-3xl">
            Rule-based priority scoring with narrative summaries (ready to swap for an LLM for richer language). Higher
            scores reflect modeled need and gaps (Memphis, TN does not treat local distribution as lowering need).
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <button
            type="button"
            onClick={() => api.exportRecommendationsCsv().catch((e) => alert(String(e)))}
            className="px-3 py-1.5 rounded-lg border border-bn-mint/60 text-sm font-medium text-bn-forest hover:bg-bn-cream"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => api.exportEventsCsv().catch((e) => alert(String(e)))}
            className="px-3 py-1.5 rounded-lg border border-bn-mint/60 text-sm font-medium text-bn-forest hover:bg-bn-cream"
          >
            Export events CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4">
        {rows.map((r, i) => (
          <article
            key={`${r.zip}-${i}`}
            className="rounded-2xl border border-bn-mint/50 bg-white p-5 shadow-sm flex flex-col sm:flex-row gap-4"
          >
            <div className="sm:w-40 shrink-0">
              <p className="text-xs uppercase tracking-wide text-bn-leaf/70">Priority</p>
              <p className="font-display text-4xl text-bn-forest tabular-nums">{r.priority_score}</p>
              <p className="text-xs mt-1 text-bn-ink/50">
                #{i + 1} · {r.need_priority_level}
              </p>
            </div>
            <div className="flex-1 space-y-2">
              <h2 className="font-semibold text-lg text-bn-forest">
                {r.city}, {r.state} {r.zip}
              </h2>
              <p className="text-sm text-bn-ink/80 leading-relaxed">{r.ai_summary}</p>
              <ul className="list-disc list-inside text-sm text-bn-leaf space-y-1">
                {r.suggested_actions.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
              <p className="text-xs text-bn-ink/45">
                Model inputs: need {(r.food_insecurity_score * 100).toFixed(0)}% · gap {(r.coverage_gap * 100).toFixed(0)}
                % · activity {(r.activity_index * 100).toFixed(0)}% · pop {r.population.toLocaleString()}
              </p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
