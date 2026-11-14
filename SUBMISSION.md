# Cockpit-OMNI — NASA Space Apps Challenge 2026 Submission Pack

**Team:** Curva do Pato  
**Participant / Lead:** Luiz Antonio Gois Junior  
**Location:** Campinas, SP, Brazil  
**Challenge:** #2 — Be An Earth System Trend Detective! (Earth · Advanced)  
**Language:** 100% English (app, documentation, repository, pitch deck)

---

## 1. Project Summary (Ready to Paste)

**High-Level Summary (280 chars):**  
Cockpit-OMNI turns 42 years of NASA telemetry (1984–2025) into an audited Story, offline Mastery Academy, and interactive Earth System Cockpit — proving trends via Seasonal Mann-Kendall + Theil-Sen (95% CI) while flagging null signals & roadmap boundaries honestly.

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

## 3. Public Links — Live and Verified

| Target | URL | Status |
|---|---|---|
| **Live demo (frontend)** | https://frontend-rho-seven-69.vercel.app | Live — HTTP 200, no login, no install |
| **Public source code** | https://github.com/SunLuiz/Curva_do_Pato | Public — HTTP 200 |
| **Backend (optional)** | not deployed; frontend serves frozen NASA cache | Declared in the UI badge |

The frontend serves every preset region, chart, raw CSV/JSON table (`504` rows), attribution card, FIRMS count (`1,500 of 3,313 detections plotted`), DONKI alert list, CMR MCP evidence, 5-module Detective Academy (`localStorage` only + PNG diploma), and offline `AskPanel` FAQs from `frontend/public/cache/*.json`, so the demo runs with the backend offline, with zero login and no install step. An explicit `"Verify against NASA now"` control probes `/healthz` and compares live backend metrics whenever an upstream API instance is connected.

### Optional backend → Hugging Face Space (Docker, CPU Basic 16 GB)
1. Create a Docker Space using the **repository root** (`Curva_do_Pato/`) as root — it ships `Dockerfile` on port `7860`.
2. Add Space Secrets: `NASA_API_KEY`, `FIRMS_MAP_KEY`.
3. Verify `/healthz` and `/api/trend?region=campinas&variable=T2M` in an incognito tab.
4. **Judge / cold-start note:** the HF container may sleep after inactivity; the first live custom-coordinate request can take ~15–30 s to wake. All preset regions (Campinas, Petrolina, Manaus) load instantly via the built-in verified cache fallback.

---

## 4. Pre-Submission Checklist

- [x] Public repo hygiene verified (`.env` excluded by `.gitignore`)
- [x] 100% English UI, README, references, AI disclosure, and 7-slide deck
- [x] No NASA logo used; NASA Space Apps 2026 Campinas badge & explicit data citations included
- [x] MIT `LICENSE` present (with TeleGeography CC BY-NC-SA carve-out disclosed)
- [x] Public demo URL verified — HTTP 200, renders without login
- [x] Declared limitation documented (monthly `WS2M` null ⇒ no ramp-risk claim in UI or docs)
- [ ] Re-test the live URL in an incognito window on mobile/4G after the final deploy
- [ ] Click **Submit for Judging** before Sunday 23:00 BRT and tag `submission-final`

