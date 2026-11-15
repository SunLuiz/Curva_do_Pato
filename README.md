# Cockpit-OMNI — Be An Earth System Trend Detective!

> **Team:** Curva do Pato · **Author / Lead:** Luiz Antonio Gois Junior  
> **NASA Space Apps Challenge 2026 — Campinas, SP, Brazil**  
> **Target Challenge:** [#2 Be An Earth System Trend Detective!](https://www.spaceappschallenge.org/2026/challenges/) (Earth · Advanced)

**Live demo (no login, no install):** https://frontend-rho-seven-69.vercel.app  
**Source:** https://github.com/SunLuiz/Curva_do_Pato · **License:** MIT

**Cockpit-OMNI** is an open, statistically audited Earth observation and trend attribution workbench. Given any geographic region and Earth system variable, it retrieves multi-decade NASA satellite/reanalysis time series (`1984–2025`, `n = 504` months), tests trend significance using Seasonal & Original Mann-Kendall + deseasonalized Theil-Sen regression with 95% confidence intervals, and attributes observed shifts across four physical vectors with transparent operational status (`live`, `cached`, or `roadmap`).

---

## The headline finding: one engine, opposite causal verdicts by biome

Surface solar brightening can come from **fewer clouds** or from **cleaner air**. The same statistical engine disagrees with itself across Brazilian biomes — and the product publishes the disagreement instead of hiding it:

| Region | Cloud attenuation (p) | Clear-sky irradiance (p) | Verdict |
|---|---|---|---|
| **Campinas-SP** | +0.038 %/dec (**p = 0.948, null**) | +0.190 (**p < 1e-16, significant**) | **Aerosol / clear-sky driven** |
| **Petrolina-PE** | −0.965 %/dec (**p = 2.83e-09**) | +0.013 (**p = 0.290, null**) | **Cloud-driven** |
| **Manaus-AM** | −0.855 %/dec (**p = 3.02e-08**) | +0.029 (**p = 0.769, null**) | **Cloud-driven** |

This is hypothesis falsification inside the product, not decoration: the Northeast and Amazon brighten because cloud cover drops (clear-sky shows no trend, so it is not an aerosol signal); Campinas brightens because clear-sky rises while cloud attenuation shows no trend at all. The verdict is computed at runtime from the cached series — it is not hardcoded per region.

### Declared limitation (monthly resolution)

Wind speed `WS2M` shows **no significant trend** at any of the three stations (p = 0.489 / 0.173 / 0.451). This dataset is therefore **not valid for sub-hourly ramp-risk or battery-dispatch claims** — that would require hourly series. It is kept out of the product rather than implied, and the grid-ramp persona row is explicitly marked "not supported" in the UI.

---

## Who acts on these numbers

| Persona | Decision it changes | Evidence |
|---|---|---|
| Civil defense / urban planning | Size heat-wave response for a multi-decade warming baseline in Campinas | `+0.409 °C/dec` ≈ **+1.72 °C cumulative**, 95% CI [+0.333, +0.489], p < 1e-16 |
| Solar generation planner (NE corridor) | Decide whether rising irradiance is a durable resource gain or a cloud artifact | Cloud `−0.965 %/dec` (p = 2.83e-09) with clear-sky null (p = 0.290) |
| Air quality & fire response (Amazon) | Separate smoke-driven aerosol forcing from cloud-cover change | Cloud `−0.855 %/dec` (p = 3.02e-08) with clear-sky null (p = 0.769) |
| Grid ramp / storage operator | Pre-position storage ahead of an intra-hour ramp | **Not supported** — monthly `WS2M` p = 0.489 / 0.173 / 0.451; needs hourly data |

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

## Three-Intent Interface: `Story · Academy · Cockpit` (Bilingual `EN | PT-BR`, Default `EN`)

1. **Story (`/`):** 7-slide full-screen presentation notebook (`frontend/src/content/story.js`, single source also generating the 7-slide `docs/pitch_deck.html`) covering Cover & Pain, System in 1 Screen, Trends in Human Language, Attribution + CMR MCP, Layperson Action Presets, Real Proof & Academy, and Off-World Space Frontiers (MPTO), with continuous interpolated SVG curve, opt-in autoplay, swipe/keyboard controls, and Present mode (`F`).
2. **Academy (`/academy`):** Zero-login, browser-local (`localStorage`) Detective training across 5 real-data modules (`M1–M5`), reasoning depth tracks (`Explorer | Analyst | Specialist`), DeepTutor-inspired (`Apache-2.0`) unassisted mastery gate (`>= 0.80` recency-weighted accuracy + zero-hint critical falsification/limit checks), 3-layer auditable memory, merit badges, 1200x800 PNG `<canvas>` diploma, `"Forget me"` privacy wipe, and an explicit `"This device only — no account, no tracking"` Hall of Fame.
3. **Cockpit (`/cockpit`):** Scientific + citizen decision workbench across 5 internal views (`Trends & Action Presets | Attribution | Sources & Method | Live NASA (FIRMS / DONKI) | Space Analog (MPTO)`):
   - **Action Presets & Traffic-Light Layer:** 5 everyday decision presets (`Prepare for Heatwaves`, `Why Is It Drying?`, `Do Wildfires Reach Me?`, `Solar Storm Today?`, `How Is My City's Climate?`), deterministic `GREEN / AMBER / RED` briefings computed identically in `backend/app/presets.py` and `frontend/src/engine/presets.js`, Simple Language vs. Technical toggle, and interactive `<GlossaryTooltip />` popovers (`Seasonal Mann-Kendall`, `Theil-Sen`, `p-value`, `Tau`, `MPTO`, `SoC_bio`, `k_reg`).
   - **Time-Series & Provenance:** Client-side Seasonal Mann-Kendall & Deseasonalized Theil-Sen (~50 ms per 504-month series) with decade sliders & month filters, `Chart | Raw data | Source` tabs per chart (100-row paginated table + CSV/JSON download), and honest `Live backend connected` vs. `Showing frozen snapshot — 2026-11-14 15:04 UTC` banner.
   - **Space Analog (MPTO) (`/cockpit?tab=space`):** Connects real zero-key feeds (**NASA DSN Now**, **NASA OSDR `OSD-615`**, **CelesTrak GP**) alongside JPL Horizons / Mars 2020 MEDA clients and an interactive parametric 7-Frontier MPTO simulator ($\tau$, $C_p$, sintered regolith $k_{\text{reg}}$, and crater IR albedo gain `10–15%`).
   - **Grounded Assistant (`Ask OMNI`):** Shared `<AskPanel />` (10 cache-verified answers offline + server-side `POST /api/ask` proxy in both FastAPI `backend/app/main.py` and Vercel `frontend/api/ask.js` routing GonkaRouter / Groq / OpenRouter without exposing keys to the browser). Legacy `/trend` and `/attribution` routes resolve cleanly to `/cockpit?tab=...`.

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
│   │   ├── presets.py             # Layperson action presets & GREEN/AMBER/RED insights
│   │   ├── space_analog.py        # Open NASA DSN Now, OSDR OSD-615 & CelesTrak MPTO feeds
│   │   ├── trend.py               # Mann-Kendall + deseasonalized Theil-Sen engine
│   │   └── main.py                # FastAPI endpoints (/healthz, /api/trend, /api/presets, /api/insight, /api/space-analog, /api/ask)
│   └── tests/                     # API, statistical engine & presets/MPTO tests
├── data/                          # Sample & frozen fallback JSON/CSV snapshots (incl. space_analog.json)
├── frontend/                      # Vite + React app + Vercel serverless /api proxy (Story · Academy · Cockpit)
├── scripts/                       # build_deck.mjs, check_contrast.mjs (WCAG AA), verify_answers.mjs
├── docs/pitch_deck.html           # 7-slide demo deck (generated from frontend/src/content/story.js)
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
cp .env.example .env           # Optional keys: NASA_API_KEY, FIRMS_MAP_KEY, GONKA_API_KEY / GROQ_API_KEY
.venv/Scripts/python.exe -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

Run tests & verification checks:

```bash
.venv/Scripts/python.exe -m pytest backend/tests -q
node --test frontend/src/content/story.test.mjs frontend/src/engine/trend.test.mjs frontend/src/academy/mastery.test.mjs frontend/src/engine/presets.test.mjs
node scripts/check_contrast.mjs --css frontend/src/styles.css
node scripts/verify_answers.mjs
```

---

## Scientific & Branding Notice

- **Prototype Disclaimer:** Statistical trends and attribution scores generated by Cockpit-OMNI are comparative prototype estimates computed from historical open NASA datasets and should not replace certified meteorological or grid-dispatch advisories.
- **Data Attribution & Branding:** Built at **NASA Space Apps Challenge 2026 — Campinas**. This project uses open NASA datasets cited explicitly in [REFERENCES.md](./REFERENCES.md) and follows official Space Apps branding guidelines (no NASA insignia/logo is used).
- **AI Transparency:** See [AI_DISCLOSURE.md](./AI_DISCLOSURE.md).
