# Agentic Engineering & Planetary Expansion Guide — Cockpit-OMNI

This guide is designed for both **human engineers** and **AI coding agents** (**Google Antigravity**, **Claude Code**, **OpenAI Codex**, **Cursor**, **Windsurf**, **GitHub Copilot**) connected to this repository. It documents the institutional guardrails, the mathematical physics standards of **"The Planet Breathes"**, and the exact step-by-step recipe to add new celestial bodies (e.g., **Mars** regions, **Jupiter / Europa / Io**, **Neptune / Triton**, **Saturn / Titan**) so the rover can visit and operate on them in **Curve of Duck: Rover Pilot 3D** (`/game`) and **Cockpit Space Analog (MPTO)** (`/cockpit?tab=space`).

---

## 1. Institutional & Scientific Guardrails (Non-Negotiable)

When modifying or extending **Cockpit-OMNI**, every human or AI agent must uphold five core rules:

1. **Strict Separation of Empirical Telemetry vs. Parametric Simulation:**
   - **Empirical Data:** Historical NASA series (`frontend/public/cache/trend_*.json`, `data/meda_sol40_wind.csv`, `data/meda_sol1100_rad.csv`, `data/power_ne_hourly.csv`, `fires_br_1d.geojson`, `donki_7d.json`, `space_analog.json`) must never be fabricated or altered by synthetic smoothing.
   - **Parametric Simulation:** Any curves or physical responses generated via transfer equations must carry the explicit HUD badge `PARAMETRIC PHYSICAL MODEL (MPTO)`.
2. **Zero Private API Key Lock-In:**
   - The frontend (`/`, `/academy`, `/cockpit`, `/game`) and the open natural-language assistant (`frontend/src/engine/askEngine.js`) must always work **out of the box with zero API keys** using frozen caches (`frontend/public/cache/`) and open zero-key CORS NASA endpoints (`power.larc.nasa.gov`, `cmr.earthdata.nasa.gov/search/collections.json`).
3. **Zero Hex Color Literals in UI Components:**
   - React JSX components and CSS rules outside `:root` (`frontend/src/styles.css`) must use CSS custom properties (`var(--surface-0)`, `var(--ink)`, `var(--biome-n)`, `var(--sig)`, `var(--danger)`, etc.).
   - Three.js 3D scene hex colors are strictly isolated inside `frontend/src/game/scene/themePalette.js`.
   - Always verify WCAG AA contrast (`>= 4.5:1`) via `node scripts/check_contrast.mjs --css frontend/src/styles.css`.
4. **Universal Physics Without Planet `if/else` Hacks:**
   - Rover solar yield, radiative $T^4$ thermal load, aerodynamic wind stress, wheel slip, and battery drain must be driven by the 6-parameter **Planetary Context Vector $\vec{\Theta}$** in `frontend/src/game/sim/planetaryPhysics.js`.
5. **Bilingual UI Parity (`EN | PT-BR`, Default `EN`):**
   - Repository documentation and default UI are 100% English, while interactive UI labels provide both `en` and `pt` strings.

---

## 2. Mathematical Standard: How the Rover Physics Engine Works

Both the 3D Rover Simulator (`/game`) and the Cockpit Space Analog tab (`/cockpit?tab=space`) share a single deterministic physics core:
- `frontend/src/game/sim/planetaryPhysics.js`
- `frontend/src/engine/mptoEngine.js`

### 2.1 The Planetary Context Vector $\vec{\Theta}$
Every world or planetary corridor is defined by 6 boundary parameters plus 2 structural wind thresholds:

$$\vec{\Theta} = \left[\, g,\; \rho,\; c_p,\; k_{\text{reg}},\; \tau_0,\; \text{IR}_{\text{albedo}} \,\right]$$

