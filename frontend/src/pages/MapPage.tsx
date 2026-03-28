import { useEffect, useMemo, useState } from "react";
import { CircleMarker, MapContainer, Popup, TileLayer, Tooltip } from "react-leaflet";
import { api } from "../api";
import { MapFlyTo } from "../components/MapFlyTo";
import type { Area, Chapter, EventRow, Partner } from "../types";

import "leaflet/dist/leaflet.css";

const US_CENTER: [number, number] = [39.8283, -98.5795];

function needColor(score: number): string {
  if (score >= 0.75) return "#9B2226";
  if (score >= 0.55) return "#D4A373";
  if (score >= 0.35) return "#E9C46A";
  return "#95D5B2";
}

export function MapPage() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [zipQ, setZipQ] = useState("");
  const [cityQ, setCityQ] = useState("");
  const [stateQ, setStateQ] = useState("");
  const [chapterQ, setChapterQ] = useState("");
  const [typeQ, setTypeQ] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [layerNeed, setLayerNeed] = useState(true);
  const [layerEvents, setLayerEvents] = useState(true);
  const [layerChapters, setLayerChapters] = useState(true);
  const [layerPartners, setLayerPartners] = useState(true);

  const [mapFocus, setMapFocus] = useState<{ center: [number, number]; zoom: number }>({
    center: US_CENTER,
    zoom: 4,
  });
  const [placeQuery, setPlaceQuery] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoErr, setGeoErr] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.areas(), api.events(), api.chapters(), api.partners()])
      .then(([a, e, c, p]) => {
        setAreas(a);
        setEvents(e);
        setChapters(c);
        setPartners(p);
      })
      .catch((e) => setErr(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const chapterList = useMemo(() => {
    const s = new Set<string>();
    events.forEach((ev) => s.add(ev.chapter));
    return Array.from(s).sort();
  }, [events]);

  const typeList = useMemo(() => {
    const s = new Set<string>();
    events.forEach((ev) => s.add(ev.event_type));
    return Array.from(s).sort();
  }, [events]);

  const filteredAreas = useMemo(() => {
    return areas.filter((a) => {
      if (zipQ && !a.zip.includes(zipQ.trim())) return false;
      if (cityQ && !a.city.toLowerCase().includes(cityQ.trim().toLowerCase())) return false;
      if (stateQ && a.state !== stateQ.trim().toUpperCase()) return false;
      return true;
    });
  }, [areas, zipQ, cityQ, stateQ]);

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (zipQ && !ev.zip.includes(zipQ.trim())) return false;
      if (cityQ && !ev.city.toLowerCase().includes(cityQ.trim().toLowerCase())) return false;
      if (stateQ && ev.state !== stateQ.trim().toUpperCase()) return false;
      if (chapterQ && ev.chapter !== chapterQ) return false;
      if (typeQ && ev.event_type !== typeQ) return false;
      if (dateFrom && ev.date < dateFrom) return false;
      if (dateTo && ev.date > dateTo) return false;
      return true;
    });
  }, [events, zipQ, cityQ, stateQ, chapterQ, typeQ, dateFrom, dateTo]);

  async function goToPlace() {
    const q = placeQuery.trim();
    if (!q) return;
    setGeoErr(null);
    setGeoLoading(true);
    try {
      const results = await api.geocode(q);
      if (!results.length) {
        setGeoErr("No results — try a city, state, or full address.");
        return;
      }
      const { lat, lon } = results[0];
      setMapFocus({ center: [lat, lon], zoom: 11 });
    } catch (e) {
      setGeoErr(String(e));
    } finally {
      setGeoLoading(false);
    }
  }

  if (err) {
    return (
      <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-red-800 text-sm">
        Map data failed to load. ({err})
      </div>
    );
  }

  if (loading) {
    return <p className="text-bn-leaf/70">Loading map data…</p>;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl text-bn-forest">Interactive map</h1>
        <p className="mt-1 text-bn-ink/70 max-w-3xl">
          <strong>Need hotspots</strong> use a bundled US-wide demo model (plus India sample zips)—upload your own areas CSV on
          the Data page for real runs. <strong>Search</strong> jumps anywhere (geocoding via OpenStreetMap through the API). Green
          markers are logged events (Memphis only today); chapter pins show chartered hubs.
        </p>
      </div>

      <div className="grid lg:grid-cols-[280px_1fr] gap-4 items-start">
        <aside className="rounded-2xl border border-bn-mint/50 bg-white p-4 shadow-sm space-y-3 text-sm">
          <p className="font-semibold text-bn-forest">Go to place</p>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-bn-mint/60 px-2 py-1.5 text-sm"
              value={placeQuery}
              onChange={(e) => setPlaceQuery(e.target.value)}
              placeholder="e.g. Denver CO, 90210, Mumbai"
              onKeyDown={(e) => e.key === "Enter" && goToPlace()}
            />
            <button
              type="button"
              onClick={goToPlace}
              disabled={geoLoading}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-bn-forest text-white text-sm font-medium disabled:opacity-50"
            >
              {geoLoading ? "…" : "Go"}
            </button>
          </div>
          {geoErr ? <p className="text-xs text-red-600">{geoErr}</p> : null}
          <button
            type="button"
            className="text-xs text-bn-leaf underline"
            onClick={() => setMapFocus({ center: US_CENTER, zoom: 4 })}
          >
            Reset to US view
          </button>

          <p className="font-semibold text-bn-forest pt-2 border-t border-bn-cream">Filters</p>
          <label className="block">
            <span className="text-xs text-bn-ink/50">Zip</span>
            <input
              className="mt-0.5 w-full rounded-lg border border-bn-mint/60 px-2 py-1.5"
              value={zipQ}
              onChange={(e) => setZipQ(e.target.value)}
              placeholder="e.g. 38106"
            />
          </label>
          <label className="block">
            <span className="text-xs text-bn-ink/50">City contains</span>
            <input
              className="mt-0.5 w-full rounded-lg border border-bn-mint/60 px-2 py-1.5"
              value={cityQ}
              onChange={(e) => setCityQ(e.target.value)}
              placeholder="Memphis"
            />
          </label>
          <label className="block">
            <span className="text-xs text-bn-ink/50">State</span>
            <input
              className="mt-0.5 w-full rounded-lg border border-bn-mint/60 px-2 py-1.5"
              value={stateQ}
              onChange={(e) => setStateQ(e.target.value)}
              placeholder="TN"
            />
          </label>
          <label className="block">
            <span className="text-xs text-bn-ink/50">Chapter (events)</span>
            <select
              className="mt-0.5 w-full rounded-lg border border-bn-mint/60 px-2 py-1.5 bg-white"
              value={chapterQ}
              onChange={(e) => setChapterQ(e.target.value)}
            >
              <option value="">All</option>
              {chapterList.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-bn-ink/50">Event type</span>
            <select
              className="mt-0.5 w-full rounded-lg border border-bn-mint/60 px-2 py-1.5 bg-white"
              value={typeQ}
              onChange={(e) => setTypeQ(e.target.value)}
            >
              <option value="">All</option>
              {typeList.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/_/g, " ")}
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-xs text-bn-ink/50">From</span>
              <input
                type="date"
                className="mt-0.5 w-full rounded-lg border border-bn-mint/60 px-1 py-1 text-xs"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
              />
            </label>
            <label className="block">
              <span className="text-xs text-bn-ink/50">To</span>
              <input
                type="date"
                className="mt-0.5 w-full rounded-lg border border-bn-mint/60 px-1 py-1 text-xs"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
              />
            </label>
          </div>

          <p className="font-semibold text-bn-forest pt-2">Layers</p>
          {[
            ["Need heat (zip)", layerNeed, setLayerNeed] as const,
            ["Events", layerEvents, setLayerEvents] as const,
            ["Chapters", layerChapters, setLayerChapters] as const,
            ["Partners", layerPartners, setLayerPartners] as const,
          ].map(([label, on, set]) => (
            <label key={label} className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={on} onChange={() => set(!on)} />
              <span>{label}</span>
            </label>
          ))}

          <p className="text-xs text-bn-ink/50 pt-2">
            Showing {filteredAreas.length} need zones · {filteredEvents.length} events (filtered)
          </p>
        </aside>

        <div className="rounded-2xl border border-bn-mint/50 overflow-hidden shadow-sm h-[min(70vh,620px)] min-h-[420px] z-0">
          <MapContainer center={US_CENTER} zoom={4} className="h-full w-full" scrollWheelZoom>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapFlyTo center={mapFocus.center} zoom={mapFocus.zoom} />
            {layerNeed &&
              filteredAreas.map((a) => (
                <CircleMarker
                  key={`${a.state}-${a.zip}`}
                  center={[a.lat, a.lng]}
                  radius={14 + a.food_insecurity_score * 28}
                  pathOptions={{
                    color: "#1B4332",
                    fillColor: needColor(a.food_insecurity_score),
                    fillOpacity: 0.45,
                    weight: 1,
                  }}
                >
                  <Tooltip direction="top" opacity={0.9}>
                    {a.zip} · need {(a.food_insecurity_score * 100).toFixed(0)}%
                  </Tooltip>
                  <Popup>
                    <div className="text-sm max-w-xs">
                      <p className="font-semibold">
                        {a.city}, {a.state} {a.zip}
                      </p>
                      <p className="text-gray-600">Est. food insecurity: {(a.food_insecurity_score * 100).toFixed(0)}%</p>
                      <p className="text-gray-600">Priority level: {a.need_priority_level}</p>
                      <p className="mt-2 text-gray-700">
                        BetterNature: {a.event_count} events · {Math.round(a.pounds_distributed)} lbs ·{" "}
                        {Math.round(a.meal_kits_distributed)} kits
                      </p>
                      <p className="mt-2 text-xs text-gray-600">{a.recommendation_summary.slice(0, 220)}…</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

            {layerEvents &&
              filteredEvents.map((ev) => (
                <CircleMarker
                  key={ev.id}
                  center={[ev.lat, ev.lng]}
                  radius={7}
                  pathOptions={{
                    color: "#1B4332",
                    fillColor: "#40916C",
                    fillOpacity: 0.95,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{ev.event_type.replace(/_/g, " ")}</p>
                      <p>
                        {ev.chapter} · {ev.date}
                      </p>
                      <p>
                        {ev.pounds} lbs · {ev.meal_kits} kits · {ev.people_served} people
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

            {layerChapters &&
              chapters.map((ch) => (
                <CircleMarker
                  key={ch.name}
                  center={[ch.lat, ch.lng]}
                  radius={ch.has_impact ? 12 : 9}
                  pathOptions={{
                    color: ch.has_impact ? "#1B4332" : "#64748b",
                    fillColor: ch.has_impact ? "#1B4332" : "#94a3b8",
                    fillOpacity: ch.has_impact ? 0.9 : 0.45,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{ch.name}</p>
                      <p>Since {ch.launch_date}</p>
                      <p>
                        Lead: {ch.lead_contact} · {ch.status}
                      </p>
                      {ch.has_impact ? (
                        <p className="mt-1">
                          Logged: {ch.reported_events} events · {ch.reported_meal_kits} kits · {ch.reported_pounds} lbs
                        </p>
                      ) : (
                        <p className="mt-1 text-gray-600">No distribution events logged yet.</p>
                      )}
                    </div>
                  </Popup>
                </CircleMarker>
              ))}

            {layerPartners &&
              partners.map((p) => (
                <CircleMarker
                  key={p.name}
                  center={[p.lat, p.lng]}
                  radius={6}
                  pathOptions={{
                    color: "#6C584C",
                    fillColor: "#F4E3C2",
                    fillOpacity: 0.95,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm">
                      <p className="font-semibold">{p.name}</p>
                      <p className="capitalize">{p.type.replace(/_/g, " ")}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
          </MapContainer>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-bn-ink/60">
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#9B2226]" /> High need
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#D4A373]" /> Elevated
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#40916C]" /> Event
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#1B4332]" /> Chapter (active)
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#94a3b8]" /> Chapter (forming)
        </span>
        <span className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#F4E3C2] border border-[#6C584C]" /> Partner
        </span>
      </div>
    </div>
  );
}
