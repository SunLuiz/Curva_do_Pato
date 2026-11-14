"""
Cockpit-OMNI — NASA POWER client (aberto, sem chave).
Irradiância solar (CERES) e vento (MERRA-2), temporal horário/diário em ponto.
"""
from __future__ import annotations

import httpx
import pandas as pd
from typing import Dict, List, Optional


class PowerClient:
    BASE = "https://power.larc.nasa.gov/api"

    def __init__(self, timeout: float = 30.0):
        self.client = httpx.Client(timeout=timeout)

    def close(self) -> None:
        self.client.close()

    def point_hourly(
        self,
        lat: float,
        lon: float,
        start: str,
        end: str,
        parameters: str = "WS2M,ALLSKY_SFC_SW_DWN,T2M,PRECTOTCORR",
        community: str = "RE",
    ) -> pd.DataFrame:
        """Série horária em um ponto. Retorna DataFrame com coluna `time`."""
        url = f"{self.BASE}/temporal/hourly/point"
        params = {
            "parameters": parameters,
            "community": community,
            "longitude": round(lon, 2),
            "latitude": round(lat, 2),
            "start": start,
            "end": end,
            "format": "JSON",
        }
        r = self.client.get(url, params=params)
        r.raise_for_status()
        data = r.json()["properties"]["parameter"]
        df = pd.DataFrame(data)
        df["time"] = pd.to_datetime(df.index, format="%Y%m%d%H")
        df = df.set_index("time").sort_index()
        return df

    def point_daily(
        self,
        lat: float,
        lon: float,
        start: str,
        end: str,
        parameters: str = "WS2M,ALLSKY_SFC_SW_DWN,T2M,PRECTOTCORR",
        community: str = "RE",
    ) -> pd.DataFrame:
        url = f"{self.BASE}/temporal/daily/point"
        params = {
            "parameters": parameters,
            "community": community,
            "longitude": round(lon, 2),
            "latitude": round(lat, 2),
            "start": start,
            "end": end,
            "format": "JSON",
        }
        r = self.client.get(url, params=params)
        r.raise_for_status()
        data = r.json()["properties"]["parameter"]
        df = pd.DataFrame(data)
        df["time"] = pd.to_datetime(df.index, format="%Y%m%d")
        df = df.set_index("time").sort_index()
        return df


if __name__ == "__main__":
    # smoke test: SE/NE do SIN
    c = PowerClient()
    df = c.point_hourly(-5.2, -38.5, "20260101", "20260105")
    print(df.head(3))
    print("rows:", len(df), "cols:", list(df.columns))
    c.close()
