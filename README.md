# Cockpit-OMNI — Earth System Trend Detective

> **NASA Space Apps Challenge 2026 — Campinas, SP, Brazil**  
> **Target Challenge:** [#2 Be An Earth System Trend Detective!](https://www.spaceappschallenge.org/2026/challenges/) (Earth · Advanced)

**Cockpit-OMNI** is an open, statistically audited Earth observation and trend attribution workbench. Given any geographic region and Earth system variable, it retrieves multi-decade NASA satellite/reanalysis time series (`1984–2025`, `n = 504` months), tests trend significance using Seasonal & Original Mann-Kendall + deseasonalized Theil-Sen regression with 95% confidence intervals, and attributes observed shifts across four physical vectors with transparent operational status (`live`, `cached`, or `roadmap`).

---

## Challenge #2 Requirements — Item-by-Item Coverage

| Requirement | Implementation in Cockpit-OMNI |
|---|---|
| **1. Earth System Variable(s)** | 2m Air Temperature (`T2M`, °C), Bias-Corrected Precipitation (`PRECTOTCORR`, mm/day), All-Sky & Clear-Sky Surface Shortwave Irradiance (`ALLSKY_SFC_SW_DWN`, `CLRSKY_SFC_SW_DWN`, MJ/m²/day), 2m Relative Humidity (`RH2M`, %), 2m Wind Speed (`WS2M`, m/s), plus derived **Cloud Attenuation Deficit** (`1 - ALLSKY/CLRSKY`). |
| **2. Specific Region(s)** | Preset monitoring stations across distinct Brazilian biomes — **Campinas-SP** (`-22.90, -47.06`), **Petrolina-PE** (`-9.39, -40.50`), and **Manaus-AM** (`-3.10, -60.02`) — plus arbitrary `(lat, lon)` coordinate queries. |
| **3. Long-Term Time Series** | 42-year continuous monthly records (`1984–2025`, `504` monthly observations per variable) fetched from **NASA POWER** (CERES & MERRA-2). |
| **4. Rate of Change & Significance Testing** | **Seasonal Mann-Kendall** (`period=12`), **Original Mann-Kendall** (`τ`, `p-value`, verdict at `α = 0.05`), and **Deseasonalized Theil-Sen estimator** (`slope/decade`, 95% confidence interval, cumulative 42-year shift). |

---

## Multi-Vector Attribution Architecture

Instead of treating trends as isolated numbers, Cockpit-OMNI evaluates four physical driver vectors, each tagged with an honest operational status and clickable NASA dataset provenance:

| Vector | Physical Signal | Data Source | Status |
|---|---|---|---|
| **Hydrometeorological** | Precipitation (`PRECTOTCORR`), humidity (`RH2M`), and All-Sky vs. Clear-Sky cloud attenuation | NASA POWER (MERRA-2 / CERES) | `live` |
| **Fire & Aerosol** | Active thermal anomalies, Fire Radiative Power (FRP), and Clear-Sky shortwave shifts | NASA FIRMS (`VIIRS_NOAA21_NRT`) | `live` |
| **Heliophysical** | Solar flares, coronal mass ejections, and geomagnetic storm alerts | NASA DONKI (`api.nasa.gov`) | `live` |
| **Geothermal & Surface Deformation** | Interferometric surface displacement & land surface temperature | NASA NISAR (`NISAR_L2_GUNW_PROVISIONAL_V1`) & ECOSTRESS via CMR | `roadmap` |

> **Galactic / Local Impact Narrative:** The same trend-and-anomaly telemetry pattern extends naturally as an analog for extraterrestrial habitat environmental monitoring (Mars Perseverance MEDA & JPL Horizons ephemeris clients are included in `cockpit-omni/backend/app/clients/`).

---

## Verified Benchmark Results (NASA POWER, 1984–2025, n = 504 months)

Using Seasonal Mann-Kendall (`period=12`) and deseasonalized Theil-Sen anomalies (`α = 0.05`):

- **Campinas-SP (`-22.90, -47.06`):** `T2M` `+0.409 °C/decade` (`95% CI: [+0.333, +0.489]`, `τ = +0.293`, `p < 1e-16`), `PRECTOTCORR` `-0.272 mm/day/decade` (`τ = -0.149`, `p = 1.59e-06`), `RH2M` `-1.660 %/decade` (`τ = -0.296`, `p < 1e-16`).
- **Manaus-AM (`-3.10, -60.02`):** `T2M` `+0.307 °C/decade` (`τ = +0.381`, `p < 1e-16`), `PRECTOTCORR` `-0.467 mm/day/decade` (`τ = -0.204`, `p = 4.24e-11`), `Cloud Attenuation` `-0.855 %/decade` (`p = 3.02e-08`) while `CLRSKY_SFC_SW_DWN` shows no significant trend (`p = 0.769`) — isolating cloud reduction as the physical driver of surface brightening.

---

## Project Structure

```text
Curva_do_Pato/                     # repository root (this is what you clone)
├── backend/
│   ├── app/
│   │   ├── clients/               # NASA POWER, FIRMS, DONKI, MEDA, JPL Horizons, ONS
│   │   ├── trend.py               # Mann-Kendall + deseasonalized Theil-Sen engine
│   │   └── main.py                # FastAPI endpoints (/healthz, /api/trend, /api/fires, /api/spaceweather, /api/attribution)
│   └── tests/                     # API & statistical engine tests
├── data/                          # Sample & frozen fallback JSON/CSV snapshots
├── frontend/                      # Vite web dashboard
├── docs/pitch_deck.html           # 7-slide demo deck
├── Dockerfile                     # Hugging Face Space (Docker, port 7860)
├── requirements.txt
├── REFERENCES.md                  # Full NASA & external dataset citations
└── AI_DISCLOSURE.md               # Transparent AI usage declaration
```

---

## Quickstart (Local Backend)

Clone the repository and you land directly in the project root — no `cd` into a subfolder:

```bash
git clone https://github.com/SunLuiz/Curva_do_Pato.git
cd Curva_do_Pato
cp .env.example .env           # Add NASA_API_KEY and FIRMS_MAP_KEY (free keys)
.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

Run tests:

```bash
.venv/Scripts/python.exe -m pytest backend/tests -q
```

---

## Scientific & Branding Notice

- **Prototype Disclaimer:** Statistical trends and attribution scores generated by Cockpit-OMNI are comparative prototype estimates computed from historical open NASA datasets and should not replace certified meteorological or grid-dispatch advisories.
- **Data Attribution & Branding:** Built at **NASA Space Apps Challenge 2026 — Campinas**. This project uses open NASA datasets cited explicitly in [REFERENCES.md](./REFERENCES.md) and follows official Space Apps branding guidelines (no NASA insignia/logo is used).
- **AI Transparency:** See [AI_DISCLOSURE.md](./AI_DISCLOSURE.md).
