"""Tests for layperson goal presets, traffic-light insights, and space analog endpoints."""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import patch

from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import main as app_main


def test_api_presets_bilingual() -> None:
    client = TestClient(app_main.app)
    res_en = client.get("/api/presets?lang=en")
    assert res_en.status_code == 200
    presets_en = res_en.json()["presets"]
    assert len(presets_en) == 5
    assert presets_en[0]["id"] == "calor"
    assert presets_en[0]["title"] == "Prepare for Heatwaves"

    res_pt = client.get("/api/presets?lang=pt")
    assert res_pt.status_code == 200
    presets_pt = res_pt.json()["presets"]
    assert presets_pt[0]["title"] == "Preparar para onda de calor"


def test_api_insight_campinas_calor_en_and_pt() -> None:
    client = TestClient(app_main.app)
    r_en = client.get("/api/insight?preset=calor&region=campinas&lang=en")
    assert r_en.status_code == 200
    body_en = r_en.json()
    assert body_en["severity"] == "red"
    assert "0.41" in body_en["headline"]
    assert "1.72" in body_en["headline"]
    assert len(body_en["indicators"]) == 3

    r_pt = client.get("/api/insight?preset=calor&region=campinas&lang=pt")
    assert r_pt.status_code == 200
    body_pt = r_pt.json()
    assert body_pt["severity"] == "red"
    assert "Campinas" in body_pt["headline"]
    assert body_pt["lang"] == "pt"


def test_api_insight_invalid_returns_400() -> None:
    client = TestClient(app_main.app)
    assert client.get("/api/insight?preset=unknown&region=campinas").status_code == 400
    assert client.get("/api/insight?preset=calor&region=unknown").status_code == 400


def test_api_space_analog_returns_open_feeds_and_mpto() -> None:
    client = TestClient(app_main.app)
    cached_sample = {
        "fetched_at_utc": "2026-11-14T22:00:00Z",
        "feed_statuses": {"dsn": "fallback", "osdr": "fallback", "celestrak": "fallback"},
        "dsn": {"stations": ["Goldstone", "Madrid", "Canberra"], "active_dishes_count": 3},
        "osdr": {"study_id": "OSD-615", "title": "Arabidopsis spaceflight cell walls"},
        "celestrak": {"object_name": "ISS (ZARYA)", "orbital_period_min": 92.94},
        "mpto_frontiers": [{"id": i} for i in range(1, 8)],
    }
    with patch("app.main.fetch_space_analog", return_value=cached_sample):
        res = client.get("/api/space-analog")
    assert res.status_code == 200
    data = res.json()
    assert "dsn" in data
    assert "osdr" in data
    assert "celestrak" in data
    assert len(data["mpto_frontiers"]) == 7
