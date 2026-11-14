"""Cockpit-OMNI — trend engine: Seasonal & Original Mann-Kendall + Theil-Sen slope over NASA POWER."""
from __future__ import annotations

from typing import Any
import httpx
import numpy as np
import pandas as pd
import pymannkendall as mk
from scipy.stats import theilslopes

POWER_MONTHLY_URL = "https://power.larc.nasa.gov/api/temporal/monthly/point"
FILL = -999.0
DEFAULT_PARAMS = "T2M,PRECTOTCORR,WS2M,ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN,RH2M"

PRESET_REGIONS: dict[str, dict[str, Any]] = {
    "campinas": {
        "id": "campinas",
        "name": "Campinas-SP",
        "lat": -22.90,
        "lon": -47.06,
        "biome": "Atlantic Forest / Cerrado Transition",
        "context": "Southeast Brazil Industrial & Agribusiness Hub",
    },
    "petrolina": {
        "id": "petrolina",
        "name": "Petrolina-PE",
        "lat": -9.39,
        "lon": -40.50,
        "biome": "Caatinga Semi-Arid",
        "context": "Northeast Renewable Solar & Wind Corridor",
    },
    "manaus": {
        "id": "manaus",
        "name": "Manaus-AM",
        "lat": -3.10,
        "lon": -60.02,
        "biome": "Amazon Rainforest",
        "context": "Central Amazon Basin Climate Reference",
    },
}

VARIABLE_META: dict[str, dict[str, Any]] = {
    "T2M": {
        "label": "2m Air Temperature",
        "unit": "°C",
        "power_unit": "C",
        "vector": "hydrometeorological",
    },
    "PRECTOTCORR": {
        "label": "Bias-Corrected Precipitation",
        "unit": "mm/day",
        "power_unit": "mm/day",
        "vector": "hydrometeorological",
    },
    "ALLSKY_SFC_SW_DWN": {
        "label": "All-Sky Surface Shortwave Irradiance",
        "unit": "MJ/m²/day",
        "power_unit": "MJ/m^2/day",
        "vector": "hydrometeorological",
    },
    "CLRSKY_SFC_SW_DWN": {
        "label": "Clear-Sky Surface Shortwave Irradiance",
        "unit": "MJ/m²/day",
        "power_unit": "MJ/m^2/day",
        "vector": "fire_aerosol",
    },
    "RH2M": {
        "label": "2m Relative Humidity",
        "unit": "%",
        "power_unit": "%",
        "vector": "hydrometeorological",
    },
    "WS2M": {
        "label": "2m Wind Speed",
        "unit": "m/s",
        "power_unit": "m/s",
        "vector": "hydrometeorological",
    },
    "CLOUD_ATTEN_PCT": {
        "label": "Cloud Attenuation Deficit (1 - AllSky / ClearSky)",
        "unit": "%",
        "power_unit": "%",
        "vector": "hydrometeorological",
        "derived": True,
    },
}

_POWER_CACHE: dict[tuple[float, float, int, int, str, str], pd.DataFrame] = {}


def resolve_region(
    region: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
) -> dict[str, Any]:
    """Resolve either a named preset region or custom (lat, lon) coordinates."""
    if region:
        key = region.strip().lower()
        if key in PRESET_REGIONS:
            return dict(PRESET_REGIONS[key])
    if lat is None or lon is None:
        return dict(PRESET_REGIONS["campinas"])
    return {
        "id": f"custom_{round(lat, 2)}_{round(lon, 2)}",
        "name": f"Custom ({round(lat, 2)}, {round(lon, 2)})",
        "lat": round(float(lat), 2),
        "lon": round(float(lon), 2),
        "biome": "Custom Coordinates",
        "context": "User-selected Earth observation point",
    }


def fetch_monthly(
    lat: float,
    lon: float,
    start: int = 1984,
    end: int = 2025,
    params: str = DEFAULT_PARAMS,
    community: str = "AG",
    timeout: float = 90.0,
    use_cache: bool = True,
) -> pd.DataFrame:
    """Fetch monthly NASA POWER point series (1984..end), dropping month-13 annual rows."""
    key = (round(float(lat), 2), round(float(lon), 2), int(start), int(end), params, community)
    if use_cache and key in _POWER_CACHE:
        return _POWER_CACHE[key].copy()

    response = httpx.get(
        POWER_MONTHLY_URL,
        timeout=timeout,
        params={
            "parameters": params,
            "community": community,
            "longitude": key[1],
            "latitude": key[0],
            "start": key[2],
            "end": key[3],
            "format": "JSON",
        },
    )
    response.raise_for_status()
    payload = response.json()["properties"]["parameter"]
    df = pd.DataFrame(payload).replace(FILL, np.nan).astype(float)
    df = df[~df.index.astype(str).str.endswith("13")]  # 202513 = annual summary, not Dec
    df.index = pd.PeriodIndex(df.index, freq="M")
    df = df.sort_index()

    if "ALLSKY_SFC_SW_DWN" in df.columns and "CLRSKY_SFC_SW_DWN" in df.columns:
        clr = df["CLRSKY_SFC_SW_DWN"].replace(0.0, np.nan)
        df["CLOUD_ATTEN_PCT"] = (1.0 - df["ALLSKY_SFC_SW_DWN"] / clr) * 100.0

    if use_cache:
        _POWER_CACHE[key] = df.copy()
    return df