| Parameter | Property Key in `PLANETS` | Unit | Physical Role in `planetaryPhysics.js` |
| :--- | :--- | :--- | :--- |
| $g$ | `g` | $\text{m/s}^2$ | Surface gravity; scales locomotion battery drain (`computeMoveDrainPerSec`) and ballistic plume settling. |
| $\rho$ | `rho` | $\text{kg/m}^3$ | Surface atmospheric density; governs aerodynamic drag (`computeWindStress`). When $\rho \le 0.0001$ (vacuum), wind stress is identically `0`. |
| $c_p$ | `cpDust` | $\text{kJ/(kg}\cdot\text{K)}$ | Specific heat capacity of surface dust/ice; shifts baseline thermal load in `computeThermalLoadPct`. |
| $k_{\text{reg}}$ | `kRegolith` | $\text{W/(m}\cdot\text{K)}$ | Sintered regolith / crust thermal conductivity; governs nighttime BESS thermal retention in `mptoEngine.js`. |
| $\tau_0$ | `baseTau` | dimensionless | Nominal zenith optical depth (clouds, dust, haze, or cryogeyser plumes); attenuates sunlight via Beer-Lambert law. |
| $\text{IR}_{\text{albedo}}$ | `albedoIrGain` | fraction (`0.0–0.35`) | Diffuse infrared & reflected albedo gain on crater rims / ice ridges (`computeSolarYieldPct` when `onCraterRim = true`). |
| $v_{\text{safe}}$ | `maxSafeWindMs` | $\text{m/s}$ | Structural wind speed limit for open solar wings + raised mast (`computeWindStress >= 1.0` triggers damage). |
| $v_{\text{clean}}$ | `dustCleanMinMs` | $\text{m/s}$ | Minimum breeze required to strip panel dust when wings are tilted to $35^\circ$ (`[3]`). |

### 2.2 The 5 Coupled Governing Equations

1. **Beer-Lambert Solar Yield (`computeSolarYieldPct`):**
   $$Y_{\text{PV}}(\%) = \text{clamp}_{[0, 130]}\left(\text{round}\left(100 \cdot I_{\text{norm}} \cdot e^{-0.55\tau} \cdot f_{\text{wing}} \cdot f_{\text{clean}} \cdot (1 + \mathbb{I}_{\text{rim}}\cdot \text{IR}_{\text{albedo}})\right)\right)$$
   where $f_{\text{wing}} \in \{1.0\text{ (open)},\; 0.78\text{ (tilted)},\; 0\text{ (stowed)}\}$ and $f_{\text{clean}} = \max(0.25,\; 1 - \min(80, S_{\text{soiling}})/110)$.

2. **Radiative $T^4$ Thermal Load (`computeThermalLoadPct`, Ceiling = `82%`):**
   $$L_{\text{thermal}}(\%) = \text{clamp}_{[8, 100]}\left(\text{round}\left(38 + 56 I_{\text{norm}} - 14\tau + 18(c_p - 0.80) + \Delta_{\text{wing}} + \Delta_{\text{shadow}} + \Delta_{\text{BESS}}\right)\right)$$

3. **Aerodynamic Structural Wind Stress (`computeWindStress`):**
   $$S_{\text{wind}} = \begin{cases} 0 & \text{if } \rho \le 0.0001 \\ \dfrac{v_{\text{wind}} \cdot f_{\text{shelter}}}{v_{\text{safe}}} \cdot A_{\text{wing}} \cdot A_{\text{mast}} & \text{otherwise} \end{cases}$$
   where $f_{\text{shelter}} = 0.28$ behind leeward rocks/craters, $A_{\text{wing}} \in \{1.0, 0.72, 0.30\}$, and $A_{\text{mast}} \in \{1.15, 0.78\}$.

4. **Active Impulse-Response Geotechnical Slip (`computeGeotechnicalSlip`):**
   Calibrated by descent thruster impingement $\tau_{\text{jet}} = \frac{1}{2}\rho_{\text{gas}}v_{\text{jet}}^2 \ge \tau_c$:
   $$\text{Slip}(\%) = \min\left(72,\; \text{Slip}_{\text{base}}(\tau_c) + k_{\text{slope}}\cdot \max(0, \nabla h)\right), \quad \text{Traction} = \max\left(0.28,\; 1 - \frac{\text{Slip}}{100}\right)$$

5. **Gravity-Scaled Locomotion Battery Drain (`computeMoveDrainPerSec`):**
   $$\frac{d\text{SoC}}{dt} = 0.25 + v_{\text{norm}} \cdot 1.25 \cdot \left(0.55 + 0.65\frac{g}{9.81}\right) \cdot \left(1 + 1.8\max(0, \nabla h)\right)$$

---

## 3. Institutional Tips & Reference $\vec{\Theta}$ Table for Outer Planets (Mars, Jupiter, Saturn, Neptune)

