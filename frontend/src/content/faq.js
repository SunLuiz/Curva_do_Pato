/**
 * Canonical AskPanel Level-1 Q&A grounded in frozen NASA snapshot JSONs.
 * Every item works 100% offline with zero LLM dependency, links straight to
 * the inspected Cockpit view, and is verified by scripts/verify_answers.mjs.
 */

export const FAQ_ITEMS = [
  {
    id: "is-campinas-warming",
    question: "Is Campinas really warming?",
    category: "Campinas",
    cacheCheck: {
      region: "campinas",
      variable: "T2M",
      asserts: {
        significant_5pct: true,
        slope_per_decade: 0.4091,
        total_change: 1.718,
        tau: 0.293,
      },
    },
    action: { route: "/cockpit", tab: "trend", region: "campinas", variable: "T2M" },
    answer:
      "Yes — over 504 monthly observations (1984-2025), Campinas 2m air temperature rose +0.4091 C/decade (+1.718 C total, 95% CI [0.3329, 0.4891], Kendall tau = 0.293, Seasonal MK p < 1e-16).",
  },
  {
    id: "manaus-clouds-or-smoke",
    question: "Is Manaus sunnier from clouds or smoke?",
    category: "Attribution",
    cacheCheck: {
      region: "manaus",
      variable: "CLOUD_ATTEN_PCT",
      asserts: {
        significant_5pct: true,
        slope_per_decade: -0.8552,
        total_change: -3.592,
        p_value: 3.015e-8,
      },
    },
    action: { route: "/cockpit", tab: "attribution", region: "manaus", variable: "CLOUD_ATTEN_PCT" },
    answer:
      "Clouds attenuated less radiation in Manaus: CLOUD_ATTEN_PCT declined -0.8552 %/decade (-3.592 % cumulative, p = 3.015e-8), while CLRSKY_SFC_SW_DWN shows no significant trend (p = 0.7686). Campinas is the opposite engine: flat cloud attenuation (p = 0.9476) paired with rising clear-sky transmittance (+0.1897 MJ/m2/day/dec, p < 1e-16).",
  },
  {
    id: "can-you-predict-wind-ramp",
    question: "Can you predict a wind ramp (Duck Curve)?",
    category: "Limits",
    cacheCheck: {
      region: "campinas",
      variable: "WS2M",
      asserts: {
        significant_5pct: false,
        p_value: 0.489,
        slope_per_decade: -0.0042,
      },
    },
    action: { route: "/cockpit", tab: "trend", region: "campinas", variable: "WS2M" },
    answer:
      "No — WS2M monthly 2m wind speed shows NO statistically significant trend in Campinas (p = 0.489, 95% CI [-0.0191, +0.0103] m/s/dec), Petrolina (p = 0.1734), or Manaus (p = 0.4512). Monthly 2m averages also smooth out 15-minute hub-height turbine ramps; hourly GOES/hub-height ingestion is an explicit roadmap item.",
  },
  {
    id: "campinas-compound-drying",
    question: "Is Campinas getting drier alongside warmer temperatures?",
    category: "Campinas",
    cacheCheck: {
      region: "campinas",
      variable: "PRECTOTCORR",
      asserts: {
        significant_5pct: true,
        slope_per_decade: -0.2724,
        total_change: -1.144,
        p_value: 0.00000159,
      },
    },
    action: { route: "/cockpit", tab: "trend", region: "campinas", variable: "PRECTOTCORR" },
    answer:
      "Yes — Campinas exhibits compound drying: precipitation fell -0.2724 mm/day/decade (-1.144 mm/day total, p = 1.59e-6) while near-surface relative humidity (RH2M) declined -1.6601 %/decade (-6.972 % total, p < 1e-16).",
  },
  {
    id: "why-seasonal-mk-matters",
    question: "Why use Seasonal Mann-Kendall instead of an ordinary trend test?",
    category: "Statistics",
    cacheCheck: {
      region: "campinas",
      variable: "ALLSKY_SFC_SW_DWN",
      asserts: {
        significant_5pct: true,
        original_p_value: 0.1968,
        p_value: 0.0008616,
        slope_per_decade: 0.1621,
      },
    },
    action: { route: "/cockpit", tab: "trend", region: "campinas", variable: "ALLSKY_SFC_SW_DWN" },
    answer:
      "Regular seasonal cycles drown out decadal signals in naive pooled tests: ordinary Mann-Kendall returns p = 0.1968 ('no trend') for Campinas All-Sky Irradiance, whereas Seasonal Mann-Kendall compares matching calendar months across years and detects p = 0.0008616 (+0.1621 MJ/m2/day/decade).",
  },
  {
    id: "petrolina-brightening-regime",
    question: "How is semi-arid Petrolina changing for solar and rain?",
    category: "Petrolina",
    cacheCheck: {
      region: "petrolina",
      variable: "ALLSKY_SFC_SW_DWN",
      asserts: {
        significant_5pct: true,
        slope_per_decade: 0.2558,
        total_change: 1.075,
        p_value: 9.384e-9,
      },
    },
    action: { route: "/cockpit", tab: "trend", region: "petrolina", variable: "ALLSKY_SFC_SW_DWN" },
    answer:
      "Petrolina-PE leads All-Sky solar brightening (+0.2558 MJ/m2/day/decade, +1.075 total, p = 9.38e-9) driven by cloud thinning (CLOUD_ATTEN_PCT -0.9647 %/decade, p = 2.83e-9; clear-sky p = 0.2901), while warming +0.3012 C/decade and losing -0.0721 mm/day/decade of rain (p = 0.0291).",
  },
  {
    id: "manaus-warming-drying",
    question: "What do 42 years of Amazon data show for Manaus?",
    category: "Manaus",
    cacheCheck: {
      region: "manaus",
      variable: "PRECTOTCORR",
      asserts: {
        significant_5pct: true,
        slope_per_decade: -0.4673,
        total_change: -1.963,
        p_value: 4.238e-11,
      },
    },
    action: { route: "/cockpit", tab: "trend", region: "manaus", variable: "PRECTOTCORR" },
    answer:
      "Manaus-AM warmed +0.3065 C/decade (+1.287 C total, tau = 0.381, p < 1e-16) and experienced the steepest rainfall decline among all three biomes (-0.4673 mm/day/decade, -1.963 mm/day total, tau = -0.204, p = 4.24e-11).",
  },
  {
    id: "firms-fires-plotted",
    question: "Are the fire dots on the FIRMS map real-time or cached?",
    category: "Live & Map",
    cacheCheck: {
      customFile: "fires_br_1d.geojson",
      count: 3313,
      returned_features: 1500,
    },
    action: { route: "/cockpit", tab: "live", region: "campinas", variable: "T2M" },
    answer:
      "In static offline mode, Cockpit plots 1,500 of 3,313 VIIRS NOAA-21 Brazil detections from the verified 2026-11-14 15:04 UTC snapshot (mean FRP 3.06 MW). When the FastAPI backend is reachable, clicking 'Verify against NASA now' queries live LANCE FIRMS on the server without exposing API keys to the browser.",
  },
  {
    id: "nisar-ecostress-roadmap",
    question: "Are NISAR and ECOSTRESS already plotted in Cockpit?",
    category: "Sources",
    cacheCheck: {
      customFile: "cmr_evidence.json",
    },
    action: { route: "/cockpit", tab: "sources", region: "campinas", variable: "T2M" },
    answer:
      "No — NASA Earthdata CMR collections NISAR (NISAR_L2_GUNW_PROVISIONAL_V1) and ECOSTRESS (ECO_L2T_LSTE) are verified catalog citations discovered via CMR MCP and explicitly listed as planned next-stage vectors, never fabricated in charts.",
  },
  {
    id: "how-csv-and-sliders-work",
    question: "Can I re-compute trends for a custom decade range or export CSV offline?",
    category: "Workbench",
    cacheCheck: {
      customFile: "manifest.json",
      frozen_at_utc: "2026-11-14T15:04:15.192319+00:00",
    },
    action: { route: "/cockpit", tab: "trend", region: "campinas", variable: "T2M" },
    answer:
      "Yes — adjust the start/end year sliders or calendar-month filter in Cockpit and our client-side Seasonal Mann-Kendall + Theil-Sen engine recalculates in ~50 ms in pure JavaScript. Every Chart card also includes a 100-row paginated Raw data tab with instant CSV and JSON export.",
  },
];

export function formatPersonalNote(profile) {
  if (!profile?.name) return "";
  const mastered = Object.values(profile.mastery || {}).filter((m) => m?.passed).length;
  return `Tailored for detective ${profile.name} (${profile.depth} track · ${mastered}/5 modules mastered)`;
}
