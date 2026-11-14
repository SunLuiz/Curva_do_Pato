"""
Cockpit-OMNI — teste real de todas as conexões.
Roda cada cliente contra a fonte viva e salva amostras em data/.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "backend"))

from app.clients.power_client import PowerClient
from app.clients.horizons_client import HorizonsClient
from app.clients.meda_client import MedaClient
from app.clients.ons_client import OnsClient

OUT = ROOT / "data"
OUT.mkdir(exist_ok=True)

RESULT = {}


def save(name, obj):
    path = OUT / name
    if hasattr(obj, "to_csv"):
        obj.to_csv(path.with_suffix(".csv"))
    else:
        path.write_text(json.dumps(obj, indent=2, ensure_ascii=False, default=str), encoding="utf8")
    RESULT[name] = "OK"


# 1) NASA POWER — horário, NE do Brasil (próx. parques eólicos)
try:
    c = PowerClient()
    df = c.point_hourly(-5.2, -38.5, "20260101", "20260105")
    save("power_ne_hourly.csv", df)
    print(f"[POWER ] OK  {len(df)} linhas x {len(df.columns)} col | vento médio={df['WS2M'].mean():.2f} m/s | ghi médio={df['ALLSKY_SFC_SW_DWN'].mean():.0f} W/m2")
    c.close()
except Exception as e:
    RESULT["power"] = f"FAIL {e}"
    print("[POWER ] FAIL", e)

# 2) JPL Horizons — posição solar visto de Marte (499)
try:
    c = HorizonsClient()
    r = c.sun_observer_angles(body="499", center="500@10")
    save("horizons_mars_sun.json", r)
    print(f"[HORIZ ] OK  {r['n']} leituras Sol-de-Marte | ex.: {r['rows'][0] if r['rows'] else 'n/a'}")
    c.close()
except Exception as e:
    RESULT["horizons"] = f"FAIL {e}"
    print("[HORIZ ] FAIL", e)

# 3) MEDA/PDS — Marte real (Perseverance): vento (DER_WS) + radiação (CAL_RDS)
try:
    c = MedaClient()
    sols = c.list_sols("rad")
    dfw = c.sol_csv(40, "wind")
    dfr = c.sol_csv(1100, "rad")
    if dfw is not None:
        save("meda_sol40_wind.csv", dfw)
    if dfr is not None:
        save("meda_sol1100_rad.csv", dfr)
    print(f"[MEDA  ] OK  sols={len(sols)} | vento sol40={len(dfw) if dfw is not None else 0} linhas | rad sol1100={len(dfr) if dfr is not None else 0} linhas")
    if dfw is not None:
        print("         colunas vento:", list(dfw.columns)[:8])
    c.close()
except Exception as e:
    RESULT["meda"] = f"FAIL {e}"
    print("[MEDA  ] FAIL", e)

# 4) ONS — dados abertos (catálogo)
try:
    c = OnsClient()
    res = c.package_search("geracao eolica", rows=3)
    save("ons_search.json", {"packages": res})
    print(f"[ONS   ] OK  {len(res)} datasets encontrados | 1º: {res[0]['title'] if res else 'n/a'}")
    c.close()
except Exception as e:
    RESULT["ons"] = f"FAIL {e}"
    print("[ONS   ] FAIL", e)

print("\n=== RESUMO ===")
for k, v in RESULT.items():
    print(f"  {k}: {v}")
