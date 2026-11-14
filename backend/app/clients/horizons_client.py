"""
Cockpit-OMNI — JPL Horizons client (efemérides, sem chave).
Posição Sol/Terra vista de qualquer corpo (Lua=10-base, Marte=499).
"""
from __future__ import annotations

import httpx
import re
from typing import Dict, Optional


class HorizonsClient:
    BASE = "https://ssd.jpl.nasa.gov/api/horizons.api"

    def __init__(self, timeout: float = 40.0):
        self.client = httpx.Client(timeout=timeout)

    def close(self) -> None:
        self.client.close()

    def sun_observer_angles(
        self,
        body: str = "499",  # Mars; "301"=Moon, "399"=Earth
        center: str = "500@10",  # center body observatory (@10 = Sun-centered? use body frame)
        start: str = "2026-11-14",
        stop: str = "2026-11-16",
        step: str = "6h",
    ) -> Dict:
        """
        Ephemeris OBSERVER para o Sol (1) visto do astro alvo.
        QUANTITIES=1 (az/el), 20 (range) -> posição solar.
        """
        url = self.BASE
        params = {
            "format": "text",
            "COMMAND": "'1'",  # Sun observado
            "OBJ_DATA": "'NO'",
            "MAKE_EPHEM": "'YES'",
            "EPHEM_TYPE": "'OBSERVER'",
            "CENTER": f"'{center}'",
            "START_TIME": f"'{start}'",
            "STOP_TIME": f"'{stop}'",
            "STEP_SIZE": f"'{step}'",
            "QUANTITIES": "'1,20'",
            "ANG_FORMAT": "'DEG'",
        }
        r = self.client.get(url, params=params)
        r.raise_for_status()
        return parse_ephem(r.text)


def parse_ephem(text: str) -> Dict:
    """Extrai as linhas tabulares de um ephemeris OBSERVER/APPARENT."""
    rows = []
    in_table = False
    for line in text.splitlines():
        s = line.strip()
        if re.search(r"^\*+$", s):
            continue
        if "Date__(UT)" in s or "Date__(UT)" in line:
            in_table = True
            continue
        if in_table and s and not s.startswith("$") and not s.startswith("$$"):
            # linha de dados: começa com "2026-Nov-14 00:00"
            if re.match(r"^\d{4}-[A-Za-z]{3}-\d{2}", s):
                parts = s.split()
                if len(parts) >= 5:
                    rows.append({
                        "utc": f"{parts[0]} {parts[1]}",
                        "az": float(parts[3]),
                        "el": float(parts[4]),
                    })
    return {"rows": rows, "n": len(rows)}


if __name__ == "__main__":
    h = HorizonsClient()
    r = h.sun_observer_angles(body="499", center="500@10")
    print("n rows:", r["n"])
    if r["rows"]:
        print("first:", r["rows"][0])
        print("last:", r["rows"][-1])
    h.close()
