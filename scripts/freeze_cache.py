"""Cockpit-OMNI — Freeze live NASA API snapshots into data/cache/ and frontend/public/cache/."""
from __future__ import annotations

import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

ROOT_DIR = Path(__file__).resolve().parents[1]
BACKEND_DIR = ROOT_DIR / "backend"
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from fastapi.testclient import TestClient
from app.main import app
from app.trend import PRESET_REGIONS, VARIABLE_META, analyze_variable, fetch_monthly

DATA_CACHE = ROOT_DIR / "data" / "cache"
FRONT_CACHE = ROOT_DIR / "frontend" / "public" / "cache"

CMR_MCP_URL = "https://cmr.earthdata.nasa.gov/mcp/v1"


def _write_json(name: str, payload: Any) -> None:
    text = json.dumps(payload, indent=2, ensure_ascii=False)
    for directory in (DATA_CACHE, FRONT_CACHE):
        directory.mkdir(parents=True, exist_ok=True)
        (directory / name).write_text(text, encoding="utf-8")


def _parse_mcp_sse(text: str) -> dict[str, Any]:
    for line in text.splitlines():
        if line.startswith("data: "):
            raw = line[len("data: "):].strip()
            msg = json.loads(raw)
            content = msg.get("result", {}).get("content", [])
            if content and "text" in content[0]:
                return json.loads(content[0]["text"])
    return json.loads(text)


def fetch_cmr_evidence() -> dict[str, Any]:
    """Query NASA's official Earthdata CMR MCP server for verified collection metadata."""
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream",
    }
    init_body = {
        "jsonrpc": "2.0",
        "id": 1,
        "method": "initialize",
        "params": {
            "protocolVersion": "2025-06-18",
            "capabilities": {},
            "clientInfo": {"name": "cockpit-omni", "version": "0.1.0"},
        },
    }
    r_init = httpx.post(CMR_MCP_URL, headers=headers, json=init_body, timeout=25.0)
    r_init.raise_for_status()
    sid = r_init.headers.get("mcp-session-id")
    if sid:
        headers["Mcp-Session-Id"] = sid

    queries = {
        "fire_aerosol": "ACTIVE FIRE",
        "geothermal_nisar": "NISAR",
        "geothermal_ecostress": "ECOSTRESS",
        "hydrometeorological_ceres": "CERES",
    }
    results: dict[str, Any] = {}
    for idx, (key, keyword) in enumerate(queries.items(), start=2):
        call_body = {
            "jsonrpc": "2.0",
            "id": idx,
            "method": "tools/call",
            "params": {"name": "get_collections", "arguments": {"keyword": keyword}},
        }
        r = httpx.post(CMR_MCP_URL, headers=headers, json=call_body, timeout=25.0)
        r.raise_for_status()
        parsed = _parse_mcp_sse(r.text)
        top = [
            {
                "concept_id": c.get("concept_id"),
                "title": c.get("title"),
                "short_name": c.get("short_name"),
            }
            for c in parsed.get("collections", [])[:3]
        ]
        results[key] = {
            "keyword": keyword,
            "total_hits": parsed.get("total_hits", 0),
            "top_collections": top,
        }

    return {
        "endpoint": CMR_MCP_URL,
        "protocol": "2025-06-18",
        "verified_at_utc": datetime.now(timezone.utc).isoformat(),
        "queries": results,
    }


def main() -> None:
    client = TestClient(app)
    frozen_at = datetime.now(timezone.utc).isoformat()

    # 1. Regions + variable metadata
    regions_payload = client.get("/api/regions").json()
    _write_json("regions.json", regions_payload)
    print("[CACHE] regions.json OK")

    # 2. Trend series for all 3 regions x all 7 variables (single POWER fetch per region)
    for reg_id, reg_info in PRESET_REGIONS.items():
        df = fetch_monthly(reg_info["lat"], reg_info["lon"], start=1984, end=2025)
        for var in VARIABLE_META:
            payload = analyze_variable(df, variable=var, region_info=reg_info)
            payload["cache_mode"] = "frozen_snapshot"
            payload["frozen_at_utc"] = frozen_at
            _write_json(f"trend_{reg_id}_{var}.json", payload)
        print(f"[CACHE] trend_{reg_id}_*.json ({len(VARIABLE_META)} vars) OK")

        # 3. Attribution per region
        attr = client.get(f"/api/attribution?region={reg_id}").json()
        attr["cache_mode"] = "frozen_snapshot"
        attr["frozen_at_utc"] = frozen_at
        _write_json(f"attribution_{reg_id}.json", attr)
        print(f"[CACHE] attribution_{reg_id}.json OK")

    # 4. FIRMS fires GeoJSON
    fires = client.get("/api/fires?days=1&limit=1500").json()
    fires["frozen_at_utc"] = frozen_at
    _write_json("fires_br_1d.geojson", fires)
    print(f"[CACHE] fires_br_1d.geojson OK (count={fires.get('count')}, status={fires.get('status')})")

    # 5. DONKI space weather
    sw = client.get("/api/spaceweather?days=7").json()
    sw["frozen_at_utc"] = frozen_at
    _write_json("donki_7d.json", sw)
    print(f"[CACHE] donki_7d.json OK (count={sw.get('count')}, status={sw.get('status')})")

    # 6. NASA Earthdata CMR MCP evidence
    cmr = fetch_cmr_evidence()
    _write_json("cmr_evidence.json", cmr)
    print("[CACHE] cmr_evidence.json OK")

    # 7. Manifest
    _write_json(
        "manifest.json",
        {
            "frozen_at_utc": frozen_at,
            "regions": list(PRESET_REGIONS.keys()),
            "variables": list(VARIABLE_META.keys()),
        },
    )
    print(f"\nFrozen cache complete at {frozen_at}")


if __name__ == "__main__":
    main()
