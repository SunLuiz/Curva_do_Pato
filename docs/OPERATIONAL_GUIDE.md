# Operational Guide & Local API Key Routing — Cockpit-OMNI

**Live Production Web App (Zero-Key / Zero-Login):** https://www.curveofduck.xyz/  
**Source Repository:** https://github.com/SunLuiz/Curva_do_Pato

This document provides step-by-step instructions to run, test, and connect **Cockpit-OMNI (`Curva_do_Pato`)** locally — either in **100% Zero-Key Open Mode** (browser-only, matching the live deployment at `www.curveofduck.xyz`) or in **Full-Stack Live Ingestion Mode** (FastAPI backend + live NASA APIs).

---

## 1. Execution Modes at a Glance

| Mode | API Keys Needed | Backend Required | What Runs |
| :--- | :--- | :--- | :--- |
| **Mode A — Zero-Key Open Frontend (Default)** | **None (`0` keys)** | **No** | All 4 routes (`/` Story, `/academy` Academy, `/cockpit` 5-tab Workbench + Open Natural-Language `Ask OMNI`, `/game` *Rover Pilot 3D*), 30 frozen NASA snapshots (`frontend/public/cache/`), plus live zero-key browser CORS queries to **NASA POWER** (custom `lat, lon`) and **NASA Earthdata CMR** (`collections.json`). |
| **Mode B — Full Local Stack (FastAPI + Live Refresh)** | Optional free NASA keys (`NASA_API_KEY`, `FIRMS_MAP_KEY`) | **Yes (`port 8000`)** | Everything in Mode A + live backend endpoints (`/healthz`, `/api/trend`, `/api/attribution`, `/api/fires`, `/api/spaceweather`, `/api/space-analog`, `/api/presets`) and cache-refresh scripts (`scripts/freeze_cache.py`, `scripts/bake_game_data.py`). |

---

## 2. Mode A — Running the Zero-Key Open Frontend (Fastest)

### Prerequisites
- **Node.js** `>= 20.x` (verified with `Node.js v24.x`) and `npm`.

### Commands
From the repository root (`Curva_do_Pato/`):

```bash
# 1. Install frontend dependencies
npm --prefix frontend install

# 2. Start the Vite development server (http://localhost:5173)
npm --prefix frontend run dev

# 3. Build for production & preview locally
npm --prefix frontend run build
npm --prefix frontend run preview
```

### Open Zero-Key NASA Endpoints Used Directly by the Browser
Even without a backend or `.env` file, the browser (`frontend/src/engine/askEngine.js`) can query these open NASA/space endpoints directly via CORS (`Access-Control-Allow-Origin: *`) and falls back seamlessly to `frontend/public/cache/*.json` when offline:

| Service | Open Endpoint (Zero Key) | Browser Consumer | Offline Fallback |
| :--- | :--- | :--- | :--- |
| **NASA POWER** (Monthly `1984–2025`, `community=AG`) | `https://power.larc.nasa.gov/api/temporal/monthly/point` | `frontend/src/engine/powerCors.js` (used by `api.js` & `askEngine.js`) | `frontend/public/cache/trend_{region}_{var}.json` (21 files) |
| **NASA Earthdata CMR** (Collection Search) | `https://cmr.earthdata.nasa.gov/search/collections.json` | `frontend/src/engine/askEngine.js` (`handleCmr`) | `frontend/public/cache/cmr_evidence.json` |
| **NASA DSN Now** (Deep Space Network) | `https://eyes.nasa.gov/dsn/data/dsn.xml` | `backend/app/space_analog.py` / cache | `frontend/public/cache/space_analog.json` |
| **CelesTrak NORAD GP** (ISS & Stations) | `https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json` | `backend/app/space_analog.py` / cache | `frontend/public/cache/space_analog.json` |

---

## 3. Mode B — Running the Full Local Stack (FastAPI Backend + Frontend)

### Prerequisites
- **Python** `>= 3.10`
- **Node.js** `>= 20.x`

### Step-by-Step Setup

```bash
# 1. Create and activate a Python virtual environment at the repository root
python -m venv .venv

# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1
# Linux / macOS:
# source .venv/bin/activate

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Create your local .env from the template
cp .env.example .env

# 4. Launch the FastAPI backend on port 8000
python -m uvicorn app.main:app --app-dir backend --reload --port 8000
```

