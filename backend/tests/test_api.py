"""Unit and API contract tests for Cockpit-OMNI trend engine and FastAPI routes."""
from __future__ import annotations

import sys
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from app import main as app_main
from app import trend as trend_mod


def _make_monthly_df(months: int = 240, slope_per_step: float = 0.005) -> pd.DataFrame:
    idx = pd.period_range("2000-01", periods=months, freq="M")
    t = np.arange(months, dtype=float)
    seasonal = 3.0 * np.sin(2.0 * np.pi * (t % 12) / 12.0)
    df = pd.DataFrame(
        {
            "T2M": 22.0 + seasonal + slope_per_step * t,
            "PRECTOTCORR": 4.0 - 0.002 * t + 1.5 * np.cos(2.0 * np.pi * (t % 12) / 12.0),
            "WS2M": 2.5 + 0.1 * np.sin(t),
            "ALLSKY_SFC_SW_DWN": 18.0 + 0.003 * t,
            "CLRSKY_SFC_SW_DWN": 24.0 + 0.001 * t,
            "RH2M": 72.0 - 0.01 * t,
        },
        index=idx,
    )
    clr = df["CLRSKY_SFC_SW_DWN"].replace(0.0, np.nan)
    df["CLOUD_ATTEN_PCT"] = (1.0 - df["ALLSKY_SFC_SW_DWN"] / clr) * 100.0
    return df


def test_trend_detects_increasing_seasonal_signal() -> None:
    df = _make_monthly_df(months=240, slope_per_step=0.004)  # +0.48 per decade
    res = trend_mod.trend(df["T2M"])

    assert res["status"] == "ok"
    assert res["n"] == 240
    assert res["trend"] == "increasing"
    assert res["significant_5pct"] is True
    assert res["tau"] > 0.5
    assert res["p_value"] < 0.05
    assert res["slope_per_decade"] == pytest.approx(0.48, abs=0.05)
    lo, hi = res["ci_95_per_decade"]
    assert lo <= res["slope_per_decade"] <= hi
    assert res["total_change"] > 0


def test_trend_rejects_short_series() -> None:
    idx = pd.period_range("2020-01", periods=48, freq="M")
    s = pd.Series(np.ones(48), index=idx)
    res = trend_mod.trend(s)

    assert res["status"] == "insufficient"
    assert res["n"] == 48


def test_fetch_monthly_drops_month_13_and_fill_values() -> None:
    fake_payload = {
        "properties": {
            "parameter": {
                "T2M": {"202401": 24.5, "202402": -999.0, "202413": 23.8},
                "PRECTOTCORR": {"202401": 5.1, "202402": 3.4, "202413": 4.2},
                "ALLSKY_SFC_SW_DWN": {"202401": 18.0, "202402": 20.0, "202413": 19.0},
                "CLRSKY_SFC_SW_DWN": {"202401": 24.0, "202402": 25.0, "202413": 24.5},
            }
        }
    }
    mock_resp = MagicMock()
    mock_resp.json.return_value = fake_payload
    mock_resp.raise_for_status.return_value = None

    with patch("app.trend.httpx.get", return_value=mock_resp):
        df = trend_mod.fetch_monthly(-22.9, -47.06, start=2024, end=2024, use_cache=False)

    assert len(df) == 2
    assert "2024-13" not in [str(x) for x in df.index]
    assert np.isnan(df.loc["2024-02", "T2M"])
    assert df.loc["2024-01", "CLOUD_ATTEN_PCT"] == pytest.approx(25.0)


def test_api_health_and_regions() -> None:
    client = TestClient(app_main.app)

    r_health = client.get("/healthz")
    assert r_health.status_code == 200
    assert r_health.json()["status"] == "ok"

    r_reg = client.get("/api/regions")
    assert r_reg.status_code == 200
    data = r_reg.json()
    ids = {item["id"] for item in data["regions"]}
    assert {"campinas", "petrolina", "manaus"} <= ids


def test_api_trend_and_validation() -> None:
    client = TestClient(app_main.app)
    bad = client.get("/api/trend?variable=INVALID_VAR")
    assert bad.status_code == 400

    df = _make_monthly_df(months=180, slope_per_step=0.003)
    with patch("app.main.fetch_monthly", return_value=df):
        ok = client.get("/api/trend?region=campinas&variable=T2M")

    assert ok.status_code == 200
    payload = ok.json()
    assert payload["region"]["id"] == "campinas"
    assert payload["variable"] == "T2M"
    assert payload["unit"] == "°C"
    assert payload["stats"]["significant_5pct"] is True
    assert len(payload["series"]) == 180
    assert "sen" in payload["series"][0]


