from __future__ import annotations

import json
from collections import defaultdict
from io import BytesIO
from pathlib import Path
from typing import Any

import pandas as pd

from .db import KEY_AREAS, KEY_EVENTS, connect, load_json_list, load_meta, save_json_list
from .scoring import (
    activity_index,
    chapter_proximity_bonus,
    coverage_gap,
    explain_priority,
    normalized_population,
    priority_score,
)

DATA_DIR = Path(__file__).resolve().parent.parent / "data"
APP_VERSION = "0.2.0"


def _load_json(name: str) -> list[dict[str, Any]]:
    path = DATA_DIR / name
    with path.open(encoding="utf-8") as f:
        return json.load(f)


class DataStore:
    def __init__(self) -> None:
        self._db_path = DATA_DIR / "betternature.db"
        self._conn = connect(self._db_path)
        self.chapters: list[dict[str, Any]] = _load_json("seed_chapters.json")
        self.partners: list[dict[str, Any]] = _load_json("seed_partners.json")
        areas = load_json_list(self._conn, KEY_AREAS)
        events = load_json_list(self._conn, KEY_EVENTS)
        if areas is None or events is None:
            self.areas = _load_json("seed_areas.json")
            self.events = _load_json("seed_events.json")
            save_json_list(self._conn, KEY_AREAS, self.areas)
            save_json_list(self._conn, KEY_EVENTS, self.events)
        else:
            self.areas = areas
            self.events = events

    def reset_to_seed(self) -> None:
        self.areas = _load_json("seed_areas.json")
        self.events = _load_json("seed_events.json")
        save_json_list(self._conn, KEY_AREAS, self.areas)
        save_json_list(self._conn, KEY_EVENTS, self.events)

    def dataset_meta(self) -> dict[str, Any]:
        m = load_meta(self._conn)
        return {
            **m,
            "app_version": APP_VERSION,
            "sqlite_path": str(Path("data") / "betternature.db"),
            "areas_count": len(self.areas),
            "events_count": len(self.events),
            "persistence": "Areas and events are saved to SQLite and survive API restarts. Chapters/partners load from seed JSON until extended.",
            "need_data_note": "Need scores are modeled demo values unless you replace areas via CSV.",
            "memphis_note": "For Memphis, TN zips, modeled need is not reduced by local BetterNature distribution volume.",
        }

    def _aggregate_by_zip(self) -> dict[str, dict[str, Any]]:
        by_zip: dict[str, dict[str, Any]] = {}
        for e in self.events:
            z = str(e["zip"])
            if z not in by_zip:
                by_zip[z] = {
                    "pounds_distributed": 0.0,
                    "meal_kits_distributed": 0.0,
                    "event_count": 0,
                    "volunteers_total": 0,
                    "people_served": 0,
                    "chapters": set(),
                    "event_types": set(),
                }
            agg = by_zip[z]
            agg["pounds_distributed"] += float(e["pounds"])
            agg["meal_kits_distributed"] += float(e["meal_kits"])
            agg["event_count"] += 1
            agg["volunteers_total"] += int(e["volunteers"])
            agg["people_served"] += int(e["people_served"])
            agg["chapters"].add(e["chapter"])
            agg["event_types"].add(e["event_type"])
        for z, agg in by_zip.items():
            agg["chapters"] = sorted(agg["chapters"])
            agg["event_types"] = sorted(agg["event_types"])
        return by_zip

    def _refs(self, by_zip: dict[str, dict[str, Any]]) -> tuple[float, float, float]:
        max_p = max((v["pounds_distributed"] for v in by_zip.values()), default=1.0)
        max_m = max((v["meal_kits_distributed"] for v in by_zip.values()), default=1.0)
        max_e = max((float(v["event_count"]) for v in by_zip.values()), default=1.0)
        return max_p, max_m, max_e

    @staticmethod
    def _memphis_tn_area(a: dict[str, Any]) -> bool:
        """Memphis, TN: do not treat local BN distribution as reducing modeled food insecurity or coverage gap."""
        return str(a.get("city", "")).strip().lower() == "memphis" and str(a.get("state", "")).strip().upper() == "TN"

    def enriched_areas(self) -> list[dict[str, Any]]:
        by_zip = self._aggregate_by_zip()
        ref_p, ref_m, ref_e = self._refs(by_zip)
        out: list[dict[str, Any]] = []
        for a in self.areas:
            z = str(a["zip"])
            agg = by_zip.get(
                z,
                {
                    "pounds_distributed": 0.0,
                    "meal_kits_distributed": 0.0,
                    "event_count": 0,
                    "volunteers_total": 0,
                    "people_served": 0,
                    "chapters": [],
                    "event_types": [],
                },
            )
            need = float(a["food_insecurity_score"])
            act_raw = activity_index(
                float(agg["pounds_distributed"]),
                float(agg["meal_kits_distributed"]),
                float(agg["event_count"]),
                ref_p,
                ref_m,
                ref_e,
            )
            decouple = self._memphis_tn_area(a)
            # Modeled need / gap for Memphis, TN ignores local distribution (chronic insecurity can remain severe).
            act = 0.0 if decouple else act_raw
            gap = coverage_gap(need, act)
            pop_n = normalized_population(float(a["population"]))
            ch_bonus = chapter_proximity_bonus(float(a["lat"]), float(a["lng"]), self.chapters)
            pri = priority_score(need, gap, pop_n, ch_bonus)
            row = {
                **a,
                "zip": z,
                "pounds_distributed": agg["pounds_distributed"],
                "meal_kits_distributed": agg["meal_kits_distributed"],
                "event_count": agg["event_count"],
                "volunteers_total": agg["volunteers_total"],
                "people_served": agg["people_served"],
                "chapters_active": agg["chapters"],
                "event_types": agg["event_types"],
                "activity_index": round(act, 4),
                "coverage_gap": round(gap, 4),
                "chapter_proximity_bonus": round(ch_bonus, 4),
                "priority_score": pri,
                "need_independent_of_local_distribution": decouple,
            }
            if decouple:
                row["local_distribution_activity_index"] = round(act_raw, 4)
            row["recommendation_summary"] = explain_priority(row, self.chapters)
            out.append(row)
        out.sort(key=lambda r: r["priority_score"], reverse=True)
        return out

    def summary(self) -> dict[str, Any]:
        ev = self.events
        total_pounds = sum(float(e["pounds"]) for e in ev)
        total_meals = sum(float(e["meal_kits"]) for e in ev)
        total_volunteers = sum(int(e["volunteers"]) for e in ev)
        people = sum(int(e["people_served"]) for e in ev)
        enriched = self.enriched_areas()
        top_regions = enriched[:5]
        chapters_reporting = sum(1 for c in self.chapters_enriched() if c["has_impact"])
        return {
            "total_food_lbs": int(total_pounds),
            "total_meal_kits": int(total_meals),
            "total_events": len(ev),
            "total_volunteers_reported": total_volunteers,
            "people_reached": people,
            "active_chapters": len(self.chapters),
            "chapters_reporting_impact": chapters_reporting,
            "top_priority_regions": [
                {
                    "zip": r["zip"],
                    "city": r["city"],
                    "state": r["state"],
                    "priority_score": r["priority_score"],
                    "need_level": r["need_priority_level"],
                }
                for r in top_regions
            ],
            "data_note": "Need scores are modeled demo values (US + India proxies), not a live government feed. For Memphis, TN zips, estimated need and priority are not reduced by local distribution volume—food insecurity can stay high even where we operate. Replace via CSV upload when you have Feeding America / Census-based layers.",
        }

    def time_series(self) -> list[dict[str, Any]]:
        df = pd.DataFrame(self.events)
        if df.empty:
            return []
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date")
        monthly = (
            df.groupby(df["date"].dt.to_period("M"))
            .agg({"pounds": "sum", "meal_kits": "sum", "id": "count"})
            .reset_index()
        )
        monthly["date"] = monthly["date"].astype(str)
        return monthly.rename(columns={"id": "events"}).to_dict(orient="records")

    def daily_timeseries(self) -> list[dict[str, Any]]:
        df = pd.DataFrame(self.events)
        if df.empty:
            return []
        df["date"] = pd.to_datetime(df["date"])
        df = df.sort_values("date")
        daily = (
            df.groupby(df["date"].dt.strftime("%Y-%m-%d"))
            .agg({"pounds": "sum", "meal_kits": "sum", "id": "count"})
            .reset_index()
        )
        return daily.rename(columns={"id": "events", "date": "date"}).to_dict(orient="records")

    def chapters_enriched(self) -> list[dict[str, Any]]:
        agg: dict[str, dict[str, float | int]] = defaultdict(
            lambda: {"events": 0, "pounds": 0.0, "meal_kits": 0.0, "volunteers": 0, "people_served": 0}
        )
        for e in self.events:
            c = str(e["chapter"])
            a = agg[c]
            a["events"] = int(a["events"]) + 1
            a["pounds"] = float(a["pounds"]) + float(e["pounds"])
            a["meal_kits"] = float(a["meal_kits"]) + float(e["meal_kits"])
            a["volunteers"] = int(a["volunteers"]) + int(e["volunteers"])
            a["people_served"] = int(a["people_served"]) + int(e["people_served"])
        out: list[dict[str, Any]] = []
        for ch in self.chapters:
            name = str(ch["name"])
            r = agg.get(name, {})
            evc = int(r.get("events", 0))
            out.append(
                {
                    **ch,
                    "reported_events": evc,
                    "reported_pounds": int(r.get("pounds", 0)),
                    "reported_meal_kits": int(r.get("meal_kits", 0)),
                    "reported_volunteers": int(r.get("volunteers", 0)),
                    "reported_people_served": int(r.get("people_served", 0)),
                    "has_impact": evc > 0,
                }
            )
        return out

    def chapter_breakdown(self) -> list[dict[str, Any]]:
        df = pd.DataFrame(self.events)
        if df.empty:
            return []
        g = df.groupby("chapter").agg(
            {"pounds": "sum", "meal_kits": "sum", "id": "count", "volunteers": "sum", "people_served": "sum"}
        )
        return g.reset_index().rename(columns={"id": "events"}).to_dict(orient="records")

    def gaps(self) -> list[dict[str, Any]]:
        return [
            {
                "zip": r["zip"],
                "city": r["city"],
                "state": r["state"],
                "food_insecurity_score": r["food_insecurity_score"],
                "activity_index": r["activity_index"],
                "coverage_gap": r["coverage_gap"],
                "pounds_distributed": r["pounds_distributed"],
                "population": r["population"],
            }
            for r in self.enriched_areas()
        ]

    def merge_areas_csv(self, content: bytes) -> tuple[int, str | None]:
        try:
            df = pd.read_csv(BytesIO(content))
        except Exception as e:
            return 0, f"Could not parse CSV: {e}"
        required = {"zip", "lat", "lng", "food_insecurity_score", "population"}
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        if not required.issubset(set(df.columns)):
            return 0, f"Missing required columns. Need: {sorted(required)}"
        rows: list[dict[str, Any]] = []
        for _, row in df.iterrows():
            zraw = row["zip"]
            if pd.isna(zraw):
                continue
            zs = str(zraw).replace(".0", "").strip()
            z = zs.zfill(5) if zs.isdigit() and len(zs) <= 5 else zs
            rows.append(
                {
                    "city": str(row.get("city", "Memphis")),
                    "state": str(row.get("state", "TN")),
                    "zip": z,
                    "lat": float(row["lat"]),
                    "lng": float(row["lng"]),
                    "food_insecurity_score": float(row["food_insecurity_score"]),
                    "poverty_rate": float(row.get("poverty_rate", 0.2)),
                    "population": float(row["population"]),
                    "need_priority_level": str(row.get("need_priority_level", "medium")),
                }
            )
        self.areas = rows
        save_json_list(self._conn, KEY_AREAS, self.areas)
        return len(rows), None

    def merge_events_csv(self, content: bytes) -> tuple[int, str | None]:
        try:
            df = pd.read_csv(BytesIO(content))
        except Exception as e:
            return 0, f"Could not parse CSV: {e}"
        df.columns = [c.strip().lower().replace(" ", "_") for c in df.columns]
        rename_map = {
            "event_id": "id",
            "pounds_distributed": "pounds",
        }
        for k, v in rename_map.items():
            if k in df.columns and v not in df.columns:
                df = df.rename(columns={k: v})
        req = {"id", "chapter", "city", "state", "zip", "lat", "lng", "date", "pounds", "meal_kits", "volunteers", "people_served", "event_type"}
        if not req.issubset(set(df.columns)):
            return 0, f"Missing required columns for events. Need: {sorted(req)}"
        events: list[dict[str, Any]] = []
        for _, row in df.iterrows():
            zraw = row["zip"]
            zs = str(zraw).replace(".0", "").strip() if pd.notna(zraw) else ""
            z = zs.zfill(5) if zs.isdigit() and len(zs) <= 5 else zs
            events.append(
                {
                    "id": str(row["id"]),
                    "chapter": str(row["chapter"]),
                    "city": str(row["city"]),
                    "state": str(row["state"]),
                    "zip": z,
                    "lat": float(row["lat"]),
                    "lng": float(row["lng"]),
                    "date": str(row["date"])[:10],
                    "pounds": float(row["pounds"]),
                    "meal_kits": float(row["meal_kits"]),
                    "volunteers": int(row["volunteers"]),
                    "people_served": int(row["people_served"]),
                    "event_type": str(row["event_type"]),
                }
            )
        self.events = events
        save_json_list(self._conn, KEY_EVENTS, self.events)
        return len(events), None