In a second terminal, launch the frontend linked to the local backend:

```bash
# Point VITE_API_BASE to local FastAPI (or leave unset to use relative /api + cache fallback)
VITE_API_BASE=http://localhost:8000 npm --prefix frontend run dev
```

---

## 4. Complete API Key & Endpoint Routing Matrix

When you populate `.env` in the repository root, here is the **exact wiring** showing where each key is read in the codebase, which external URL it addresses, which internal route exposes it, and what happens if the key is left blank:

| `.env` Variable | Base URL Variable & Default | Required? | Where to Obtain | Codebase Consumer (File & Symbol) | FastAPI / Serverless Route | Fallback When Blank |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| *(None — Zero Key)* | `NASA_POWER_BASE` (`https://power.larc.nasa.gov/api`) | **No** | Open public API | `backend/app/clients/power_client.py` (`PowerClient`), `backend/app/trend.py` & `frontend/src/engine/powerCors.js` | `GET /api/trend`<br>`GET /api/attribution` | Served from `frontend/public/cache/trend_*.json` (21 files) |
| `NASA_API_KEY` | `NASA_DONKI_BASE` (`https://api.nasa.gov/DONKI`) | Optional (Free) | https://api.nasa.gov/ | `backend/app/clients/nasa_open_client.py` (`NasaOpenClient`) | `GET /api/spaceweather`<br>`GET /api/attribution` | Served from `data/cache/donki_7d.json` |
| `FIRMS_MAP_KEY` | `FIRMS_BASE` (`https://firms.modaps.eosdis.nasa.gov`) | Optional (Free) | https://firms.modaps.eosdis.nasa.gov/api/map_key/ | `backend/app/clients/firms_client.py` (`FirmsClient`) | `GET /api/fires`<br>`GET /api/attribution` | Served from `data/firms_br_24h.csv` & `data/cache/fires_br_1d.geojson` (`3,313` detections) |
| `NASA_EARTHDATA_BEARER_TOKEN` | `https://cmr.earthdata.nasa.gov/mcp/v1` | Optional | https://urs.earthdata.nasa.gov/ | `scripts/freeze_cache.py` (`fetch_cmr_evidence`) & `frontend/src/engine/askEngine.js` | `GET /api/cmr-evidence`<br>`GET /api/attribution` | Open CMR search & `data/cache/cmr_evidence.json` |
| *(None — Zero Key)* | `https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda` | **No** | Open NASA PDS Atmospheres | `backend/app/clients/meda_client.py` (`MedaClient`) & `scripts/bake_game_data.py` | `GET /api/space-analog` & `/game` (`mission_params.json`) | Baked in `data/meda_sol40_wind.csv` & `data/meda_sol1100_rad.csv` |
| *(None — Zero Key)* | `https://ssd.jpl.nasa.gov/api/horizons.api` | **No** | Open NASA JPL Horizons | `backend/app/clients/horizons_client.py` (`HorizonsClient`) | `GET /api/space-analog` | Baked in `data/horizons_mars_sun.json` |
| *(None — Zero Key)* | `https://eyes.nasa.gov/dsn/data/dsn.xml`<br>`https://osdr.nasa.gov/osdr/data/osd/meta/615`<br>`https://celestrak.org/...` | **No** | Open NASA DSN, OSDR & CelesTrak | `backend/app/space_analog.py` (`fetch_space_analog`) | `GET /api/space-analog` | Served from `frontend/public/cache/space_analog.json` |
| *(None — Zero Key)* | `ONS_CKAN_BASE_URL` (`https://dados.ons.org.br`) | **No** | Open ONS CKAN catalog | `backend/app/clients/ons_client.py` (`OnsClient`) | Reference energy context | Served from `data/ons_search.json` |
| `GONKA_API_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY` | `GONKA_BASE_URL` (`https://api.gonkarouter.io/v1`) | **Not Needed** | Optional server-side proxy only | `backend/app/main.py` & `frontend/api/ask.js` | `POST /api/ask` | **Not used by default:** `AskPanel.jsx` runs 100% in-browser via `frontend/src/engine/askEngine.js` |

---

