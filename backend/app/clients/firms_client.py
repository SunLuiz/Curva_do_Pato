"""
Cockpit-OMNI — NASA FIRMS client (queimadas MODIS/VIIRS, near-real-time).
Requer FIRMS_MAP_KEY no .env (gratuita; 5000 transações/10min).
"""
from __future__ import annotations

import os
import httpx
import pandas as pd
from typing import Optional, List
from dotenv import load_dotenv

load_dotenv()

# bbox padrão: Brasil continental [west, south, east, north]
BR_BBOX = "-74,-34,-34,6"

# datasets válidos (S-NPP será descontinuado em 02/11/2026)
DATASETS = {
    "viirs_noaa21": "VIIRS_NOAA21_NRT",
    "viirs_noaa20": "VIIRS_NOAA20_NRT",
    "viirs_snpp": "VIIRS_SNPP_NRT",
    "modis": "MODIS_NRT",
}


class FirmsClient:
    BASE = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

    def __init__(self, api_key: Optional[str] = None, timeout: float = 60.0):
        self.api_key = api_key or os.getenv("FIRMS_MAP_KEY", "")
        if not self.api_key:
            raise ValueError("FIRMS_MAP_KEY ausente — configure o .env")
        self.client = httpx.Client(timeout=timeout)

    def close(self) -> None:
        self.client.close()

    def active_fires(
        self,
        bbox: str = BR_BBOX,
        days: int = 1,
        dataset: str = "viirs_noaa21",
    ) -> pd.DataFrame:
        """Focos de calor ativos na área [west,south,east,north] nos últimos N dias."""
        ds = DATASETS.get(dataset, dataset)
        url = f"{self.BASE}/{self.api_key}/{ds}/{bbox}/{days}"
        r = self.client.get(url)
        r.raise_for_status()
        if r.status_code != 200:
            raise RuntimeError(f"FIRMS error {r.status_code}: {r.text[:200]}")
        return pd.read_csv(io_from_text(r.text))

    def fires_near(
        self, lat: float, lon: float, radius_km: float = 50,
        days: int = 1, dataset: str = "viirs_noaa21",
    ) -> pd.DataFrame:
        """Focos em um raio ao redor de um ponto (ex.: parque eólico do NE)."""
        df = self.active_fires(BR_BBOX, days, dataset)
        if df.empty:
            return df
        # haversine aproximada
        import numpy as np
        lat_r = np.radians(df["latitude"])
        lon_r = np.radians(df["longitude"])
        alat = np.radians(lat); alon = np.radians(lon)
        d = 6371.0 * np.arccos(
            np.sin(alat) * np.sin(lat_r) + np.cos(alat) * np.cos(lat_r) * np.cos(lon_r - alon)
        )
        return df[d <= radius_km].copy()


def io_from_text(text: str) -> "pd.io.common.StringIO":
    from io import StringIO
    return StringIO(text)


if __name__ == "__main__":
    c = FirmsClient()
    df = c.active_fires(days=1)
    print("focos BR 24h:", len(df))
    near = c.fires_near(-5.2, -38.5, radius_km=100)
    print("focos perto de -5.2,-38.5 (NE):", len(near))
    c.close()
