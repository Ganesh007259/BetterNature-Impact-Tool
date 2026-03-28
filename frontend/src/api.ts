import type { Area, Chapter, DatasetMeta, EventRow, Partner, Recommendation, Summary } from "./types";

/** Dev: empty → same origin + Vite proxy. Production (e.g. GitHub Pages): set `VITE_API_BASE` to your deployed API origin, no trailing slash. */
function apiOrigin(): string {
  const raw = import.meta.env.VITE_API_BASE as string | undefined;
  return raw?.replace(/\/$/, "") ?? "";
}

export function apiUrl(path: string): string {
  const o = apiOrigin();
  return o ? `${o}${path}` : path;
}

async function downloadFile(path: string, filename: string) {
  const r = await fetch(apiUrl(path));
  if (!r.ok) throw new Error(await r.text());
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function getJson<T>(path: string): Promise<T> {
  const r = await fetch(apiUrl(path));
  if (!r.ok) throw new Error(await r.text());
  return r.json() as Promise<T>;
}

export const api = {
  meta: () => getJson<DatasetMeta>("/api/meta"),
  summary: () => getJson<Summary>("/api/summary"),
  areas: () => getJson<Area[]>("/api/areas"),
  events: () => getJson<EventRow[]>("/api/events"),
  chapters: () => getJson<Chapter[]>("/api/chapters"),
  partners: () => getJson<Partner[]>("/api/partners"),
  timeseries: () => getJson<{ date: string; pounds: number; meal_kits: number; events: number }[]>(
    "/api/analytics/timeseries"
  ),
  dailyTimeseries: () =>
    getJson<{ date: string; pounds: number; meal_kits: number; events: number }[]>("/api/analytics/daily"),
  chapterBreakdown: () =>
    getJson<
      {
        chapter: string;
        pounds: number;
        meal_kits: number;
        events: number;
        volunteers: number;
        people_served: number;
      }[]
    >("/api/analytics/chapters"),
  gaps: () =>
    getJson<
      {
        zip: string;
        city: string;
        state: string;
        food_insecurity_score: number;
        activity_index: number;
        coverage_gap: number;
        pounds_distributed: number;
        population: number;
      }[]
    >("/api/gaps"),
  recommendations: (limit = 12) => getJson<Recommendation[]>(`/api/recommendations?limit=${limit}`),
  geocode: (q: string) =>
    getJson<{ lat: number; lon: number; display_name: string }[]>(`/api/geocode?q=${encodeURIComponent(q)}`),
  reset: () =>
    fetch(apiUrl("/api/reset"), { method: "POST" }).then((r) => {
      if (!r.ok) throw new Error("reset failed");
      return r.json();
    }),
  uploadAreas: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(apiUrl("/api/upload/areas"), { method: "POST", body: fd });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      const d = (j as { detail?: string }).detail;
      throw new Error(d ?? r.statusText);
    }
    return r.json() as Promise<{ rows_loaded: number; message: string }>;
  },
  exportRecommendationsCsv: () => downloadFile("/api/export/recommendations.csv", "betternature-recommendations.csv"),
  exportEventsCsv: () => downloadFile("/api/export/events.csv", "betternature-events.csv"),
  uploadEvents: async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch(apiUrl("/api/upload/events"), { method: "POST", body: fd });
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      const d = (j as { detail?: string }).detail;
      throw new Error(d ?? r.statusText);
    }
    return r.json() as Promise<{ rows_loaded: number; message: string }>;
  },
};
