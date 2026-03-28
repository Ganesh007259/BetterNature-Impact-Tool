from pathlib import Path

from app.db import KEY_AREAS, connect, load_json_list, save_json_list


def test_kv_roundtrip(tmp_path: Path) -> None:
    db = tmp_path / "t.db"
    conn = connect(db)
    rows = [{"zip": "38103", "lat": 35.0, "lng": -90.0}]
    save_json_list(conn, KEY_AREAS, rows)
    conn.close()

    conn2 = connect(db)
    assert load_json_list(conn2, KEY_AREAS) == rows
    conn2.close()
