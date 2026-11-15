# References & Data Provenance

All external datasets, APIs, and open-source components used or referenced in **Cockpit-OMNI** are listed below with their canonical endpoints and licensing terms.

## 1. NASA Data Sources & Services

- **NASA POWER (Prediction Of Worldwide Energy Resources)**  
  - Variables used: `T2M`, `PRECTOTCORR`, `WS2M`, `ALLSKY_SFC_SW_DWN`, `CLRSKY_SFC_SW_DWN`, `RH2M` (monthly `1984–2025`, `community=AG`, underlying CERES & MERRA-2 datasets).  
  - Endpoint: `https://power.larc.nasa.gov/api/temporal/monthly/point`  
  - Portal: https://power.larc.nasa.gov/

- **NASA FIRMS (Fire Information for Resource Management System)**  
  - Dataset used: `VIIRS_NOAA21_NRT` (active fire detections and Fire Radiative Power, near-real-time).  
  - Endpoint: `https://firms.modaps.eosdis.nasa.gov/api/area/csv`  
  - Portal: https://firms.modaps.eosdis.nasa.gov/

- **NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information)**  
  - Endpoints used: `/DONKI/notifications`, `/DONKI/CME`, `/DONKI/GST` via NASA Open APIs.  
  - Portal: https://api.nasa.gov/ and https://kauai.ccmc.gsfc.nasa.gov/DONKI/

- **NASA Earthdata CMR & Official MCP Server (`earthdata-mcp`)**  
  - Verified collection discovery endpoint (`POST https://cmr.earthdata.nasa.gov/mcp/v1`), including active fire collection `C3264430167-LANCEMODIS` and roadmap deformation product `NISAR_L2_GUNW_PROVISIONAL_V1`.  
  - Portal: https://cmr.earthdata.nasa.gov/

- **NASA PDS Atmospheres — Mars 2020 MEDA (Perseverance) [Analog Client]**  
  - Calibrated/derived Martian environmental data (`DER_WS`, `CAL_RDS`, `CAL_ATS`, `CAL_PS`).  
  - Endpoint: `https://atmos.nmsu.edu/PDS/data/PDS4/Mars2020/mars2020_meda`

- **NASA JPL Horizons System [Analog Client]**  
  - Solar/observer ephemeris API (`https://ssd.jpl.nasa.gov/api/horizons.api`).

- **NASA Deep Space Network Now (DSN) [Open Feed]**  
  - Active deep-space dish antenna targets, downlink bands, and elevation/azimuth XML (`https://eyes.nasa.gov/dsn/data/dsn.xml`).

- **NASA Open Science Data Repository — OSDR (`OSD-615`) [Open Feed]**  
  - *Arabidopsis thaliana* ISS APEX 03-1 root cell-wall glycome study (`https://osdr.nasa.gov/osdr/data/osd/meta/615`), informing biological photoperiod circularity (`SoC_bio`) in the MPTO layer.

- **CelesTrak NORAD GP Stations Feed [Open Feed]**  
  - Active LEO station orbital elements & mean motion (`https://celestrak.org/NORAD/elements/gp.php?GROUP=stations&FORMAT=json`) for orbital solar/eclipse periodicity.

- **MSL / Mars 2020 Plume-Regolith Interaction & High-Altitude Surface Erosion [Scientific Reference]**  
  - Vizcaino, J. et al., *"Observed High-Altitude Surface Erosion During MSL Landing"*, Journal of Spacecraft and Rockets / AIAA (`https://arc.aiaa.org/doi/10.2514/1.A35748`). Grounds the 64–70 m retro-rocket impulse-response inversion ($\tau_{\text{jet}} = \frac{1}{2}\rho_{\text{gas}}v_{\text{jet}}^2 \ge \tau_c$) and orbital-to-surface geotechnical calibration in `Curve of Duck: Rover Pilot 3D` (`/game`).

## 2. Brazilian Grid & Open Visual Components

- **ONS Open Data (Brazilian National Electric System Operator)**  
  - CKAN open energy catalog (`https://dados.ons.org.br/`).

- **God's Eye View (`bilawalsidhu/gods-eye-view`)** — Optional 3D Globe Showcase  
  - Repository: https://github.com/bilawalsidhu/gods-eye-view (MIT License).  
  - **Third-Party Carve-Out Notice:** Includes TeleGeography submarine cable/landing datasets licensed under **CC BY-NC-SA** (non-commercial, attribution required, share-alike). Attribution and source notices are preserved intact.

## 3. Pedagogy, Core Scientific & Web Libraries

- **HKUDS/DeepTutor (`HKUDS/DeepTutor`):** Pedagogy inspiration for Cockpit-OMNI Academy's unassisted mastery gate, recency weighting, and auditable 3-layer browser memory (https://github.com/HKUDS/DeepTutor, **Apache-2.0 License**).
- **Python:** `FastAPI`, `Uvicorn`, `httpx`, `pandas`, `numpy`, `scipy` (`theilslopes`), `pymannkendall` (`original_test`, `seasonal_test`), `statsmodels`, `pydantic`.
- **Frontend:** `Vite`, `React`, `lucide-react`, plus browser-native `<canvas>` diploma rendering and pure JavaScript Seasonal Mann-Kendall + Theil-Sen engine (`frontend/src/engine/trend.js`). Typography: Google Fonts (`Fraunces`, `DM Sans`, `JetBrains Mono`).
