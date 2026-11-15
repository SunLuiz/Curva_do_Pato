"""
Cockpit-OMNI — JPL Horizons client (ephemerides, no key required).
Sun/observer geometry as seen from any Solar System body (Mars=499, Moon=301, Earth=399).
"""
from __future__ import annotations

import re
from typing import Dict, Optional

import httpx


class HorizonsClient:
    BASE = "https://ssd.jpl.nasa.gov/api/horizons.api"

    def __init__(self, timeout: float = 40.0):
        self.client = httpx.Client(timeout=timeout)

    def close(self) -> None:
        self.client.close()

    def sun_observer_angles(
        self,
        body: str = "499",  # Mars="499"; Moon="301"; Earth="399"
        center: Optional[str] = None,
        start: str = "2026-11-14",
        stop: str = "2026-11-16",
        step: str = "6h",
    ) -> Dict:
        """
        OBSERVER ephemeris for the Sun ('10') seen from `center` (defaults to `500@<body>`).
        QUANTITIES='1,20' returns apparent RA/Az & Dec/El plus observer range (AU).
        """
        clean_body = str(body or "499").strip().strip("'")
        resolved_center = (
            str(center).strip().strip("'")
            if center is not None
            else (clean_body if "@" in clean_body else f"500@{clean_body}")
        )
        params = {
            "format": "text",
            "COMMAND": "'10'",  # Target: Sun (10; '1' is Mercury barycenter)
            "OBJ_DATA": "'NO'",
            "MAKE_EPHEM": "'YES'",
            "EPHEM_TYPE": "'OBSERVER'",
            "CENTER": f"'{resolved_center}'",
            "START_TIME": f"'{start}'",
            "STOP_TIME": f"'{stop}'",
            "STEP_SIZE": f"'{step}'",
            "QUANTITIES": "'1,20'",
            "ANG_FORMAT": "'DEG'",
            "CSV_FORMAT": "'YES'",
        }
        r = self.client.get(self.BASE, params=params)
        r.raise_for_status()
        return parse_ephem(r.text)


def _safe_float(token: str) -> Optional[float]:
    try:
        return float(token.strip())
    except (TypeError, ValueError):
        return None


def parse_ephem(text: str) -> Dict:
    """Extract tabular rows of an OBSERVER ephemeris (supports both CSV and whitespace formats)."""
    rows = []
    in_table = False
    for line in text.splitlines():
        s = line.strip()
        if not s:
            continue
        if s.startswith("$$SOE"):
            in_table = True
            continue
        if s.startswith("$$EOE"):
            in_table = False
            continue
        if "Date__(UT)" in s:
            in_table = True
            continue
        if not in_table or s.startswith("*") or s.startswith("$"):
            continue
        if not re.match(r"^\d{4}-[A-Za-z]{3}-\d{2}", s):
            continue

        if "," in s:
            cols = [c.strip() for c in s.split(",")]
            # Horizons CSV format: Date__(UT)__HR:MN, solar_flag, lunar_flag, RA/Az, DEC/El, ...
            if len(cols) >= 5:
                az = _safe_float(cols[3])
                el = _safe_float(cols[4])
                if az is not None and el is not None:
                    rows.append({"utc": cols[0], "az": az, "el": el})
            continue

        parts = s.split()
        # Whitespace text format may omit or include 1-char presence flags at parts[2]
        if len(parts) >= 5:
            p2 = _safe_float(parts[2])
            if p2 is not None:
                az, el = p2, _safe_float(parts[3])
            else:
                az, el = _safe_float(parts[3]), _safe_float(parts[4])
            if az is not None and el is not None:
                rows.append({"utc": f"{parts[0]} {parts[1]}", "az": az, "el": el})
    return {"rows": rows, "n": len(rows)}


if __name__ == "__main__":
    h = HorizonsClient()
    r = h.sun_observer_angles(body="499")
    print("n rows:", r["n"])
    if r["rows"]:
        print("first:", r["rows"][0])
        print("last:", r["rows"][-1])
    h.close()