> [!TIP]
> **Institutional & Planetary Science Tip for Gas and Ice Giants (Jupiter, Saturn, Uranus, Neptune):**
> Gas giants (**Jupiter**, **Saturn**) and ice giants (**Uranus**, **Neptune**) lack a solid silicate or ice surface at the $1\text{ bar}$ pressure level — a wheeled rover cannot roll on metallic hydrogen clouds! To let players "visit the Jupiter or Neptune system with the rover" while maintaining **100% NASA scientific authenticity**:
> - **Option 1 (Recommended — Solid Planetary Moon Landing):** Land Rover-01 on the flagship solid icy/volcanic moon of that giant planet, with the giant planet filling the 3D sky dome (`celestialBackdrop.js`):
>   - **Jupiter System:** **Europa** (`jupiter_europa`, JPL Horizons ID `502` — NASA *Europa Clipper* target, water-ice crust over subsurface ocean) or **Io** (`jupiter_io`, ID `501` — volcanic sulfur regolith & $\text{SO}_2$ plumes).
>   - **Neptune System:** **Triton** (`neptune_triton`, JPL Horizons ID `801` — *Voyager 2* / *Trident* target, solid nitrogen-ice crust with active solar-driven nitrogen cryogeysers at $38\text{ K}$).
>   - **Saturn System:** **Titan** (`saturn_titan`, JPL Horizons ID `606` — *Huygens* / *Dragonfly* target, dense $1.5\text{ bar}$ nitrogen-methane atmosphere and hydrocarbon dunes) or **Enceladus** (`602`).
> - **Option 2 (1-Bar Atmospheric Buoyant Probe Mode):** Model an aerobot/buoyant glider at the $1\text{ bar}$ cloud deck of Jupiter ($g = 24.79\text{ m/s}^2$, $\rho = 0.16\text{ kg/m}^3$) or Neptune ($g = 11.15\text{ m/s}^2$, $\rho = 0.45\text{ kg/m}^3$, supersonic methane winds).

### Audited Planetary Context Vectors $\vec{\Theta}$ Ready for Implementation

| ID (`planetId`) | Target Body & NASA Mission Analog | JPL Horizons ID | $g$ ($\text{m/s}^2$) | $\rho$ ($\text{kg/m}^3$) | $c_p$ ($\text{kJ/kg}\cdot\text{K}$) | $k_{\text{reg}}$ ($\text{W/m}\cdot\text{K}$) | $\tau_0$ | $\text{IR}_{\text{albedo}}$ | `maxSafeWindMs` ($\text{m/s}$) | `dustCleanMinMs` ($\text{m/s}$) | Solar Scale ($1/r_{\text{AU}}^2$) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `mars_jezero` *(built-in)* | **Mars** · Jezero Crater (*Perseverance MEDA*) | `499` | `3.71` | `0.020` | `0.80` | `0.85` | `0.60` | `0.04` | `4.2` | `2.2` | `0.431` ($1.52\text{ AU}$) |
| `mars_olympus` | **Mars** · Olympus Mons Caldera (High-Altitude Rarefied) | `499` | `3.71` | `0.003` | `0.78` | `0.90` | `0.18` | `0.08` | `10.8` | `5.5` | `0.431` ($1.52\text{ AU}$) |
| `moon_artemis` *(built-in)* | **Moon** · South Pole Shackleton Rim (*Artemis / VIPER*) | `301` | `1.62` | `0.000` | `0.78` | `0.85` | `0.05` | `0.13` | `999.0` | `999.0` | `1.000` ($1.00\text{ AU}$) |
| `jupiter_europa` | **Jupiter System · Europa** Icy Chaos Terrain (*Europa Clipper*) | `502` (Parent `599`) | `1.315` | `0.000` | `1.95` | `2.20` | `0.05` | `0.18` | `999.0` | `999.0` | `0.037` ($5.20\text{ AU}$) |
| `jupiter_io` | **Jupiter System · Io** Sulfur Caldera (*Galileo / Juno*) | `501` (Parent `599`) | `1.796` | `0.0001` | `0.71` | `0.60` | `0.45` | `0.11` | `999.0` | `999.0` | `0.037` ($5.20\text{ AU}$) |
| `saturn_titan` | **Saturn System · Titan** Shangri-La Dunes (*Huygens / Dragonfly*) | `606` (Parent `699`) | `1.352` | `5.300` | `1.05` | `0.55` | `1.40` | `0.06` | `2.1` | `0.9` | `0.011` ($9.58\text{ AU}$) |
| `neptune_triton` | **Neptune System · Triton** Cryogeyser Plains (*Voyager 2 / Trident*) | `801` (Parent `899`) | `0.779` | `0.0001` | `1.04` | `0.65` | `0.18` | `0.22` | `18.0` | `8.5` | `0.0011` ($30.07\text{ AU}$) |

