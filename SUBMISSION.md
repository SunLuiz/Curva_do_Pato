# Cockpit-OMNI — NASA Space Apps Challenge 2026 Submission Pack

**Location:** Campinas, SP, Brazil  
**Challenge:** #2 — Be An Earth System Trend Detective! (Earth · Advanced)  
**Language:** 100% English (app, documentation, repository, pitch deck)

---

## 1. Project Summary (Ready to Paste)

**High-Level Summary (280 chars):**  
Cockpit-OMNI retrieves 42-year NASA POWER time series (1984–2025), proves statistical significance with Seasonal Mann-Kendall and deseasonalized Theil-Sen slopes (95% CI), and attributes shifts across hydrometeorological, fire/aerosol, space weather, and roadmap deformation vectors.

---

## 2. How Cockpit-OMNI Answers Challenge #2 Item-by-Item

1. **Choose Earth System Variable(s):**  
   Supports `T2M` (2m Air Temperature), `PRECTOTCORR` (Precipitation), `ALLSKY_SFC_SW_DWN` & `CLRSKY_SFC_SW_DWN` (All-Sky and Clear-Sky Surface Shortwave Irradiance), `RH2M` (Relative Humidity), `WS2M` (Wind Speed), and derived **Cloud Attenuation Deficit** (`1 - ALLSKY/CLRSKY`).
2. **Obtain Data for a Specific Region:**  
   Covers three contrasting Brazilian monitoring points — **Campinas-SP** (`-22.90, -47.06`), **Petrolina-PE** (`-9.39, -40.50`), and **Manaus-AM** (`-3.10, -60.02`) — plus live custom `(lat, lon)` coordinate queries.
3. **Generate & Display Long-Term Time Series:**  
   Continuous 42-year monthly series (`1984–2025`, `n = 504` months) from NASA POWER (CERES / MERRA-2), explicitly removing NASA POWER's annual summary rows (`YYYY13`) and `-999.0` fill values.
4. **Statistical Analysis (Rate of Change + Significance Test):**  
   Runs **Seasonal Mann-Kendall (`period=12`)** + **Original Mann-Kendall** (`τ`, `p-value`, verdict at `α = 0.05`) and **Deseasonalized Theil-Sen regression** (`slope/decade`, `95% confidence interval`, and cumulative 42-year shift).

### Verified Discoveries (1984–2025)
- **Campinas-SP:** `T2M` `+0.4091 °C/decade` (`95% CI: [+0.3329, +0.4891]`, Seasonal MK `τ = +0.293`, `p < 1e-16`), `PRECTOTCORR` `-0.2724 mm/day/decade` (`p = 1.59e-06`), `RH2M` `-1.6601 %/decade` (`p < 1e-16`).
- **Petrolina-PE:** `T2M` `+0.3012 °C/decade` (`95% CI: [+0.2314, +0.3710]`, `p = 4.66e-15`), `CLOUD_ATTEN_PCT` `-0.9647 %/decade` (`p = 2.83e-09`).
- **Manaus-AM:** `T2M` `+0.3065 °C/decade` (`95% CI: [+0.2543, +0.3593]`, `p < 1e-16`), `PRECTOTCORR` `-0.4673 mm/day/decade` (`p = 4.24e-11`), `CLOUD_ATTEN_PCT` `-0.8552 %/decade` (`p = 3.02e-08`) while `CLRSKY_SFC_SW_DWN` shows no significant trend (`p = 0.769`) — isolating reduced cloud cover as the primary driver of surface solar brightening.

---

## 3. Deploy Instructions (Zero-Downtime Public Links)

### Frontend → Vercel (Works Live + Offline Frozen Cache)
```bash
cd frontend
npm install && npm run build
npx vercel --prod
```
- Optional env on Vercel: `VITE_API_BASE=https://<your-hf-space>.hf.space`
- Even without `VITE_API_BASE`, `frontend/public/cache/*.json` guarantees every preset region, chart, attribution card, FIRMS count, DONKI alert list, and CMR MCP evidence works offline with zero login.

### Backend → Hugging Face Space (Docker, CPU Basic 16 GB)
1. Create a Docker Space on Hugging Face using the **repository root** (`Curva_do_Pato/`) as the root — it ships `Dockerfile` on port `7860` at the top level.
2. Add Space Secrets: `NASA_API_KEY`, `FIRMS_MAP_KEY`.
3. Verify `/healthz` and `/api/trend?region=campinas&variable=T2M` in an incognito browser tab.

---

## 4. Pre-Submission Checklist

- [x] Public repo hygiene verified (`.env` excluded by `.gitignore`)
- [x] 100% English UI, README, references, AI disclosure, and 7-slide deck
- [x] No NASA logo used; NASA Space Apps 2026 Campinas badge & explicit data citations included
- [ ] Deploy Vercel + HF Space and verify URLs in an incognito window on mobile/4G
- [ ] Click **Submit for Judging** before Sunday 23:00 BRT and tag `submission-final`
