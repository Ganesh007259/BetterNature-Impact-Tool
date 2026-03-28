"""Memphis TN rows: modeled activity_index for gap is zeroed; local index may be non-zero."""

from __future__ import annotations

from pathlib import Path

import pytest

from app.store import DataStore


@pytest.fixture()
def store(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> DataStore:
    import app.store as store_mod

    data = tmp_path / "data"
    data.mkdir()
    # Minimal seeds
    (data / "seed_areas.json").write_text(
        '[{"city":"Memphis","state":"TN","zip":"38103","lat":35.14,"lng":-90.05,'
        '"food_insecurity_score":0.6,"poverty_rate":0.2,"population":10000,"need_priority_level":"high"}]',
        encoding="utf-8",
    )
    (data / "seed_events.json").write_text(
        '[{"id":"e1","chapter":"Memphis","city":"Memphis","state":"TN","zip":"38103","lat":35.14,"lng":-90.05,'
        '"date":"2026-02-01","pounds":100,"meal_kits":50,"volunteers":5,"people_served":50,"event_type":"test"}]',
        encoding="utf-8",
    )
    for name, content in [
        ("seed_chapters.json", '[{"name":"Memphis","city":"Memphis","state":"TN","lat":35.1,"lng":-90.0,"launch_date":"2020-01-01","lead_contact":"x","total_events":0,"total_pounds":0,"status":"active"}]'),
        ("seed_partners.json", "[]"),
    ]:
        (data / name).write_text(content, encoding="utf-8")

    monkeypatch.setattr(store_mod, "DATA_DIR", data)
    return DataStore()


def test_memphis_activity_model_zero_but_local_tracked(store: DataStore) -> None:
    enriched = store.enriched_areas()
    row = next(r for r in enriched if r["zip"] == "38103")
    assert row["need_independent_of_local_distribution"] is True
    assert row["activity_index"] == 0.0
    assert row["local_distribution_activity_index"] > 0
