import { useEffect, useState } from "react";
import { api } from "../api";
import type { DatasetMeta } from "../types";

export function DatasetInfo() {
  const [m, setM] = useState<DatasetMeta | null>(null);

  useEffect(() => {
    api
      .meta()
      .then(setM)
      .catch(() => setM(null));
  }, []);

  if (!m) return null;

  const saved = m.updated_at
    ? new Date(m.updated_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : null;

  return (
    <div className="rounded-xl border border-bn-mint/40 bg-white/80 px-3 py-2 text-xs text-bn-ink/70 space-y-1">
      <p>
        <span className="font-medium text-bn-forest">Dataset</span> · v{m.app_version} · {m.areas_count} need rows ·{" "}
        {m.events_count} events
        {saved ? <> · last save {saved}</> : null}
      </p>
      <p className="text-bn-ink/55">{m.persistence}</p>
    </div>
  );
}