def test_api_fires_spaceweather_and_attribution() -> None:
    client = TestClient(app_main.app)
    df_power = _make_monthly_df(months=180, slope_per_step=0.003)
    df_fires = pd.DataFrame(
        [
            {"latitude": -22.91, "longitude": -47.05, "frp": 14.2, "confidence": "n", "acq_date": "2026-11-14", "daynight": "D"},
            {"latitude": -5.20, "longitude": -38.50, "frp": 25.8, "confidence": "h", "acq_date": "2026-11-14", "daynight": "N"},
        ]
    )
    donki_events = [
        {
            "messageType": "CME",
            "messageID": "20261114-AL-001",
            "messageIssueTime": "2026-11-14T08:00Z",
            "messageURL": "https://kauai.ccmc.gsfc.nasa.gov/DONKI/view/CME/1",
            "messageBody": "## NASA Space Weather Notification\nSummary line",
        }
    ]

    with (
        patch("app.main.fetch_monthly", return_value=df_power),
        patch("app.main._load_fires_df", return_value=(df_fires, "live")),
        patch("app.main._load_spaceweather", return_value=(donki_events, "live", "2026-11-07", "2026-11-14")),
    ):
        r_fires = client.get("/api/fires")
        assert r_fires.status_code == 200
        fires_json = r_fires.json()
        assert fires_json["type"] == "FeatureCollection"
        assert fires_json["count"] == 2
        assert fires_json["mean_frp_mw"] == pytest.approx(20.0)

        r_sw = client.get("/api/spaceweather")
        assert r_sw.status_code == 200
        assert r_sw.json()["count"] == 1

        r_attr = client.get("/api/attribution?region=campinas")
        assert r_attr.status_code == 200
        attr = r_attr.json()
        vectors = {v["id"]: v for v in attr["vectors"]}
        assert set(vectors) == {
            "hydrometeorological",
            "fire_aerosol",
            "heliophysical",
            "geothermal_deformation",
        }
        assert vectors["hydrometeorological"]["status"] == "live"
        assert vectors["fire_aerosol"]["details"]["nearby_24h_detections"] == 1
        assert vectors["heliophysical"]["status"] == "live"
        assert vectors["geothermal_deformation"]["status"] == "roadmap"


def test_api_ask_grounded_and_rate_limit(monkeypatch: pytest.MonkeyPatch) -> None:
    app_main._ASK_RATE_LIMIT.clear()
    monkeypatch.delenv("GONKA_API_KEY", raising=False)
    monkeypatch.setenv("GROQ_API_KEY", "test-groq-key")
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    mock_resp = MagicMock()
    mock_resp.raise_for_status.return_value = None
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "Campinas warmed +0.4091 C/decade (p < 1e-16)."}}]
    }

    client = TestClient(app_main.app)
    with patch("app.main.httpx.post", return_value=mock_resp) as post_mock:
        res = client.post(
            "/api/ask",
            json={
                "question": "Is Campinas warming?",
                "name": "Ada",
                "depth": "analyst",
                "summary": "Track: analyst | Mastered: M1 (92%)",
            },
        )
        assert res.status_code == 200
        body = res.json()
        assert body["provider"] == "groq"
        assert "+0.4091" in body["answer"]
        sent_messages = post_mock.call_args.kwargs["json"]["messages"]
        assert "0.4091" in sent_messages[0]["content"]
        assert "Mastered: M1 (92%)" in sent_messages[1]["content"]

        # Exhaust remaining 4 requests in 60s window, 6th triggers 429
        for _ in range(4):
            assert client.post("/api/ask", json={"question": "Repeat?"}).status_code == 200
        limited = client.post("/api/ask", json={"question": "Overflow?"})
        assert limited.status_code == 429


def test_api_ask_gonka_reasoning_fallback_and_pt_lang(monkeypatch: pytest.MonkeyPatch) -> None:
    app_main._ASK_RATE_LIMIT.clear()
    monkeypatch.setenv("GONKA_API_KEY", "test-gonka-key")
    monkeypatch.setenv("GONKA_BASE_URL", "https://api.gonkarouter.io/v1")
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    mock_resp = MagicMock()
    mock_resp.raise_for_status.return_value = None
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "", "reasoning": "Campinas subiu +0.4091 C/decada com seguranca."}}]
    }

    client = TestClient(app_main.app)
    with patch("app.main.httpx.post", return_value=mock_resp) as post_mock:
        res = client.post(
            "/api/ask",
            json={"question": "Campinas esta esquentando?", "lang": "pt"},
        )
        assert res.status_code == 200
        body = res.json()
        assert body["provider"] == "gonka"
        assert body["lang"] == "pt"
        assert "+0.4091" in body["answer"]
        sent_sys = post_mock.call_args.kwargs["json"]["messages"][0]["content"]
        assert "Portuguese" in sent_sys


def test_api_ask_validation_and_no_keys(monkeypatch: pytest.MonkeyPatch) -> None:
    app_main._ASK_RATE_LIMIT.clear()
    monkeypatch.delenv("GONKA_API_KEY", raising=False)
    monkeypatch.delenv("GROQ_API_KEY", raising=False)
    monkeypatch.delenv("OPENROUTER_API_KEY", raising=False)

    client = TestClient(app_main.app)
    bad_depth = client.post("/api/ask", json={"question": "Hi?", "depth": "wizard"})
    assert bad_depth.status_code == 400

    blank_q = client.post("/api/ask", json={"question": "   "})
    assert blank_q.status_code == 400

    missing_keys = client.post("/api/ask", json={"question": "Is Manaus drying?"})
    assert missing_keys.status_code == 503
