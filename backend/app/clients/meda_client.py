"""
Cockpit-OMNI — PDS Atmospheres / MEDA (Perseverance) client.
Dados REAIS de Marte via arquivos <sol> (CSV plano, header na 1a linha).
Produtos: wind (DER/WS), rad (CAL/RDS), temp (CAL/ATS), pres (CAL/PS).
Aberto, sem chave.
"""
from __future__ import annotations

import httpx
import re
import pandas as pd
from typing import Optional, List

BASE = "https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda"

# produto -> (colecao, marca no nome do arquivo)
PRODUCTS = {
    "wind": ("data_derived_env", "DER_WS"),
    "rad":  ("data_calibrated_env", "CAL_RDS"),
    "temp": ("data_calibrated_env", "CAL_ATS"),
    "pres": ("data_calibrated_env", "CAL_PS"),
}


class MedaClient:
    def __init__(self, timeout: float = 120.0):
        self.client = httpx.Client(timeout=timeout, follow_redirects=True)

    def close(self) -> None:
        self.client.close()

    def _dir(self, path: str) -> List[str]:
        url = BASE + path if path.startswith("/") else f"{BASE}/{path}"
        if not url.endswith("/"):
            url += "/"
        r = self.client.get(url)
        r.raise_for_status()
        return re.findall(r'href="([^"]+/)"', r.text)

    def _files(self, path: str) -> List[str]:
        url = BASE + path if path.startswith("/") else f"{BASE}/{path}"
        if not url.endswith("/"):
            url += "/"
        r = self.client.get(url)
        r.raise_for_status()
        return re.findall(r'href="([^"]+\.CSV)"', r.text)

    def _sol_bucket(self, sol: int, collection: str) -> Optional[str]:
        for d in self._dir(f"{collection}/"):
            m = re.match(r"sol_(\d+)_(\d+)/$", d)
            if m and int(m.group(1)) <= sol <= int(m.group(2)):
                return d.rstrip("/")
        return None

    def sol_csv(self, sol: int, product: str = "rad") -> Optional[pd.DataFrame]:
        """Baixa o CSV de um sol e devolve DataFrame com colunas numericas."""
        if product not in PRODUCTS:
            raise ValueError(f"produto desconhecido: {product} (use {list(PRODUCTS)})")
        col, marker = PRODUCTS[product]
        bucket = self._sol_bucket(sol, col)
        if not bucket:
            return None
        files = self._files(f"{col}/{bucket}/sol_{sol:04d}")
        match = [f for f in files if marker in f]
        if not match:
            return None
        url = f"{BASE}/{col}/{bucket}/sol_{sol:04d}/{match[0]}"
        r = self.client.get(url)
        r.raise_for_status()
        text = r.content.decode("utf8", errors="ignore")
        return self._parse_csv(text)

    @staticmethod
    def _parse_csv(text: str) -> pd.DataFrame:
        """CSV plano PDS: header na 1a linha, depois linhas de dados numericos."""
        lines = [l for l in text.splitlines() if l.strip()]
        header = [h.strip().strip('"') for h in lines[0].split(",")]
        rows = []
        for l in lines[1:]:
            vals = [v.strip().strip('"') for v in l.split(",")]
            if len(vals) >= len(header):
                rows.append(vals[: len(header)])
        df = pd.DataFrame(rows, columns=header)
        for c in df.columns:
            df[c] = pd.to_numeric(df[c], errors="coerce")
        return df

    def list_sols(self, product: str = "rad") -> List[int]:
        col, _ = PRODUCTS[product]
        sols: List[int] = []
        for d in self._dir(f"{col}/"):
            m = re.match(r"sol_(\d+)_(\d+)/$", d)
            if m:
                sols.extend(range(int(m.group(1)), int(m.group(2)) + 1))
        return sorted(sols)


if __name__ == "__main__":
    c = MedaClient()
    dfw = c.sol_csv(40, "wind")
    print("wind sol 40:", "OK" if dfw is not None and len(dfw) else "sem dados", end=" | ")
    if dfw is not None:
        print(len(dfw), "linhas | colunas:", list(dfw.columns)[:6])
    dfr = c.sol_csv(1100, "rad")
    print("rad sol 1100:", "OK" if dfr is not None and len(dfr) else "sem dados", end=" | ")
    if dfr is not None:
        print(len(dfr), "linhas | colunas:", list(dfr.columns)[:6])
    c.close()