---

## 4. Step-by-Step Recipe: Adding a New Planet for the Rover to Visit

Follow these **6 deterministic steps** to add a new planetary destination (for example, `jupiter_europa` or `neptune_triton`) across both the **Cockpit Space Analog** and **Rover Pilot 3D**:

### Step 1 — Register the Planetary Vector $\vec{\Theta}$ and Geotechnical Soil Profile
**File:** `frontend/src/game/sim/planetaryPhysics.js`

1. Add the planet entry to `export const PLANETS`:
```js
  jupiter_europa: {
    id: "jupiter_europa",
    body: "Jupiter · Europa",
    labelEn: "Europa (Jupiter) · Chaos Ice Ridge (Clipper Analog)",
    labelPt: "Europa (Júpiter) · Crista de Gelo (Análogo Clipper)",
    g: 1.315,
    rho: 0.0,
    cpDust: 1.95,
    kRegolith: 2.2,
    baseTau: 0.05,
    albedoIrGain: 0.18,
    maxSafeWindMs: 999.0,
    dustCleanMinMs: 999.0,
  },
  neptune_triton: {
    id: "neptune_triton",
    body: "Neptune · Triton",
    labelEn: "Triton (Neptune) · Nitrogen Cryogeyser Plains",
    labelPt: "Tritão (Netuno) · Planície de Criogêiseres de N2",
    g: 0.779,
    rho: 0.0001,
    cpDust: 1.04,
    kRegolith: 0.65,
    baseTau: 0.18,
    albedoIrGain: 0.22,
    maxSafeWindMs: 18.0,
    dustCleanMinMs: 8.5,
  },
```
2. *(Optional)* Add a surface profile in `IMPULSE_CALIBRATION_PROFILES` (e.g., `cryo_ice_crust` with `tauC_Pa: 48`, `grainSizeUm: 50`, `baseSlipPct: 26`, `energyDistanceMult: 1.35` to model low-friction sintered ice) and map it inside `computeGeotechnicalSlip()`.

### Step 2 — Expose the Planet in the Unified MPTO Simulator
**File:** `frontend/src/engine/mptoEngine.js` & `frontend/src/components/space/PlanetaryVectorSelector.jsx`

1. Append `"jupiter_europa"` and `"neptune_triton"` to `export const PLANET_ORDER` in `frontend/src/engine/mptoEngine.js`.
2. In `defaultParamsForPlanet(planetId)` (`mptoEngine.js`), set sensible defaults for `irradianceNorm`, `windMs`, and `terrainProfile`.
3. In `PlanetaryVectorSelector.jsx`, map `pl.body` to its header badge (e.g., `JUPITER · EUROPA` / `NEPTUNE · TRITON`).

### Step 3 — Add 3D Biome Palette Colors (Isolating Hex Values)
**File:** `frontend/src/game/scene/themePalette.js`

Add the Three.js material palette to `BIOME_PALETTES` (keeping all React JSX files free of hex literals):
```js
  jupiter_europa: {
    sky: 0x050811,
    fog: 0x101c2e,
    groundLow: 0x8eaec4,
    groundHigh: 0xd4e9f7,
    sun: 0xfff8eb,
    ambient: 0x5c7694,
    rock: 0x566f84,
    accent: 0x4cd4e8,
  },
  neptune_triton: {
    sky: 0x040914,
    fog: 0x0d1b30,
    groundLow: 0x7b90a8,
    groundHigh: 0xc9d6e8,
    sun: 0xe8f2ff,
    ambient: 0x4a6484,
    rock: 0x435366,
    accent: 0x9b6dff,
  },
```

### Step 4 — Render the Parent Giant Planet in the 3D Sky Dome
**Files:** `frontend/src/game/scene/celestialBackdrop.js` & `frontend/src/game/scene/proceduralTextures.js`

In `createCelestialBackdrop({ scene, planetId })`:
- For `jupiter_europa`: render a high-density starfield (`starCount = 920`, vacuum sky) and mount a large banded **Jupiter orb** (`SphereGeometry(22, 32, 24)`) + Galilean sibling moons (Io, Ganymede, Callisto) above the forward horizon (`+Z`).
- For `neptune_triton`: mount a deep-azure **Neptune orb** (`SphereGeometry(18, 32, 24)`) with faint ice rings and vertical nitrogen cryogeyser particle plumes (`RoverViewport3D.jsx`).

