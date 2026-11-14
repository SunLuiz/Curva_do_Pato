"""Cockpit-OMNI — FastAPI backend for Earth System Trend Detection & Attribution."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
import json
import os
from pathlib import Path
import time
from typing import Any, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query, Request
from fastapi.middleware.cors import CORSMiddleware
import httpx
import numpy as np
import pandas as pd
from pydantic import BaseModel, Field

# Always load cockpit-omni/.env regardless of launch cwd
ROOT_DIR = Path(__file__).resolve().parents[2]
load_dotenv(ROOT_DIR / ".env")

from app.clients.firms_client import BR_BBOX, FirmsClient
from app.clients.nasa_open_client import NasaOpenClient
from app.trend import (
    PRESET_REGIONS,
    VARIABLE_META,
    analyze_variable,
    fetch_monthly,
    resolve_region,
    trend,
)

DATA_DIR = ROOT_DIR / "data"
CACHE_DIR = DATA_DIR / "cache"


def _read_cached_json(filename: str) -> Optional[dict[str, Any]]:
    path = CACHE_DIR / filename
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return None

app = FastAPI(
    title="Cockpit-OMNI API",
    description="Earth System Trend Detective & Multi-Vector Attribution Platform (NASA Space Apps 2026)",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _haversine_km(lat1: float, lon1: float, lats: pd.Series, lons: pd.Series) -> pd.Series:
    lat_r = np.radians(lats.astype(float))
    lon_r = np.radians(lons.astype(float))
    alat = np.radians(lat1)
    alon = np.radians(lon1)
    cos_arg = np.clip(
        np.sin(alat) * np.sin(lat_r) + np.cos(alat) * np.cos(lat_r) * np.cos(lon_r - alon),
        -1.0,
        1.0,
    )
    return 6371.0 * np.arccos(cos_arg)


def _load_fires_df(bbox: str = BR_BBOX, days: int = 1, dataset: str = "viirs_noaa21") -> tuple[pd.DataFrame, str]:
    """Fetch live FIRMS active fires, falling back to local sample CSV if unavailable."""
    try:
        client = FirmsClient()
        try:
            df = client.active_fires(bbox=bbox, days=days, dataset=dataset)
            return df, "live"
        finally:
            client.close()
    except Exception:
        sample_path = DATA_DIR / "firms_br_24h.csv"
        if sample_path.exists():
            return pd.read_csv(sample_path), "cached"
        raise


def _load_spaceweather(days: int = 7) -> tuple[list[dict[str, Any]], str, str, str]:
    now_utc = datetime.now(timezone.utc).date()
    start_date = (now_utc - timedelta(days=max(1, days))).isoformat()
    end_date = now_utc.isoformat()
    try:
        client = NasaOpenClient()
        try:
            items = client.donki_notifications(start=start_date, end=end_date)
            return items, "live", start_date, end_date
        finally:
            client.close()
    except Exception:
        return [], "unavailable", start_date, end_date


@app.get("/healthz")
def healthz() -> dict[str, str]:
    return {"status": "ok", "version": "0.1.0", "service": "Cockpit-OMNI"}


@app.get("/api/regions")
def list_regions() -> dict[str, Any]:
    return {
        "regions": list(PRESET_REGIONS.values()),
        "variables": [
            {"id": k, **v} for k, v in VARIABLE_META.items()
        ],
    }


@app.get("/api/trend")
def get_trend(
    region: Optional[str] = Query(default=None, description="Preset region id: campinas, petrolina, manaus"),
    lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    variable: str = Query(default="T2M"),
    start: int = Query(default=1984, ge=1981, le=2026),
    end: int = Query(default=2025, ge=1981, le=2026),
) -> dict[str, Any]:
    if start >= end:
        raise HTTPException(status_code=400, detail="'start' must be earlier than 'end'")
    if variable not in VARIABLE_META:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported variable '{variable}'. Choose from: {list(VARIABLE_META)}",
        )

    region_info = resolve_region(region=region, lat=lat, lon=lon)
    try:
        df = fetch_monthly(region_info["lat"], region_info["lon"], start=start, end=end)
        payload = analyze_variable(df, variable=variable, region_info=region_info)
        payload["status"] = "live"
        return payload
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        cached = _read_cached_json(f"trend_{region_info['id']}_{variable}.json")
        if cached is not None:
            cached["status"] = "cached"
            return cached
        raise HTTPException(status_code=502, detail=f"NASA POWER upstream error: {exc}") from exc


@app.get("/api/fires")
def get_fires(
    bbox: str = Query(default=BR_BBOX),
    days: int = Query(default=1, ge=1, le=10),
    dataset: str = Query(default="viirs_noaa21"),
    limit: int = Query(default=1500, ge=1, le=10000),
) -> dict[str, Any]:
    try:
        df, status = _load_fires_df(bbox=bbox, days=days, dataset=dataset)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"NASA FIRMS upstream error: {exc}") from exc

    total_count = int(len(df))
    mean_frp = (
        round(float(df["frp"].dropna().mean()), 2)
        if "frp" in df.columns and not df["frp"].dropna().empty
        else None
    )

    subset = df.head(limit) if total_count > limit else df
    features = []
    for _, row in subset.iterrows():
        lat_v = row.get("latitude")
        lon_v = row.get("longitude")
        if pd.isna(lat_v) or pd.isna(lon_v):
            continue
        features.append(
            {
                "type": "Feature",
                "geometry": {
                    "type": "Point",
                    "coordinates": [round(float(lon_v), 4), round(float(lat_v), 4)],
                },
                "properties": {
                    "frp": None if pd.isna(row.get("frp")) else round(float(row["frp"]), 2),
                    "confidence": None if pd.isna(row.get("confidence")) else str(row["confidence"]),
                    "acq_date": None if pd.isna(row.get("acq_date")) else str(row["acq_date"]),
                    "daynight": None if pd.isna(row.get("daynight")) else str(row["daynight"]),
                },
            }
        )

    return {
        "type": "FeatureCollection",
        "count": total_count,
        "returned_features": len(features),
        "mean_frp_mw": mean_frp,
        "bbox": bbox,
        "days": days,
        "dataset": dataset,
        "status": status,
        "source": "VIIRS NOAA-21 NRT (NASA FIRMS)",
        "source_url": "https://firms.modaps.eosdis.nasa.gov/",
        "cmr_concept_id": "C3264430167-LANCEMODIS",
        "features": features,
    }


@app.get("/api/spaceweather")
def get_spaceweather(days: int = Query(default=7, ge=1, le=30)) -> dict[str, Any]:
    items, status, start_date, end_date = _load_spaceweather(days=days)
    events = [
        {
            "type": item.get("messageType", "UNKNOWN"),
            "id": item.get("messageID", ""),
            "time": item.get("messageIssueTime", ""),
            "url": item.get("messageURL", "https://kauai.ccmc.gsfc.nasa.gov/DONKI/"),
            "summary": (item.get("messageBody", "") or "").splitlines()[0][:240],
        }
        for item in items
    ]
    if status == "unavailable":
        cached = _read_cached_json("donki_7d.json")
        if cached is not None:
            cached["status"] = "cached"
            return cached
    return {
        "count": len(events),
        "window_days": days,
        "start_date": start_date,
        "end_date": end_date,
        "status": status,
        "source": "NASA DONKI",
        "source_url": "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
        "events": events,
    }


@app.get("/api/cmr-evidence")
def get_cmr_evidence() -> dict[str, Any]:
    cached = _read_cached_json("cmr_evidence.json")
    if cached is not None:
        return cached
    raise HTTPException(status_code=404, detail="CMR evidence cache not generated yet")


@app.get("/api/attribution")
def get_attribution(
    region: Optional[str] = Query(default=None),
    lat: Optional[float] = Query(default=None, ge=-90.0, le=90.0),
    lon: Optional[float] = Query(default=None, ge=-180.0, le=180.0),
    start: int = Query(default=1984, ge=1981, le=2026),
    end: int = Query(default=2025, ge=1981, le=2026),
    radius_km: float = Query(default=150.0, ge=10.0, le=1000.0),
) -> dict[str, Any]:
    region_info = resolve_region(region=region, lat=lat, lon=lon)

    try:
        df = fetch_monthly(region_info["lat"], region_info["lon"], start=start, end=end)
    except Exception as exc:
        cached = _read_cached_json(f"attribution_{region_info['id']}.json")
        if cached is not None:
            cached["status"] = "cached"
            return cached
        raise HTTPException(status_code=502, detail=f"NASA POWER upstream error: {exc}") from exc

    t2m_stats = trend(df["T2M"])
    precip_stats = trend(df["PRECTOTCORR"])
    rh_stats = trend(df["RH2M"])
    allsky_stats = trend(df["ALLSKY_SFC_SW_DWN"])
    clrsky_stats = trend(df["CLRSKY_SFC_SW_DWN"])
    cloud_stats = trend(df["CLOUD_ATTEN_PCT"])

    # Vector 2: Fire / Aerosol (FIRMS + Clear-Sky shortwave)
    try:
        fires_df, fires_status = _load_fires_df(bbox=BR_BBOX, days=1, dataset="viirs_noaa21")
        br_fires_count = int(len(fires_df))
        mean_frp = (
            round(float(fires_df["frp"].dropna().mean()), 2)
            if "frp" in fires_df.columns and not fires_df["frp"].dropna().empty
            else None
        )
        if not fires_df.empty and {"latitude", "longitude"}.issubset(fires_df.columns):
            dist = _haversine_km(
                region_info["lat"], region_info["lon"], fires_df["latitude"], fires_df["longitude"]
            )
            nearby_fires = int((dist <= radius_km).sum())
        else:
            nearby_fires = 0
    except Exception:
        fires_status = "unavailable"
        br_fires_count = 0
        mean_frp = None
        nearby_fires = 0

    # Vector 3: Heliophysical (DONKI)
    sw_items, sw_status, sw_start, sw_end = _load_spaceweather(days=7)
    latest_sw = sw_items[0] if sw_items else None

    vectors = [
        {
            "id": "hydrometeorological",
            "label": "Hydrometeorological & Cloud Cover",
            "status": "live",
            "metric": "Precipitation, RH2M & Cloud Attenuation Deficit",
            "value": f"{precip_stats.get('slope_per_decade', 'n/a')} mm/day/dec",
            "details": {
                "precip_slope_per_decade": precip_stats.get("slope_per_decade"),
                "precip_p_value": precip_stats.get("p_value"),
                "rh2m_slope_per_decade": rh_stats.get("slope_per_decade"),
                "rh2m_p_value": rh_stats.get("p_value"),
                "cloud_attenuation_slope_per_decade": cloud_stats.get("slope_per_decade"),
                "cloud_attenuation_p_value": cloud_stats.get("p_value"),
                "allsky_slope_per_decade": allsky_stats.get("slope_per_decade"),
            },
            "interpretation": (
                "Significant cloud attenuation & rainfall shift detected."
                if cloud_stats.get("significant_5pct") or precip_stats.get("significant_5pct")
                else "No statistically significant cloud-cover shift (alpha=0.05)."
            ),
            "source": "NASA POWER (MERRA-2 / CERES)",
            "url": "https://power.larc.nasa.gov/",
        },
        {
            "id": "fire_aerosol",
            "label": "Fire & Atmospheric Aerosol",
            "status": fires_status,
            "metric": f"VIIRS NOAA-21 Fires (24h BR / {int(radius_km)}km radius) + Clear-Sky SW",
            "value": f"{br_fires_count} BR fires ({nearby_fires} within {int(radius_km)} km)",
            "details": {
                "brazil_24h_detections": br_fires_count,
                "nearby_24h_detections": nearby_fires,
                "radius_km": radius_km,
                "mean_frp_mw": mean_frp,
                "clrsky_slope_per_decade": clrsky_stats.get("slope_per_decade"),
                "clrsky_p_value": clrsky_stats.get("p_value"),
                "clrsky_significant": clrsky_stats.get("significant_5pct"),
            },
            "interpretation": (
                "Clear-sky irradiance shifted significantly, pointing to aerosol or column water-vapor change independent of clouds."
                if clrsky_stats.get("significant_5pct")
                else "Clear-sky irradiance shows no significant trend; brightening/dimming is cloud-dominated."
            ),
            "source": "NASA FIRMS (VIIRS_NOAA21_NRT) & NASA POWER",
            "url": "https://firms.modaps.eosdis.nasa.gov/",
            "cmr_concept_id": "C3264430167-LANCEMODIS",
        },
        {
            "id": "heliophysical",
            "label": "Heliophysical / Space Weather",
            "status": sw_status,
            "metric": "7-day Solar & Geomagnetic Alerts (DONKI)",
            "value": f"{len(sw_items)} alerts ({sw_start} to {sw_end})",
            "details": {
                "alert_count_7d": len(sw_items),
                "latest_type": latest_sw.get("messageType") if latest_sw else None,
                "latest_time": latest_sw.get("messageIssueTime") if latest_sw else None,
                "latest_url": latest_sw.get("messageURL") if latest_sw else None,
            },
            "interpretation": (
                f"Active solar-geomagnetic telemetry ({len(sw_items)} events in 7d) monitored for high-latitude & grid GIC resilience."
                if sw_items
                else "Quiet space weather window or DONKI telemetry offline."
            ),
            "source": "NASA DONKI (Space Weather)",
            "url": "https://kauai.ccmc.gsfc.nasa.gov/DONKI/",
        },
        {
            "id": "geothermal_deformation",
            "label": "Geothermal & Surface Deformation",
            "status": "roadmap",
            "metric": "InSAR Surface Displacement & Thermal Anomaly",
            "value": "NISAR L2 GUNW / ECOSTRESS (CMR Verified)",
            "details": {
                "cmr_collection": "NISAR_L2_GUNW_PROVISIONAL_V1",
                "reason_deferred": "Requires Earthdata authentication & multi-GB SAR granules; scheduled post-MVP.",
            },
            "interpretation": "Declared honestly as post-MVP roadmap via NASA Earthdata CMR MCP catalog.",
            "source": "NASA Earthdata CMR (NISAR / ECOSTRESS)",
            "url": "https://cmr.earthdata.nasa.gov/search/concepts/NISAR_L2_GUNW_PROVISIONAL_V1",
        },
    ]

    return {
        "status": "live",
        "region": region_info,
        "period": f"{start}-{end}",
        "headline_temperature": t2m_stats,
        "vectors": vectors,
    }


_ASK_RATE_LIMIT: dict[str, list[float]] = {}
_ASK_MAX_PER_MIN = 5
_VALID_DEPTHS = {"explorer", "analyst", "specialist"}


class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=300)
    name: str = Field(default="Visitor", max_length=40)
    depth: str = Field(default="explorer")
    summary: str = Field(default="", max_length=400)
    route: str = Field(default="/cockpit", max_length=60)


def _check_ask_rate_limit(client_ip: str, now: Optional[float] = None) -> None:
    ts = now if now is not None else time.monotonic()
    recent = [t for t in _ASK_RATE_LIMIT.get(client_ip, []) if ts - t < 60.0]
    if len(recent) >= _ASK_MAX_PER_MIN:
        _ASK_RATE_LIMIT[client_ip] = recent
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded (max 5 live questions per minute per IP).",
        )
    recent.append(ts)
    _ASK_RATE_LIMIT[client_ip] = recent


def _build_grounded_context() -> str:
    """Summarize verified local frozen telemetry stats so live LLM answers never hallucinate numbers."""
    lines = [
        "Verified Cockpit-OMNI Telemetry (NASA POWER MERRA-2/CERES 1984-2025, n=504, Seasonal MK alpha=0.05):"
    ]
    for reg in ("campinas", "petrolina", "manaus"):
        for var in ("T2M", "PRECTOTCORR", "ALLSKY_SFC_SW_DWN", "CLRSKY_SFC_SW_DWN", "CLOUD_ATTEN_PCT", "RH2M", "WS2M"):
            cached = _read_cached_json(f"trend_{reg}_{var}.json")
            if not cached or not cached.get("stats"):
                continue
            st = cached["stats"]
            lines.append(
                f"- {reg}/{var}: slope={st.get('slope_per_decade')}/dec, "
                f"total={st.get('total_change')}, p={st.get('p_value')}, "
                f"tau={st.get('tau')}, sig={st.get('significant_5pct')}, ci95={st.get('ci_95_per_decade')}"
            )
    fires_cache = _read_cached_json("fires_br_1d.geojson")
    if fires_cache:
        lines.append(
            f"- FIRMS frozen snapshot: count={fires_cache.get('count')}, "
            f"returned_features={fires_cache.get('returned_features')}, mean_frp_mw={fires_cache.get('mean_frp_mw')}"
        )
    lines.append(
        "- Explicit scope bounds: WS2M monthly 2m wind has NO significant trend across all 3 biomes (p>=0.17) and cannot predict sub-hourly wind ramps; NISAR & ECOSTRESS are CMR-cataloged roadmap only."
    )
    return "\n".join(lines)


def _call_llm_provider(system_prompt: str, user_prompt: str) -> tuple[str, str, str]:
    providers = [
        (
            "groq",
            os.getenv("GROQ_API_KEY", "").strip(),
            "https://api.groq.com/openai/v1/chat/completions",
            os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        ),
        (
            "openrouter",
            os.getenv("OPENROUTER_API_KEY", "").strip(),
            "https://openrouter.ai/api/v1/chat/completions",
            os.getenv("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free"),
        ),
    ]
    configured = [p for p in providers if p[1]]
    if not configured:
        raise HTTPException(
            status_code=503,
            detail="No live LLM provider key configured on server; use the 10 verified local FAQ answers.",
        )

    last_err = "provider unreachable"
    for name, api_key, endpoint, model in configured:
        try:
            resp = httpx.post(
                endpoint,
                headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
                json={
                    "model": model,
                    "temperature": 0.2,
                    "max_tokens": 350,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                },
                timeout=12.0,
            )
            resp.raise_for_status()
            payload = resp.json()
            text = payload["choices"][0]["message"]["content"].strip()
            if text:
                return text, name, model
        except Exception as exc:
            last_err = str(exc)

    raise HTTPException(status_code=502, detail=f"Upstream tutor providers failed: {last_err}")


@app.post("/api/ask")
def ask_detective(body: AskRequest, request: Request) -> dict[str, Any]:
    clean_question = body.question.strip()
    if not clean_question:
        raise HTTPException(status_code=400, detail="'question' must not be blank.")
    if body.depth not in _VALID_DEPTHS:
        raise HTTPException(status_code=400, detail=f"'depth' must be one of {sorted(_VALID_DEPTHS)}")

    client_ip = request.client.host if request.client else "unknown"
    _check_ask_rate_limit(client_ip)

    safe_name = " ".join(body.name.strip().split()) or "Visitor"
    grounded = _build_grounded_context()
    system_prompt = (
        "You are the Cockpit-OMNI Data Detective Tutor (NASA Space Apps 2026). "
        "Obey scientific honesty: cite ONLY numbers from the verified telemetry block below, "
        "state p-values and null findings clearly, never invent data for roadmap instruments (NISAR/ECOSTRESS), "
        "and keep answers concise (<= 5 sentences) tailored to the visitor's track.\n\n"
        f"{grounded}"
    )
    user_prompt = (
        f"Detective: {safe_name}\n"
        f"Reasoning depth: {body.depth}\n"
        f"Current page: {body.route}\n"
        f"Learning memory summary: {body.summary or 'none'}\n\n"
        f"Question: {clean_question}"
    )
    answer, provider, model = _call_llm_provider(system_prompt, user_prompt)
    return {
        "answer": answer,
        "provider": provider,
        "model": model,
        "depth": body.depth,
    }
