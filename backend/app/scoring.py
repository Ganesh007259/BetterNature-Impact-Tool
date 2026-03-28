from __future__ import annotations

import math
from typing import Any


def _clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def normalized_population(pop: float, ref_max: float = 130000.0) -> float:
    return _clamp(math.log1p(max(pop, 0)) / math.log1p(ref_max))


def activity_index(
    pounds: float,
    meal_kits: float,
    events: float,
    ref_pounds: float,
    ref_meals: float,
    ref_events: float,
) -> float:
    if ref_pounds <= 0:
        ref_pounds = 1.0
    if ref_meals <= 0:
        ref_meals = 1.0
    if ref_events <= 0:
        ref_events = 1.0
    p = pounds / ref_pounds
    m = meal_kits / ref_meals
    e = events / ref_events
    raw = 0.45 * p + 0.35 * m + 0.2 * e
    return _clamp(raw)


def coverage_gap(need: float, activity: float) -> float:
    return _clamp(need * (1.0 - activity))


def chapter_proximity_bonus(
    area_lat: float,
    area_lng: float,
    chapters: list[dict[str, Any]],
    sigma_km: float = 12.0,
) -> float:
    if not chapters:
        return 0.0
    d_min = min(haversine_km(area_lat, area_lng, c["lat"], c["lng"]) for c in chapters)
    return math.exp(-((d_min / sigma_km) ** 2))


def priority_score(
    need: float,
    gap: float,
    pop_norm: float,
    chapter_bonus: float,
    weights: tuple[float, float, float, float] = (0.38, 0.32, 0.22, 0.08),
) -> float:
    w_need, w_gap, w_pop, w_ch = weights
    raw = w_need * need + w_gap * gap + w_pop * pop_norm + w_ch * chapter_bonus
    return round(_clamp(raw) * 100, 2)


def explain_priority(
    row: dict[str, Any],
    chapters: list[dict[str, Any]],
) -> str:
    z = row["zip"]
    city = row["city"]
    need = row["food_insecurity_score"]
    gap = row["coverage_gap"]
    act = row["activity_index"]
    pri = row["priority_score"]
    pounds = row.get("pounds_distributed", 0)
    meals = row.get("meal_kits_distributed", 0)
    evs = row.get("event_count", 0)

    if pri >= 70:
        tier = "a top outreach priority"
    elif pri >= 55:
        tier = "a strong candidate for added programming"
    else:
        tier = "worth monitoring, with selective investments"

    if row.get("need_independent_of_local_distribution"):
        parts = [
            f"{city} ({z}) estimated food insecurity is {need:.0%}. "
            f"BetterNature distribution here (≈{int(pounds)} lbs, {int(meals)} meal kits across {int(evs)} events) is not used to lower modeled need—communities can remain severely food insecure despite programming. "
            f"Composite priority score {pri:.0f} ({tier})."
        ]
    else:
        parts = [
            f"{city} ({z}) shows estimated food insecurity at {need:.0%} with "
            f"BetterNature activity index {act:.0%} (≈{int(pounds)} lbs, {int(meals)} meal kits across {int(evs)} events). "
            f"The modeled coverage gap is {gap:.0%}, placing this zip among {tier}."
        ]

    if gap > 0.45 and need > 0.65:
        parts.append(
            "Consider increasing recurring meal-kit drops or partnering with a local pantry to close the gap."
        )
    elif gap > 0.35:
        parts.append(
            "Pilot a monthly distribution or school-adjacent pop-up to build presence without overextending volunteers."
        )
    else:
        parts.append(
            "Maintain coverage while reallocating surplus capacity to adjacent underserved zips."
        )

    if chapters and row.get("lat") is not None:
        nearest = min(
            chapters,
            key=lambda c: haversine_km(row["lat"], row["lng"], c["lat"], c["lng"]),
        )
        d = haversine_km(row["lat"], row["lng"], nearest["lat"], nearest["lng"])
        if d < 8:
            parts.append(
                f"The {nearest['name']} chapter is nearby (~{d:.1f} km)—leverage existing volunteers for route expansion."
            )
        elif d < 20:
            parts.append(
                f"Coordinate with {nearest['name']} (~{d:.1f} km) for joint events or shared logistics."
            )

    return " ".join(parts)
