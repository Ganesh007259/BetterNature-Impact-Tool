#!/usr/bin/env python3
"""Generate US-wide demo zip proxies with stable modeled need scores (not official Feeding America data)."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

# Representative zips across states — lat/lng ~ centroid; population rough for weighting
ROWS: list[tuple[str, str, str, float, float, int]] = [
    ("Memphis", "TN", "38106", 35.1156, -90.0501, 28500),
    ("Memphis", "TN", "38126", 35.1290, -90.0510, 12400),
    ("Memphis", "TN", "38114", 35.1102, -89.9950, 31200),
    ("Nashville", "TN", "37203", 36.1627, -86.7816, 42000),
    ("Knoxville", "TN", "37902", 35.9606, -83.9207, 19000),
    ("Atlanta", "GA", "30303", 33.7490, -84.3880, 25000),
    ("Savannah", "GA", "31401", 32.0809, -81.0912, 18000),
    ("Miami", "FL", "33128", 25.7743, -80.1937, 32000),
    ("Tampa", "FL", "33602", 27.9506, -82.4572, 24000),
    ("Jacksonville", "FL", "32202", 30.3322, -81.6557, 21000),
    ("Houston", "TX", "77002", 29.7604, -95.3698, 55000),
    ("Dallas", "TX", "75201", 32.7767, -96.7970, 48000),
    ("Austin", "TX", "78701", 30.2672, -97.7431, 35000),
    ("San Antonio", "TX", "78205", 29.4241, -98.4936, 41000),
    ("Phoenix", "AZ", "85003", 33.4484, -112.0740, 52000),
    ("Tucson", "AZ", "85701", 32.2226, -110.9747, 28000),
    ("Los Angeles", "CA", "90012", 34.0522, -118.2437, 62000),
    ("San Diego", "CA", "92101", 32.7157, -117.1611, 45000),
    ("San Francisco", "CA", "94102", 37.7749, -122.4194, 38000),
    ("Oakland", "CA", "94607", 37.8044, -122.2712, 34000),
    ("Seattle", "WA", "98101", 47.6062, -122.3321, 36000),
    ("Portland", "OR", "97201", 45.5152, -122.6784, 31000),
    ("Denver", "CO", "80202", 39.7392, -104.9903, 33000),
    ("Albuquerque", "NM", "87102", 35.0844, -106.6504, 27000),
    ("Salt Lake City", "UT", "84111", 40.7608, -111.8910, 22000),
    ("Las Vegas", "NV", "89101", 36.1699, -115.1398, 40000),
    ("Boise", "ID", "83702", 43.6150, -116.2023, 16000),
    ("Kansas City", "MO", "64106", 39.0997, -94.5786, 26000),
    ("St. Louis", "MO", "63101", 38.6270, -90.1994, 29000),
    ("Chicago", "IL", "60602", 41.8781, -87.6298, 58000),
    ("Detroit", "MI", "48226", 42.3314, -83.0458, 35000),
    ("Minneapolis", "MN", "55401", 44.9778, -93.2650, 32000),
    ("Milwaukee", "WI", "53202", 43.0389, -87.9065, 28000),
    ("Indianapolis", "IN", "46204", 39.7684, -86.1581, 30000),
    ("Louisville", "KY", "40202", 38.2527, -85.7585, 25000),
    ("Columbus", "OH", "43215", 39.9612, -82.9988, 31000),
    ("Cleveland", "OH", "44114", 41.4993, -81.6944, 27000),
    ("Cincinnati", "OH", "45202", 39.1031, -84.5120, 24000),
    ("New Orleans", "LA", "70112", 29.9511, -90.0715, 22000),
    ("Baton Rouge", "LA", "70802", 30.4515, -91.1871, 19000),
    ("Birmingham", "AL", "35203", 33.5207, -86.8025, 21000),
    ("Montgomery", "AL", "36104", 32.3668, -86.3000, 14000),
    ("Charlotte", "NC", "28202", 35.2271, -80.8431, 34000),
    ("Raleigh", "NC", "27601", 35.7796, -78.6382, 26000),
    ("Charleston", "SC", "29401", 32.7765, -79.9311, 15000),
    ("Richmond", "VA", "23219", 37.5407, -77.4360, 20000),
    ("Norfolk", "VA", "23510", 36.8508, -76.2859, 18000),
    ("Washington", "DC", "20001", 38.9072, -77.0369, 42000),
    ("Baltimore", "MD", "21201", 39.2904, -76.6122, 31000),
    ("Philadelphia", "PA", "19107", 39.9526, -75.1652, 45000),
    ("Pittsburgh", "PA", "15222", 40.4406, -79.9959, 28000),
    ("New York", "NY", "10001", 40.7128, -74.0060, 72000),
    ("Buffalo", "NY", "14202", 42.8864, -78.8784, 21000),
    ("Boston", "MA", "02108", 42.3601, -71.0589, 38000),
    ("Hartford", "CT", "06103", 41.7658, -72.6734, 17000),
    ("Providence", "RI", "02903", 41.8240, -71.4128, 15000),
    ("Manchester", "NH", "03101", 42.9956, -71.4548, 12000),
    ("Burlington", "VT", "05401", 44.4759, -73.2121, 11000),
    ("Portland", "ME", "04101", 43.6591, -70.2568, 10000),
    ("Newark", "NJ", "07102", 40.7357, -74.1724, 26000),
    ("Columbia", "SC", "29201", 34.0007, -81.0348, 19000),
    ("Little Rock", "AR", "72201", 34.7465, -92.2896, 17000),
    ("Oklahoma City", "OK", "73102", 35.4676, -97.5164, 24000),
    ("Tulsa", "OK", "74103", 36.1540, -95.9928, 22000),
    ("Omaha", "NE", "68102", 41.2565, -95.9345, 21000),
    ("Des Moines", "IA", "50309", 41.5868, -93.6250, 16000),
    ("Fargo", "ND", "58102", 46.8772, -96.7898, 9000),
    ("Sioux Falls", "SD", "57104", 43.5446, -96.7311, 12000),
    ("Cheyenne", "WY", "82001", 41.1400, -104.8202, 7000),
    ("Anchorage", "AK", "99501", 61.2181, -149.9003, 14000),
    ("Honolulu", "HI", "96813", 21.3069, -157.8583, 21000),
    ("San Juan", "PR", "00901", 18.4655, -66.1057, 25000),
    ("El Paso", "TX", "79901", 31.7619, -106.4850, 26000),
    ("McAllen", "TX", "78501", 26.2034, -98.2300, 18000),
    ("Fresno", "CA", "93721", 36.7378, -119.7871, 27000),
    ("Sacramento", "CA", "95814", 38.5816, -121.4944, 29000),
    ("Spokane", "WA", "99201", 47.6588, -117.4260, 15000),
    ("Mumbai", "India", "400001", 19.0760, 72.8777, 124000),
    ("Delhi", "India", "110001", 28.6139, 77.2090, 95000),
    ("Bengaluru", "India", "560001", 12.9716, 77.5946, 72000),
]


def need_for_zip(z: str) -> tuple[float, float, str]:
    h = int(hashlib.sha256(z.encode()).hexdigest()[:8], 16)
    need = round(0.14 + (h % 7400) / 10000.0, 2)
    pov = round(0.06 + (h % 3200) / 10000.0, 2)
    if need >= 0.78:
        lvl = "critical"
    elif need >= 0.58:
        lvl = "high"
    elif need >= 0.38:
        lvl = "medium"
    else:
        lvl = "low"
    return need, pov, lvl


def main() -> None:
    areas = []
    for city, state, zipc, lat, lng, pop in ROWS:
        need, pov, lvl = need_for_zip(zipc)
        # Slightly lift known high-need corridors for narrative realism (still demo)
        if zipc.startswith(("381", "303", "352", "900", "112", "482")):
            need = min(0.95, round(need + 0.08, 2))
            if need >= 0.78:
                lvl = "critical"
            elif need >= 0.58:
                lvl = "high"
        areas.append(
            {
                "city": city,
                "state": state,
                "zip": zipc,
                "lat": lat,
                "lng": lng,
                "food_insecurity_score": need,
                "poverty_rate": pov,
                "population": pop,
                "need_priority_level": lvl,
            }
        )
    out = Path(__file__).resolve().parent.parent / "data" / "seed_areas.json"
    out.write_text(json.dumps(areas, indent=2), encoding="utf-8")
    print(f"Wrote {len(areas)} areas to {out}")


if __name__ == "__main__":
    main()
