from __future__ import annotations

import csv
import json
import urllib.error
import urllib.parse
import urllib.request
from io import StringIO
from typing import Any

from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response

from .store import DataStore

app = FastAPI(title="BetterNature Impact API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

store = DataStore()


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/api/geocode")
def geocode(q: str = Query(..., min_length=2, max_length=200)) -> list[dict[str, Any]]:
    """Proxy to OpenStreetMap Nominatim (respect their usage policy for production)."""
    params = urllib.parse.urlencode({"q": q, "format": "json", "limit": "5"})
    url = f"https://nominatim.openstreetmap.org/search?{params}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "BetterNatureImpactTool/1.0 (nonprofit internal demo)"},
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            raw = json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Geocoder error: {e}") from e
    except OSError as e:
        raise HTTPException(status_code=502, detail=f"Geocoder unreachable: {e}") from e
    out: list[dict[str, Any]] = []
    for row in raw:
        try:
            out.append(
                {
                    "lat": float(row["lat"]),
                    "lon": float(row["lon"]),
                    "display_name": str(row.get("display_name", "")),
                }
            )
        except (KeyError, TypeError, ValueError):
            continue
    return out


@app.get("/api/meta")
def meta() -> dict[str, Any]:
    return store.dataset_meta()


@app.get("/api/summary")
def summary() -> dict[str, Any]:
    return store.summary()


def _csv_response(rows: list[dict[str, Any]], filename: str) -> Response:
    if not rows:
        return Response(
            content="",
            media_type="text/csv; charset=utf-8",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'},
        )
    cols = list(rows[0].keys())
    buf = StringIO()
    w = csv.DictWriter(buf, fieldnames=cols, extrasaction="ignore")
    w.writeheader()
    for r in rows:
        w.writerow({k: _csv_cell(r.get(k)) for k in cols})
    return Response(
        content=buf.getvalue(),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


def _csv_cell(v: Any) -> str:
    if v is None:
        return ""
    if isinstance(v, (list, tuple, dict)):
        return json.dumps(v)
    return str(v)


REC_EXPORT_COLS = [
    "zip",
    "city",
    "state",
    "priority_score",
    "food_insecurity_score",
    "coverage_gap",
    "activity_index",
    "population",
    "need_priority_level",
    "pounds_distributed",
    "meal_kits_distributed",
    "event_count",
    "need_independent_of_local_distribution",
    "recommendation_summary",
]


@app.get("/api/export/recommendations.csv")
def export_recommendations_csv() -> Response:
    raw = store.enriched_areas()
    rows = [{c: r.get(c) for c in REC_EXPORT_COLS} for r in raw]
    return _csv_response(rows, "betternature-recommendations.csv")


@app.get("/api/export/events.csv")
def export_events_csv() -> Response:
    return _csv_response(store.events, "betternature-events.csv")


@app.get("/api/areas")
def areas() -> list[dict[str, Any]]:
    return store.enriched_areas()


@app.get("/api/events")
def events() -> list[dict[str, Any]]:
    return store.events


@app.get("/api/chapters")
def chapters() -> list[dict[str, Any]]:
    return store.chapters_enriched()


@app.get("/api/analytics/daily")
def analytics_daily() -> list[dict[str, Any]]:
    return store.daily_timeseries()


@app.get("/api/partners")
def partners() -> list[dict[str, Any]]:
    return store.partners


@app.get("/api/analytics/timeseries")
def timeseries() -> list[dict[str, Any]]:
    return store.time_series()


@app.get("/api/analytics/chapters")
def analytics_chapters() -> list[dict[str, Any]]:
    return store.chapter_breakdown()


@app.get("/api/gaps")
def gaps() -> list[dict[str, Any]]:
    return store.gaps()


@app.get("/api/recommendations")
def recommendations(limit: int = 12) -> list[dict[str, Any]]:
    rows = store.enriched_areas()[: max(1, min(limit, 50))]
    return [
        {
            "zip": r["zip"],
            "city": r["city"],
            "state": r["state"],
            "priority_score": r["priority_score"],
            "food_insecurity_score": r["food_insecurity_score"],
            "coverage_gap": r["coverage_gap"],
            "activity_index": r["activity_index"],
            "population": r["population"],
            "need_priority_level": r["need_priority_level"],
            "suggested_actions": _suggested_actions(r),
            "ai_summary": r["recommendation_summary"],
        }
        for r in rows
    ]


def _suggested_actions(r: dict[str, Any]) -> list[str]:
    actions: list[str] = []
    if r["coverage_gap"] > 0.45:
        actions.append("Schedule additional monthly meal-kit distribution in this zip.")
    if r["food_insecurity_score"] > 0.75 and r["event_count"] < 2:
        actions.append("Prioritize community meal or pantry pop-up to establish presence.")
    if r["meal_kits_distributed"] < 100 and r["population"] > 35000:
        actions.append("Scale meal-kit capacity—large population with limited kit delivery.")
    if not actions:
        actions.append("Maintain outreach; revisit if neighboring zips show rising need.")
    return actions[:4]


@app.post("/api/upload/areas")
async def upload_areas(file: UploadFile = File(...)) -> dict[str, Any]:
    raw = await file.read()
    n, err = store.merge_areas_csv(raw)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return {"rows_loaded": n, "message": "Area need data saved (SQLite) and loaded."}


@app.post("/api/upload/events")
async def upload_events(file: UploadFile = File(...)) -> dict[str, Any]:
    raw = await file.read()
    n, err = store.merge_events_csv(raw)
    if err:
        raise HTTPException(status_code=400, detail=err)
    return {"rows_loaded": n, "message": "Event data saved (SQLite) and loaded."}


@app.post("/api/reset")
def reset_data() -> dict[str, str]:
    store.reset_to_seed()
    return {"message": "Reloaded seed datasets and overwrote SQLite."}
