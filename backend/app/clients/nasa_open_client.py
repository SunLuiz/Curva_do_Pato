"""
Cockpit-OMNI — NASA Open APIs client (DONKI clima espacial).
Requer NASA_API_KEY no .env (gratuita; 1.000 req/24h/IP).
Alerts: CME, flare (FLR), geomagnetic storm (GST), RBE, SEP.
"""
from __future__ import annotations

import os
import httpx
from typing import List, Dict, Optional
from dotenv import load_dotenv

load_dotenv()


class NasaOpenClient:
    BASE = "https://api.nasa.gov"
    DONKI_BASE = os.getenv("NASA_DONKI_BASE", "https://api.nasa.gov/DONKI").strip().rstrip("/")

    def __init__(self, api_key: Optional[str] = None, timeout: float = 40.0):
        self.api_key = api_key or os.getenv("NASA_API_KEY", "")
        if not self.api_key:
            raise ValueError("NASA_API_KEY ausente — configure o .env")
        self.client = httpx.Client(timeout=timeout)

    def close(self) -> None:
        self.client.close()

    def donki_notifications(self, start: str, end: str, typed: str = "all") -> List[Dict]:
        """Space weather notifications in the period (YYYY-MM-DD format)."""
        url = f"{self.DONKI_BASE}/notifications"
        r = self.client.get(url, params={
            "startDate": start, "endDate": end, "type": typed, "api_key": self.api_key,
        })
        r.raise_for_status()
        return r.json()

    def donki_cmes(self, start: str, end: str) -> List[Dict]:
        url = f"{self.DONKI_BASE}/CME"
        r = self.client.get(url, params={"startDate": start, "endDate": end, "api_key": self.api_key})
        r.raise_for_status()
        return r.json()

    def donki_gst(self, start: str, end: str) -> List[Dict]:
        """Geomagnetic storms (relevant to GIC on power transformers)."""
        url = f"{self.DONKI_BASE}/GST"
        r = self.client.get(url, params={"startDate": start, "endDate": end, "api_key": self.api_key})
        r.raise_for_status()
        return r.json()


if __name__ == "__main__":
    c = NasaOpenClient()
    notif = c.donki_notifications("2026-11-01", "2026-11-14")
    print("notifications:", len(notif))
    for n in notif[:3]:
        print("  -", n.get("messageType"), "|", str(n.get("messageIssueTime"))[:16], "|", n.get("messageID"))
    c.close()
