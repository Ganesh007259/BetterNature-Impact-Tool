import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { api } from "../api";

export function Analytics() {
  const [ts, setTs] = useState<{ date: string; pounds: number; meal_kits: number; events: number }[]>([]);
  const [ch, setCh] = useState<
    { chapter: string; pounds: number; meal_kits: number; events: number; volunteers: number; people_served: number }[]
  >([]);
  const [gaps, setGaps] = useState<
    {
      zip: string;
      city: string;
      food_insecurity_score: number;
      activity_index: number;
      coverage_gap: number;
      pounds_distributed: number;
    }[]
  >([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.dailyTimeseries(), api.chapterBreakdown(), api.gaps()])
      .then(([t, c, g]) => {
        setTs(t);
        setCh(c);
        setGaps(g.slice(0, 12));
      })
      .catch((e) => setErr(String(e)));
  }, []);

  if (err) {
    return <div className="text-red-700 text-sm">Analytics failed: {err}</div>;
  }

  const gapChart = gaps.map((r) => ({
    zip: r.zip,
    need: Math.round(r.food_insecurity_score * 100),
    outreach: Math.round(r.activity_index * 100),
    gap: Math.round(r.coverage_gap * 100),
  }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-bn-forest">Analytics</h1>
        <p className="mt-1 text-bn-ink/70">
          Trends over time, chapter comparisons, and need vs modeled outreach by zip.
        </p>
        <div className="mt-4 rounded-xl border border-bn-mint/50 bg-bn-cream/50 px-4 py-3 text-sm text-bn-ink/80 space-y-2">
          <p className="font-medium text-bn-forest">How to read the charts</p>
          <ul className="list-disc list-inside space-y-1 text-bn-ink/75">
            <li>
              <strong>Need (est.)</strong> — community food-insecurity signal from the areas dataset (demo or your CSV).
            </li>
            <li>
              <strong>Outreach index</strong> — relative BetterNature activity in that zip vs the rest of the log (not used to
              lower modeled need for Memphis, TN).
            </li>
            <li>
              <strong>Coverage gap</strong> — need × (1 − activity) elsewhere; Memphis TN uses need-only for planning scores.
            </li>
          </ul>
        </div>
      </div>

      <section className="rounded-2xl border border-bn-mint/50 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="font-display text-lg text-bn-forest">Daily food & meal kits</h2>
        <p className="text-sm text-bn-ink/55 mt-1">One row per calendar day from the event log.</p>
        <div className="h-72 mt-4">
          {ts.length === 0 ? (
            <p className="text-sm text-bn-ink/50">No time series yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={54} />
                <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="pounds" name="Food (lbs)" stroke="#1B4332" strokeWidth={2} dot />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="meal_kits"
                  name="Meal kits"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-bn-mint/50 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="font-display text-lg text-bn-forest">Chapter totals</h2>
        <div className="h-80 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ch} layout="vertical" margin={{ left: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="chapter" width={120} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="pounds" name="Food (lbs)" fill="#2D6A4F" radius={[0, 4, 4, 0]} />
              <Bar dataKey="meal_kits" name="Meal kits" fill="#95D5B2" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-2xl border border-bn-mint/50 bg-white p-4 sm:p-6 shadow-sm">
        <h2 className="font-display text-lg text-bn-forest">Need vs outreach (index 0–100)</h2>
        <p className="text-sm text-bn-ink/60 mt-1">Selected zips — compare estimated need to BetterNature activity index.</p>
        <div className="h-80 mt-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={gapChart}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="zip" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="need" name="Need (est.)" fill="#9B2226" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outreach" name="Outreach index" fill="#40916C" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
