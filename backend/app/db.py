"""SQLite persistence for uploaded / edited areas and events (chapters & partners stay on seed JSON)."""

from __future__ import annotations

import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

KEY_AREAS = "areas"
KEY_EVENTS = "events"
KEY_META = "_meta"


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def connect(db_path: Path) -> sqlite3.Connection:
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.execute("CREATE TABLE IF NOT EXISTS kv (k TEXT PRIMARY KEY, v TEXT NOT NULL)")
    conn.commit()
    return conn


def _load_json_value(conn: sqlite3.Connection, key: str) -> Any | None:
    row = conn.execute("SELECT v FROM kv WHERE k = ?", (key,)).fetchone()
    if not row:
        return None
    return json.loads(row[0])


def load_json_list(conn: sqlite3.Connection, key: str) -> list[dict[str, Any]] | None:
    raw = _load_json_value(conn, key)
    if raw is None:
        return None
    return raw  # type: ignore[return-value]


def save_json_list(conn: sqlite3.Connection, key: str, data: list[dict[str, Any]]) -> None:
    conn.execute(
        "INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)",
        (key, json.dumps(data)),
    )
    meta = _load_json_value(conn, KEY_META)
    if not isinstance(meta, dict):
        meta = {}
    meta["updated_at"] = utc_now_iso()
    meta[f"{key}_count"] = len(data)
    conn.execute(
        "INSERT OR REPLACE INTO kv (k, v) VALUES (?, ?)",
        (KEY_META, json.dumps(meta)),
    )
    conn.commit()


def load_meta(conn: sqlite3.Connection) -> dict[str, Any]:
    raw = _load_json_value(conn, KEY_META)
    return raw if isinstance(raw, dict) else {}
