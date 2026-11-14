# PRD — Cockpit-OMNI (Team Curva do Pato)

**Team:** Curva do Pato  
**Lead / Participant:** Luiz Antonio Gois Junior  
**Event:** NASA Space Apps Challenge 2026 — Campinas, SP, Brazil (Nov 14–15, 2026)

## Problema

Grid operators, civil defense analysts, agricultural planners, and citizens today cannot easily distinguish statistically significant multi-decade climate shifts from normal seasonal variability, because raw monthly satellite/reanalysis time series contain strong seasonal cycles, annual summary artifacts (`YYYY13`), and lack side-by-side physical driver attribution.

## Frase-objetivo

Any user (researcher, grid operator, educator, or citizen) can select a geographic region and an Earth system variable, inspect its 42-year NASA time series (`1984–2025`, `n = 504` months), verify immediately whether the observed trend is statistically significant (`α = 0.05`) via Seasonal Mann-Kendall and deseasonalized Theil-Sen slope (`95% CI`), and compare four physical attribution vectors (`live`, `cached`, or `roadmap`).

## Desafio oficial

2 — Be An Earth System Trend Detective!  
https://www.spaceappschallenge.org/2026/challenges/

- **Objectives essenciais:**
  - Choose one or more Earth system variables (`T2M`, `PRECTOTCORR`, `ALLSKY_SFC_SW_DWN`, `CLRSKY_SFC_SW_DWN`, `CLOUD_ATTEN_PCT`, `RH2M`, `WS2M`).
  - Obtain data for specific regions (Campinas-SP, Petrolina-PE, Manaus-AM, plus custom `lat, lon` queries).
  - Generate and display long-term continuous time series (`1984–2025`, `n = 504` months).
  - Conduct statistical analysis to calculate the rate of change (`Theil-Sen slope/decade` + `95% CI`) and determine whether trends are statistically significant (`Seasonal Mann-Kendall` & `Original Mann-Kendall`, `p-value`, verdict at `α = 0.05`).
- **Objectives desejáveis:**
  - Multi-vector physical attribution separating All-Sky vs. Clear-Sky radiative trends, active fires (`NASA FIRMS VIIRS_NOAA21_NRT`), space weather alerts (`NASA DONKI`), and official `Earthdata CMR MCP v1` dataset provenance.
  - Extraterrestrial environmental telemetry analogs (`Mars 2020 Perseverance MEDA` and `JPL Horizons`).

## Dado da NASA

- **Nome:** NASA POWER (`CERES` & `MERRA-2` monthly agroclimatology/meteorology), NASA FIRMS (`VIIRS_NOAA21_NRT`), NASA DONKI (`api.nasa.gov`), and NASA Earthdata CMR MCP (`https://cmr.earthdata.nasa.gov/mcp/v1`).
- **URL aberta em:** Sábado, 14/11/2026, manhã/tarde (`https://power.larc.nasa.gov/api/temporal/monthly/point`, `https://firms.modaps.eosdis.nasa.gov/api/area/csv`, `https://api.nasa.gov/DONKI/notifications`, `https://cmr.earthdata.nasa.gov/mcp/v1`).
- **Frase:** Usamos **NASA POWER (MERRA-2 / CERES), NASA FIRMS, NASA DONKI e Earthdata CMR MCP**. Com eles, provamos estatisticamente o aquecimento e a mudança hidroclimática de 42 anos (`1984–2025`) e separamos se o aumento de irradiação solar vem de menos nuvens (`All-Sky` vs `Clear-Sky`) ou de aerossóis/queimadas — algo impossível apenas olhando médias brutas.

## Não pode faltar

- A variável escolhida (`T2M`, `PRECTOTCORR`, `ALLSKY_SFC_SW_DWN`, `CLRSKY_SFC_SW_DWN`, `CLOUD_ATTEN_PCT`, `RH2M`, `WS2M`) — **na tela**
- A região (`Campinas-SP`, `Petrolina-PE`, `Manaus-AM` + coordenadas customizadas) — **na tela**
- A série temporal longa (`1984–2025`, `504` meses contínuos sem `YYYY13`) — **na tela**
- Um teste estatístico (`Seasonal Mann-Kendall`, `Original Mann-Kendall` e `Theil-Sen` com intervalo de confiança de 95%) — **na tela**
- Resposta direta na tela à pergunta *"essa subida é significativa ou pode ser variação normal?"* (`Significant` vs `No Significant Trend` a `α = 0.05`) — **na tela**

## Fora do escopo (Roadmap declarado com transparência)

- Processamento ao vivo de granulometria SAR interferométrica multi-GB do `NISAR_L2_GUNW_PROVISIONAL_V1` e `ECOSTRESS` (declarado honestamente como `roadmap` no card de atribuição geotérmica/deformação, com coleção validada no Earthdata CMR MCP).
