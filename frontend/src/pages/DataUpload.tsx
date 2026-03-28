import { useState } from "react";
import { api } from "../api";

export function DataUpload() {
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onAreas(f: File | null) {
    if (!f) return;
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await api.uploadAreas(f);
      setMsg(`${r.message} (${r.rows_loaded} rows)`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function onEvents(f: File | null) {
    if (!f) return;
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      const r = await api.uploadEvents(f);
      setMsg(`${r.message} (${r.rows_loaded} rows)`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function reset() {
    setLoading(true);
    setErr(null);
    setMsg(null);
    try {
      await api.reset();
      setMsg("Reloaded seed JSON and overwrote SQLite.");
    } catch (e) {
      setErr(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-display text-3xl text-bn-forest">Data</h1>
        <p className="mt-1 text-bn-ink/70">
          Uploads replace current <strong>areas</strong> and <strong>events</strong> and are <strong>saved to SQLite</strong> (
          <code className="text-xs bg-bn-cream px-1 rounded">backend/data/betternature.db</code>) so they survive API restarts.
          Validation is minimal—use consistent column names.
        </p>
      </div>

      {err ? (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm px-3 py-2">{err}</div>
      ) : null}
      {msg ? (
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm px-3 py-2">{msg}</div>
      ) : null}

      <section className="rounded-2xl border border-bn-mint/50 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-bn-forest">Area need CSV</h2>
        <p className="text-sm text-bn-ink/60">
          Required columns: <code className="text-xs bg-bn-cream px-1 rounded">zip, lat, lng, food_insecurity_score, population</code>
          . Optional: city, state, poverty_rate, need_priority_level.
        </p>
        <input
          type="file"
          accept=".csv"
          disabled={loading}
          onChange={(e) => onAreas(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </section>

      <section className="rounded-2xl border border-bn-mint/50 bg-white p-6 shadow-sm space-y-4">
        <h2 className="font-semibold text-bn-forest">Events CSV</h2>
        <p className="text-sm text-bn-ink/60">
          Required:{" "}
          <code className="text-xs bg-bn-cream px-1 rounded">
            id, chapter, city, state, zip, lat, lng, date, pounds, meal_kits, volunteers, people_served, event_type
          </code>
          . Alias <code className="text-xs">event_id</code> → id, <code className="text-xs">pounds_distributed</code> → pounds.
        </p>
        <input
          type="file"
          accept=".csv"
          disabled={loading}
          onChange={(e) => onEvents(e.target.files?.[0] ?? null)}
          className="text-sm"
        />
      </section>

      <button
        type="button"
        onClick={reset}
        disabled={loading}
        className="px-4 py-2 rounded-xl border border-bn-mint/60 text-bn-forest text-sm font-medium hover:bg-bn-cream disabled:opacity-50"
      >
        Reset to bundled seed data
      </button>
    </div>
  );
}