## 5. Rebuilding Caches, Game Data & Pitch Deck

If you modify statistical pipelines, add new regions/planets, or update narrative slides, run these deterministic build scripts from the repository root:

```bash
# 1. Re-freeze NASA POWER / FIRMS / DONKI / Attribution snapshots into data/cache/ & frontend/public/cache/
python scripts/freeze_cache.py

# 2. Re-bake audited Mars MEDA & NASA POWER game parameters into frontend/public/game/data/mission_params.json
python scripts/bake_game_data.py

# 3. Regenerate docs/pitch_deck.html from the single source of truth (frontend/src/content/story.js)
node scripts/build_deck.mjs
```

---

## 6. Verification & Quality Audit Suite

Before committing or deploying, run all four verification gates from the repository root:

```bash
# Gate 1: Frontend & Simulation Unit Tests (AskEngine, MPTO, Trend/CORS, Presets, Story, Mastery, and 3D Sim)
node --test frontend/src/engine/askEngine.test.mjs frontend/src/engine/mptoEngine.test.mjs frontend/src/content/story.test.mjs frontend/src/engine/trend.test.mjs frontend/src/academy/mastery.test.mjs frontend/src/engine/presets.test.mjs frontend/src/game/sim/sim.test.mjs

# Gate 2: Ground-Truth Cache Cross-Check (111 assertions across Academy M1–M5 and verified FAQs)
node scripts/verify_answers.mjs

# Gate 3: WCAG AA Contrast Audit (30 token pairs >= 4.5:1)
node scripts/check_contrast.mjs --css frontend/src/styles.css

# Gate 4: Production Bundle Build
npm --prefix frontend run build

# Gate 5 (Optional if Python venv is active): Backend Pytest Suite
python -m pytest backend/tests -q
```

---

## 7. Bilingual Architecture Note (`EN | PT-BR`)

All source code, repository documentation (`README.md`, `SUBMISSION.md`, `REFERENCES.md`, `AI_DISCLOSURE.md`, `AGENTS.md`, `docs/*.md`, `docs/pitch_deck.html`), and default UI states are **100% in English**. The interactive web application includes a live `EN | PT-BR` language toggle in the top header (`frontend/src/content/i18n.js`, `glossary.js`, `story.js`, `missionParams.js`, and bilingual auto-detection in `askEngine.js`) so both international reviewers and Brazilian citizens can inspect the data in their preferred language.

---

## 8. Worldwide Hall of Fame Persistence (`frontend/api/ranking.js`)

Because browser JavaScript is public, GitHub write tokens or database secrets must **never** live in `frontend/src/`. Instead, `frontend/api/ranking.js` provides an open-CORS (`Access-Control-Allow-Origin: *`) Vercel serverless endpoint at `/api/ranking`:

- **Production web visitors (`www.curveofduck.xyz`)** hit same-origin `/api/ranking`.
- **Local clones (`localhost:5173`, downloaded ZIPs)** automatically connect to `https://www.curveofduck.xyz/api/ranking` (`resolveRankingEndpoint()` in `frontend/src/engine/rankingClient.js`) so both web and local players share one global Top-100 ranking, with seamless `localStorage` fallback when offline.

### How to Enable Persistent Storage on Vercel (Choose 1 of 3 Drivers)

1. **GitHub Gist (Recommended 1-minute GitHub setup, avoids redeploy loops):**
   - Create a Gist with one file named `curve_of_duck_ranking.json` containing `[]`.
   - Create a GitHub token scoped only to `gists`.
   - In Vercel **Project Settings -> Environment Variables**, add `GITHUB_RANKING_TOKEN` and `GITHUB_RANKING_GIST_ID`.
2. **Dedicated GitHub Branch (`leaderboard-data`):**
   - Create a `leaderboard-data` branch (never use `main`, which triggers Vercel builds on every score update).
   - Add `GITHUB_RANKING_TOKEN` (scoped `Contents: Read & Write` to this repo) plus optional `GITHUB_RANKING_REPO` and `GITHUB_RANKING_BRANCH`. Concurrent writes retry automatically on HTTP `409`.
3. **Upstash / Vercel Redis REST (Best for high concurrency):**
   - Connect an Upstash Redis / Vercel KV integration so `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_*`) are injected automatically.
