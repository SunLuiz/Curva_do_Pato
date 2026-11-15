"""
Cockpit-OMNI — ONS Dados Abertos client (CKAN, sem chave).
Real wind/solar generation per SIN subsystem (terrestrial ground truth).
"""
from __future__ import annotations

import os
import httpx
import pandas as pd
from typing import Optional


class OnsClient:
    BASE = os.getenv("ONS_CKAN_BASE_URL", "https://dados.ons.org.br").strip().rstrip("/")

    def __init__(self, timeout: float = 45.0):
        self.client = httpx.Client(timeout=timeout, follow_redirects=True)

    def close(self) -> None:
        self.client.close()

    def package_search(self, q: str, rows: int = 5) -> list:
        """Search datasets in the ONS CKAN catalog."""
        url = f"{self.BASE}/api/3/action/package_search"
        r = self.client.get(url, params={"q": q, "rows": rows})
        r.raise_for_status()
        out = []
        for p in r.json()["result"]["results"]:
            out.append({
                "id": p.get("id"),
                "name": p.get("name"),
                "title": p.get("title"),
            })
        return out

    def resource_search(self, q: str = "name:gera", rows: int = 5) -> list:
        url = f"{self.BASE}/api/3/action/resource_search"
        r = self.client.get(url, params={"query": q, "rows": rows})
        r.raise_for_status()
        return r.json()["result"]["results"]

    def download_csv(self, resource_id: str) -> Optional[pd.DataFrame]:
        url = f"{self.BASE}/api/3/action/datastore_search"
        r = self.client.get(url, params={"resource_id": resource_id, "limit": 100})
        r.raise_for_status()
        rec = r.json()["result"]
        return pd.DataFrame(rec.get("records", []))


if __name__ == "__main__":
    c = OnsClient()
    res = c.package_search("geracao eolica", rows=3)
    print("datasets:", [(r["name"], r["title"]) for r in res])
    c.close()
