"""
Extracts audited statistical parameters and real telemetry slices from the
repository's frozen datasets (data/ and frontend/public/cache/) into
frontend/public/game/data/mission_params.json so Rover Pilot 3D remains
100% offline-capable and scientifically auditable.

Usage:
    python scripts/bake_game_data.py
"""

import csv
import json
import math
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "data"
CACHE_DIR = ROOT / "frontend" / "public" / "cache"
OUT_PATH = ROOT / "frontend" / "public" / "game" / "data" / "mission_params.json"


def quantile(sorted_vals, q):
    if not sorted_vals:
        return 0.0
    idx = min(len(sorted_vals) - 1, max(0, int(round(q * (len(sorted_vals) - 1)))))
    return float(sorted_vals[idx])


def bake_power_ne():
    path = DATA_DIR / "power_ne_hourly.csv"
    with path.open("r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    sw = [float(r["ALLSKY_SFC_SW_DWN"]) for r in rows]
    t2m = [float(r["T2M"]) for r in rows]
    ws = [float(r["WS2M"]) for r in rows]

    days = {}
    for r in rows:
        days.setdefault(r["time"][:10], []).append(r)

    peak_day, peak_rows = max(
        days.items(),
        key=lambda kv: max(float(item["ALLSKY_SFC_SW_DWN"]) for item in kv[1]),
    )

    sw_pos = sorted(x for x in sw if x > 0)
    return {
        "source": "NASA POWER Hourly (NE Brazil)",
        "file": "data/power_ne_hourly.csv",
        "rows_count": len(rows),
        "window": {"start": rows[0]["time"], "end": rows[-1]["time"]},
        "stats": {
            "sw_max": round(max(sw), 2),
            "sw_mean_daylight": round(statistics.mean(sw_pos), 2),
            "sw_p90_daylight": round(quantile(sw_pos, 0.90), 2),
            "t2m_min": round(min(t2m), 2),
            "t2m_max": round(max(t2m), 2),
            "ws2m_min": round(min(ws), 2),
            "ws2m_max": round(max(ws), 2),
        },
        "peak_day": peak_day,
        "peak_day_hourly": [
            {
                "hour": int(r["time"][11:13]),
                "sw": round(float(r["ALLSKY_SFC_SW_DWN"]), 2),
                "t2m": round(float(r["T2M"]), 2),
                "ws2m": round(float(r["WS2M"]), 2),
            }
            for r in peak_rows
        ],
        "demand_profile_note": "Grid demand curve is an illustrative typical residential/grid ramp profile because data/ons_search.json contains dataset catalog metadata rather than an hourly MW load series.",
    }


def bake_meda_wind():
    path = DATA_DIR / "meda_sol40_wind.csv"
    with path.open("r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    sentinel_val = 999999999.0
    sentinel_count = 0
    valid_series = []
    for i, r in enumerate(rows):
        raw = r.get("HORIZONTAL_WIND_SPEED", "")
        val = float(raw) if raw else sentinel_val
        if val >= 1e8:
            sentinel_count += 1
            valid_series.append((i, float(r["SCLK"]), None))
        else:
            valid_series.append((i, float(r["SCLK"]), val))

    valid_nums = sorted(v for _, _, v in valid_series if v is not None)
    # Extract a real 80-point window around the Sol 40 peak wind (5.36 m/s)
    peak_idx = max(
        (item for item in valid_series if item[2] is not None),
        key=lambda item: item[2],
    )[0]
    win_start = max(0, peak_idx - 50)
    win_end = min(len(valid_series), peak_idx + 30)
    real_window = [
        {
            "idx": idx,
            "sclk": round(sclk, 1),
            "wind_ms": round(val, 2) if val is not None else sentinel_val,
            "sentinel": val is None,
        }
        for idx, sclk, val in valid_series[win_start:win_end]
    ]

    # Rolling std across valid points to calibrate empirical spread (note: _UNCERTAINTY column is empty in Sol 40 CSV)
    diffs = [
        abs(valid_nums[k] - valid_nums[k - 1])
        for k in range(1, min(len(valid_nums), 2000))
    ]
    return {
        "source": "PDS Mars 2020 Perseverance MEDA Sol 40 (DER_WS)",
        "file": "data/meda_sol40_wind.csv",
        "rows_count": len(rows),
        "valid_count": len(valid_nums),
        "sentinel_count": sentinel_count,
        "sentinel_rate": round(sentinel_count / max(1, len(rows)), 4),
        "sentinel_value": sentinel_val,
        "uncertainty_note": "HORIZONTAL_WIND_SPEED_UNCERTAINTY is blank in this Sol 40 snapshot; empirical P10-P90 dispersion is computed from rolling local MEDA samples.",
        "stats": {
            "min": round(valid_nums[0], 2),
            "p50": round(quantile(valid_nums, 0.50), 2),
            "p90": round(quantile(valid_nums, 0.90), 2),
            "p99": round(quantile(valid_nums, 0.99), 2),
            "max": round(valid_nums[-1], 2),
            "mean": round(statistics.mean(valid_nums), 3),
            "std": round(statistics.pstdev(valid_nums), 3),
            "mean_abs_step": round(statistics.mean(diffs), 4) if diffs else 0.0,
        },
        "real_peak_window": real_window,
    }


def bake_meda_rad():
    path = DATA_DIR / "meda_sol1100_rad.csv"
    with path.open("r", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))

    still_0 = 0
    still_1 = 0
    top1_vals = []
    lat2_vals = []
    sample_slice = []

    for i, r in enumerate(rows):
        st = r.get("ROVER_STILL", "")
        if st == "0":
            still_0 += 1
        elif st == "1":
            still_1 += 1
        t1 = r.get("RDS_TOP_1", "")
        l2 = r.get("RDS_LAT_2_HG", "")
        if t1:
            top1_vals.append(float(t1))
        if l2:
            lat2_vals.append(float(l2))
        if i % 900 == 0 and len(sample_slice) < 60:
            sample_slice.append(
                {
                    "idx": i,
                    "sclk": int(float(r["SCLK"])),
                    "rover_still": int(st) if st in ("0", "1") else 1,
                    "rds_top_1": float(t1) if t1 else None,
                    "rds_lat_2_hg": float(l2) if l2 else None,
                }
            )

    return {
        "source": "PDS Mars 2020 Perseverance MEDA Sol 1100 (CAL_RDS)",
        "file": "data/meda_sol1100_rad.csv",
        "rows_count": len(rows),
        "rover_still_1_count": still_1,
        "rover_still_0_moving_count": still_0,
        "stats": {
            "rds_top_1_count": len(top1_vals),
            "rds_top_1_min": round(min(top1_vals), 7),
            "rds_top_1_max": round(max(top1_vals), 7),
            "rds_lat_2_hg_count": len(lat2_vals),
            "rds_lat_2_hg_min": round(min(lat2_vals), 7),
            "rds_lat_2_hg_max": round(max(lat2_vals), 7),
        },
        "real_sample_slice": sample_slice,
    }


def bake_trends():
    keys = [
        ("campinas", "ALLSKY_SFC_SW_DWN"),
        ("campinas", "CLRSKY_SFC_SW_DWN"),
        ("campinas", "CLOUD_ATTEN_PCT"),
        ("campinas", "WS2M"),
        ("campinas", "T2M"),
        ("manaus", "ALLSKY_SFC_SW_DWN"),
        ("manaus", "CLRSKY_SFC_SW_DWN"),
        ("manaus", "CLOUD_ATTEN_PCT"),
        ("manaus", "WS2M"),
        ("petrolina", "WS2M"),
        ("petrolina", "ALLSKY_SFC_SW_DWN"),
    ]
    out = {}
    for region, var in keys:
        d = json.loads((CACHE_DIR / f"trend_{region}_{var}.json").read_text(encoding="utf-8"))
        # Annual means for compact 42-year debrief / mission chart (1984-2025)
        series = d.get("series", [])
        by_year = {}
        for pt in series:
            yr = pt["t"][:4]
            by_year.setdefault(yr, []).append(pt["v"])
        annual = [
            {"year": yr, "v": round(statistics.mean(vals), 4)}
            for yr, vals in sorted(by_year.items())
        ]
        out[f"{region}_{var}"] = {
            "stats": d["stats"],
            "annual_series": annual,
        }
    return out


def bake_space_and_fires():
    donki = json.loads((CACHE_DIR / "donki_7d.json").read_text(encoding="utf-8"))
    analog = json.loads((CACHE_DIR / "space_analog.json").read_text(encoding="utf-8"))
    horizons = json.loads((DATA_DIR / "horizons_mars_sun.json").read_text(encoding="utf-8"))

    with (DATA_DIR / "firms_br_24h.csv").open("r", encoding="utf-8") as f:
        firms_rows = list(csv.DictReader(f))

    return {
        "donki": {
            "source": donki.get("source"),
            "window": [donki.get("start_date"), donki.get("end_date")],
            "count": donki.get("count", 0),
            "events": [
                {
                    "type": e.get("type"),
                    "id": e.get("id"),
                    "time": e.get("time"),
                }
                for e in donki.get("events", [])
            ],
        },
        "space_analog": {
            "osdr_study": analog.get("osdr", {}).get("study_id"),
            "osdr_title": analog.get("osdr", {}).get("title"),
            "dsn_stations": analog.get("dsn", {}).get("stations", []),
            "dsn_active_dishes": analog.get("dsn", {}).get("active_dishes_count"),
            "celestrak_eclipse_pct": analog.get("celestrak", {}).get("approx_eclipse_pct"),
            "celestrak_period_min": analog.get("celestrak", {}).get("orbital_period_min"),
        },
        "horizons_mars_sun": {
            "rows_count": len(horizons.get("rows", [])),
            "el_min": round(min(r["el"] for r in horizons["rows"]), 4),
            "el_max": round(max(r["el"] for r in horizons["rows"]), 4),
        },
        "firms_br_24h": {
            "rows_count": len(firms_rows),
            "max_frp": round(max(float(r["frp"]) for r in firms_rows), 2) if firms_rows else 0,
        },
    }


def main():
    payload = {
        "schema_version": 1,
        "power_ne_hourly": bake_power_ne(),
        "meda_sol40_wind": bake_meda_wind(),
        "meda_sol1100_rad": bake_meda_rad(),
        "trends": bake_trends(),
        "space_and_fires": bake_space_and_fires(),
    }
    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUT_PATH.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print(f"Wrote {OUT_PATH} ({OUT_PATH.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
