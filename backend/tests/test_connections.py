"""
Cockpit-OMNI — live test of every connection.
Runs each client against the live source and saves samples under data/.
Guarded under __main__ so pytest collection runs cleanly offline.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT / "backend"))

from app.clients.horizons_client import HorizonsClient
from app.clients.meda_client import MedaClient
from app.clients.ons_client import OnsClient
from app.clients.power_client import PowerClient


def run_live_smoke_checks(out_dir: Path | None = None) -> dict[str, str]:
    target_dir = out_dir or (ROOT / "data")
    target_dir.mkdir(exist_ok=True)
    result: dict[str, str] = {}

    def save(name: str, obj) -> None:
        path = target_dir / name
        if hasattr(obj, "to_csv"):
            obj.to_csv(path.with_suffix(".csv"))
        else:
            path.write_text(json.dumps(obj, indent=2, ensure_ascii=False, default=str), encoding="utf8")
        result[name] = "OK"

    # 1) NASA POWER — hourly, NE Brazil (next to wind farms)
    c_power = PowerClient()
    try:
        df = c_power.point_hourly(-5.2, -38.5, "20260101", "20260105")
        save("power_ne_hourly.csv", df)
        print(
            f"[POWER ] OK  {len(df)} rows x {len(df.columns)} cols | "
            f"mean wind={df['WS2M'].mean():.2f} m/s | mean ghi={df['ALLSKY_SFC_SW_DWN'].mean():.0f}"
        )
    except Exception as e:
        result["power"] = f"FAIL {e}"
        print("[POWER ] FAIL", e)
    finally:
        c_power.close()

    # 2) JPL Horizons — solar geometry as seen from Mars (499)
    c_hor = HorizonsClient()
    try:
        r = c_hor.sun_observer_angles(body="499")
        save("horizons_mars_sun.json", r)
        print(f"[HORIZ ] OK  {r['n']} Sun-from-Mars readings | e.g.: {r['rows'][0] if r['rows'] else 'n/a'}")
    except Exception as e:
        result["horizons"] = f"FAIL {e}"
        print("[HORIZ ] FAIL", e)
    finally:
        c_hor.close()

    # 3) MEDA/PDS — real Mars data (Perseverance): wind (DER_WS) + radiation (CAL_RDS)
    c_meda = MedaClient()
    try:
        sols = c_meda.list_sols("rad")
        dfw = c_meda.sol_csv(40, "wind")
        dfr = c_meda.sol_csv(1100, "rad")
        if dfw is not None:
            save("meda_sol40_wind.csv", dfw)
        if dfr is not None:
            save("meda_sol1100_rad.csv", dfr)
        print(
            f"[MEDA  ] OK  sols={len(sols)} | "
            f"wind sol40={len(dfw) if dfw is not None else 0} rows | "
            f"rad sol1100={len(dfr) if dfr is not None else 0} rows"
        )
        if dfw is not None:
            print("         wind columns:", list(dfw.columns)[:8])
    except Exception as e:
        result["meda"] = f"FAIL {e}"
        print("[MEDA  ] FAIL", e)
    finally:
        c_meda.close()

    # 4) ONS — open data (catalog)
    c_ons = OnsClient()
    try:
        res = c_ons.package_search("geracao eolica", rows=3)
        save("ons_search.json", {"packages": res})
        print(f"[ONS   ] OK  {len(res)} datasets found | first: {res[0]['title'] if res else 'n/a'}")
    except Exception as e:
        result["ons"] = f"FAIL {e}"
        print("[ONS   ] FAIL", e)
    finally:
        c_ons.close()

    print("\n=== SUMMARY ===")
    for k, v in result.items():
        print(f"  {k}: {v}")
    return result


if __name__ == "__main__":
    run_live_smoke_checks()