def _format_p(p_val: float) -> float:
    return float(f"{float(p_val):.3e}")


def trend(series: pd.Series, min_obs: int = 120) -> dict[str, Any]:
    """
    Run Seasonal Mann-Kendall (period=12) + Original Mann-Kendall and Theil-Sen slope.

    Returns rate of change per decade, 95% confidence interval on deseasonalized
    monthly anomalies, cumulative shift across the observed span, and raw Sen line
    coefficients for plotting directly on top of the monthly observations.
    """
    s = series.dropna().astype(float)
    if len(s) < min_obs:
        return {"n": int(len(s)), "status": "insufficient"}

    x_idx = np.arange(len(s), dtype=float)
    orig = mk.original_test(s.values)
    raw_slope, raw_intercept, raw_lo, raw_hi = theilslopes(s.values, x_idx, alpha=0.95)

    is_monthly = isinstance(s.index, pd.PeriodIndex) and s.index.freqstr.startswith("M")
    if is_monthly and len(s) >= 24:
        full_idx = pd.period_range(s.index.min(), s.index.max(), freq="M")
        aligned = s.reindex(full_idx)
        seasonal = mk.seasonal_test(aligned.values, period=12)

        anomalies = s - s.groupby(s.index.month).transform("mean")
        anom_slope, anom_intercept, anom_lo, anom_hi = theilslopes(
            anomalies.values, x_idx, alpha=0.95
        )
        primary_test = seasonal
        primary_slope, primary_lo, primary_hi = anom_slope, anom_lo, anom_hi
        method = "Seasonal Mann-Kendall (period=12) + Deseasonalized Theil-Sen (95% CI)"
    else:
        seasonal = None
        primary_test = orig
        primary_slope, primary_lo, primary_hi = raw_slope, raw_lo, raw_hi
        method = "Original Mann-Kendall + Theil-Sen (95% CI)"

    n_obs = int(len(s))
    return {
        "status": "ok",
        "method": method,
        "n": n_obs,
        "tau": round(float(primary_test.Tau), 3),
        "p_value": _format_p(primary_test.p),
        "trend": str(primary_test.trend),
        "significant_5pct": bool(primary_test.p < 0.05),
        "slope_per_decade": round(float(primary_slope) * 120.0, 4),
        "ci_95_per_decade": [
            round(float(primary_lo) * 120.0, 4),
            round(float(primary_hi) * 120.0, 4),
        ],
        "total_change": round(float(primary_slope) * n_obs, 3),
        "original_tau": round(float(orig.Tau), 3),
        "original_p_value": _format_p(orig.p),
        "original_trend": str(orig.trend),
        "original_slope_per_decade": round(float(raw_slope) * 120.0, 4),
        "sen_line": {
            "intercept": round(float(raw_intercept), 4),
            "slope_per_step": round(float(raw_slope), 6),
        },
        "start": str(s.index[0]),
        "end": str(s.index[-1]),
    }


def analyze_variable(
    df: pd.DataFrame,
    variable: str,
    region_info: dict[str, Any],
) -> dict[str, Any]:
    """Format time series + statistical trend summary for API & frozen cache output."""
    if variable not in df.columns:
        raise ValueError(f"Unknown variable '{variable}'. Available: {list(df.columns)}")

    meta = VARIABLE_META.get(
        variable,
        {"label": variable, "unit": "", "power_unit": "", "vector": "hydrometeorological"},
    )
    clean = df[variable].dropna()
    stats = trend(clean)

    sen = stats.get("sen_line")
    series_rows = []
    for i, (idx, val) in enumerate(clean.items()):
        row: dict[str, Any] = {"t": str(idx), "v": round(float(val), 4)}
        if sen is not None:
            row["sen"] = round(sen["intercept"] + sen["slope_per_step"] * i, 4)
        series_rows.append(row)

    return {
        "region": region_info,
        "variable": variable,
        "label": meta["label"],
        "unit": meta["unit"],
        "source": "NASA POWER (MERRA-2 / CERES)",
        "source_url": "https://power.larc.nasa.gov/",
        "stats": stats,
        "series": series_rows,
    }
