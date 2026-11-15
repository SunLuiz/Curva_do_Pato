# AGENTS.md — Cockpit-OMNI (`Curva_do_Pato`) Agentic Engineering Instructions

Welcome! This file provides operational, architectural, and scientific instructions for AI coding agents (**Google Antigravity**, **Claude Code**, **OpenAI Codex**, **Cursor**, **Windsurf**, **GitHub Copilot**) and contributors working in this repository.

---

## 1. Project Identity & Core Rules

- **Project:** **Cockpit-OMNI** (*Team Curva do Pato* — NASA Space Apps Challenge 2026, Challenge #2: *Be An Earth System Trend Detective!*).
- **Live URL:** **https://www.curveofduck.xyz/** (Zero-Key Open Web App on Vercel + Open NASA CORS).
- **4 Primary Routes (`frontend/src/App.jsx`):**
  1. `/` (`StoryPage.jsx`) — 7-slide interactive narrative deck (`frontend/src/content/story.js` -> `docs/pitch_deck.html`).
  2. `/academy` (`App.jsx` alias -> `GamePage.jsx` / `ModuleRunner.jsx`) — 5-module unassisted mastery Academy (`localStorage` only, zero login).
  3. `/cockpit` (`CockpitPage.jsx`) — 5-tab Earth & Planetary Observation Workbench + Open Natural-Language Assistant (`AskPanel.jsx` powered by `frontend/src/engine/askEngine.js`).
  4. `/game` (`GamePage.jsx`) — *Curve of Duck: Rover Pilot 3D* (Three.js + Web Audio + deterministic physics in `frontend/src/game/sim/planetaryPhysics.js`).

### Non-Negotiable Guardrails
1. **100% Open Zero-Key Frontend:** Never make any frontend route or `<AskPanel />` depend on private backend API keys. Everything in the browser must run using `frontend/public/cache/*.json` and open zero-key CORS NASA endpoints (`power.larc.nasa.gov`, `cmr.earthdata.nasa.gov/search/collections.json`).
2. **Empirical vs. Parametric Honesty:** Never mix frozen NASA telemetry (`data/`, `frontend/public/cache/`) with parametric simulation without the explicit `PARAMETRIC PHYSICAL MODEL (MPTO)` badge. Never claim monthly `WS2M` wind data ($p = 0.489$) predicts sub-hourly wind ramps.
3. **Zero Hex Literals in React/CSS:** All JSX and CSS rules outside `:root` (`frontend/src/styles.css`) must use CSS custom variables (`var(--surface-0)`, `var(--ink)`, `var(--biome-n)`, etc.). Three.js 3D hex colors belong strictly in `frontend/src/game/scene/themePalette.js`.
4. **English Documentation & Bilingual UI (`EN | PT-BR`):** All documentation in root and `docs/` must remain in **100% English**. Interactive UI components support the `EN | PT-BR` toggle (`en` default).

---

## 2. Quickstart & Local API Key Routing

- **Run Frontend (Zero Keys Needed):**
  ```bash
  npm --prefix frontend install
  npm --prefix frontend run dev
  ```
- **Run Optional FastAPI Backend (`port 8000`):**
  Copy `.env.example` to `.env`. Optional free NASA keys are wired as follows:
  - `NASA_API_KEY` -> `backend/app/clients/nasa_open_client.py` (`https://api.nasa.gov/DONKI` -> `/api/spaceweather`, fallback: `data/cache/donki_7d.json`).
  - `FIRMS_MAP_KEY` -> `backend/app/clients/firms_client.py` (`https://firms.modaps.eosdis.nasa.gov` -> `/api/fires`, fallback: `data/firms_br_24h.csv` & `data/cache/fires_br_1d.geojson`).
  - `NASA_POWER_BASE` -> `backend/app/clients/power_client.py` (`https://power.larc.nasa.gov/api`, zero key required; browser queries `frontend/src/engine/powerCors.js` directly).
  - Full operational matrix: see **[docs/OPERATIONAL_GUIDE.md](./docs/OPERATIONAL_GUIDE.md)**.

---

## 3. How to Add New Planets / Moons for the Rover (`Mars`, `Jupiter/Europa`, `Neptune/Triton`, `Saturn/Titan`)

The 3D Rover simulation (`/game`) and Cockpit Space Analog (`/cockpit?tab=space`) share a universal physics engine governed by the **Planetary Context Vector**:

$$\vec{\Theta} = \left[\, g\text{ (m/s}^2\text{)},\; \rho\text{ (kg/m}^3\text{)},\; c_p\text{ (kJ/kg}\cdot\text{K)},\; k_{\text{reg}}\text{ (W/m}\cdot\text{K)},\; \tau_0,\; \text{IR}_{\text{albedo}} \,\right]$$

> **Planetary Science Rule for Gas/Ice Giants (Jupiter, Saturn, Neptune):** Because gas and ice giants have no solid surface at the $1\text{ bar}$ level for wheeled locomotion, land the rover on their solid moons — **Europa (`502`)** or **Io (`501`)** for Jupiter, **Triton (`801`)** for Neptune, **Titan (`606`)** for Saturn — with the giant parent planet rendered in the 3D sky dome (`celestialBackdrop.js`).

### 6-Step File Wiring Checklist
1. **`frontend/src/game/sim/planetaryPhysics.js`:** Add the new entry to `PLANETS` (with `g`, `rho`, `cpDust`, `kRegolith`, `baseTau`, `albedoIrGain`, `maxSafeWindMs`, `dustCleanMinMs`) and optional soil profile in `IMPULSE_CALIBRATION_PROFILES` ($\tau_c$ in Pa, `baseSlipPct`, `energyDistanceMult` in $\text{Wh/km}$).
2. **`frontend/src/engine/mptoEngine.js`:** Append the `planetId` to `PLANET_ORDER` and `defaultParamsForPlanet()`.
3. **`frontend/src/game/scene/themePalette.js`:** Add the biome hex palette under `BIOME_PALETTES[planetId]`.
4. **`frontend/src/game/scene/celestialBackdrop.js` & `proceduralTextures.js`:** Add sky dome gradient and parent planet / moons in the `+Z` horizon.
5. **`frontend/src/game/sim/terrainField.js` & `frontend/src/game/missions/missionParams.js`:** Add analytical heightfield `h(biomeId, x, z)` and mission zones (`MISSION_ZONES`). Note: **Mission Lab (`MissionLabPanel.jsx`) automatically populates every planet in `PLANETS`!**
6. **`backend/app/clients/horizons_client.py` & `frontend/src/game/sim/sim.test.mjs`:** Optionally fetch solar ephemeris from NASA JPL Horizons (`https://ssd.jpl.nasa.gov/api/horizons.api`, zero key) and add unit tests in `sim.test.mjs`.

For complete reference $\vec{\Theta}$ tables and code snippets for **Mars**, **Jupiter (Europa / Io)**, **Saturn (Titan)**, and **Neptune (Triton)**, read **[docs/AGENTIC_PLANETARY_GUIDE.md](./docs/AGENTIC_PLANETARY_GUIDE.md)** and **[docs/arquitetura_game3d_rover_pilot.md](./docs/arquitetura_game3d_rover_pilot.md)**.

---

## 4. Mandatory Verification Commands Before Finishing Any Task

```bash
node --test frontend/src/engine/askEngine.test.mjs frontend/src/engine/mptoEngine.test.mjs frontend/src/content/story.test.mjs frontend/src/engine/trend.test.mjs frontend/src/academy/mastery.test.mjs frontend/src/engine/presets.test.mjs frontend/src/game/sim/sim.test.mjs
node scripts/verify_answers.mjs
node scripts/check_contrast.mjs --css frontend/src/styles.css
npm --prefix frontend run build
```