### Step 5 — Add Terrain Heightfield, Spatial Zones & Mission Definition
**Files:** `frontend/src/game/sim/terrainField.js`, `frontend/src/game/missions/missionParams.js`, and `frontend/src/game/sim/oracle.js`

1. In `terrainField.js`:
   - Add analytical heightfield harmonics in `terrainHeight(biomeId, x, z)` (e.g., crisscrossing *linea* ice ridges on Europa or flat cantaloupe-terrain calderas on Triton).
   - Register mission zones (`bess`, `shelter`, `hazard`, `beacon`, or `lava_tube` / `ice_crevasse`) in `MISSION_ZONES`.
2. In `missionParams.js`:
   - Add the new mission (`M6` or selectable planet in `MissionLabPanel.jsx` where players can already pick any `planetId` in `PLANETS` on any mission!).
   - Note that **Mission Lab (`frontend/src/game/hud/MissionLabPanel.jsx`) automatically lists every entry in `PLANETS`** — so simply adding a planet in Step 1 & Step 3 immediately lets the player pilot Rover-01 on that planet in Mission Lab!

### Step 6 — Fetch Real Ephemeris via NASA JPL Horizons & Run Unit Tests
**Files:** `backend/app/clients/horizons_client.py` & `frontend/src/game/sim/sim.test.mjs`

1. To pull real solar elevation and heliocentric distance ($r_{\text{AU}}$) from NASA JPL Horizons (zero key required):
```python
from app.clients.horizons_client import HorizonsClient

client = HorizonsClient()
# Europa (502), Mars (499), Triton (801)
ephem = client.sun_observer_angles(body="502", center="500@502", start="2026-11-14", stop="2026-11-16", step="6h")
```
2. Add a deterministic assertion in `frontend/src/game/sim/sim.test.mjs` verifying that `computeSolarYieldPct`, `computeWindStress`, `computeGeotechnicalSlip`, and `computeMoveDrainPerSec` return finite, physically bounded values for the new `planetId`, then run:
```bash
node --test frontend/src/game/sim/sim.test.mjs frontend/src/engine/mptoEngine.test.mjs
node scripts/check_contrast.mjs --css frontend/src/styles.css
npm --prefix frontend run build
```

---

## 5. Multi-Agent Orchestration & Real Flight Compute Stack (`RAD750` + `VCE FPGA`)

All 7 MPTO Frontiers map 1:1 to deterministic agents inside `computeAgentOrchestration()` (`frontend/src/engine/mptoEngine.js`, visualized in `AgentOrchestrationPanel.jsx`), connecting real flight computer hardware directly to the browser simulation:

1. **Hebe Radiance** (`#1 T⁴ Radiator Ceiling >= 82%`): throttles `BAE RAD750` + `VCE FPGA` thermal dissipation and dispatches wings `[1]` / BESS `[5]`.
2. **Gemini Vision** (`#2 Optical t-1 -> t & Beer-Lambert`): binds `CMV20000` 20MP Global Shutter (`4x4` binning), `CAHVOR`, FPGA `LoG` filtering, and `MEDA RDS`, separating physical dust from `999999999.0` sentinel dropouts (`[4]`).
3. **Sol Invicta** (`#3 Regolith ~50x k & Crater IR +10–15%`): manages thermal BESS charging (`[5]`) on illuminated crater walls.
4. **Bios Guardian** (`#4 SoC_bio OSDR OSD-615`): protects biological cellulose reserve across `35%` CelesTrak orbital eclipses.
5. **Grok Cratera** (`#5 64m Impulse Geotechnics & Wh/km`): links `VCE Virtex-5QV` `1/16 px` SAD stereo (`10x10 cm` DEM), `Harris + RANSAC` 6-DoF Visual Odometry, and `ACE` Rocker-Bogie planning to veto high-slip sand (`>40%`, `1.8x Wh/km`).
6. **Storm Watcher** (`#6 30–60 min Lead-Time`): pairs `MEDA` 2Hz gusts with `DONKI` 7-day solar/RBE alerts (mitigating DRAM ECC Single-Event Upsets) for shelter `[1] + [2]` or wind cleaning `[3]`.
7. **Prudence** (`#7 P10–P95 Parametric Bounds`): tracks uncertainty dispersion in dust $c_p$ and opacity $\tau$.
- **Statistical Auditor (Non-LLM Veto):** Enforces `trend.js` and `verify_answers.mjs` (111 assertions) so null signals (`WS2M` $p = 0.489$) and roadmap products (`NISAR`/`ECOSTRESS`) are never misrepresented.

