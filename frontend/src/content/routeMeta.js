/**
 * Single source of truth for per-route SEO & GEO metadata used both by
 * client-side navigation (App.jsx) and build-time static prerendering (scripts/prerender.mjs).
 */

export const SITE_ORIGIN = "https://www.curveofduck.xyz";
export const OG_IMAGE_URL = `${SITE_ORIGIN}/og-cover.png`;

export const ROUTE_META = {
  "/": {
    en: {
      title: "Curve of Duck · Cockpit-OMNI — NASA Earth System Trend Detective",
      description:
        "Open statistical trend detection, zero-login detective academy, and multi-vector attribution over 42 years of NASA POWER telemetry (1984–2025). Built at NASA Space Apps Challenge 2026 — Campinas.",
      ogTitle: "Curve of Duck · Cockpit-OMNI — NASA Earth System Trend Detective",
      ogDescription:
        "42 years of NASA telemetry, Seasonal Mann-Kendall + Theil-Sen trend verification, open natural-language Q&A, and Curve of Duck 3D Rover Pilot.",
    },
    pt: {
      title: "Curve of Duck · Cockpit-OMNI — Detetive de Tendências da Terra NASA",
      description:
        "Detecção estatística aberta, academia sem login e atribuição física em 42 anos de dados NASA POWER (1984–2025), FIRMS, DONKI e simulador 3D Rover Pilot.",
      ogTitle: "Curve of Duck · Cockpit-OMNI — Detetive de Tendências da Terra NASA",
      ogDescription:
        "42 anos de telemetria da NASA, Mann-Kendall Sazonal + Theil-Sen e simulador 3D Rover Pilot no navegador sem chaves de API.",
    },
    canonical: `${SITE_ORIGIN}/`,
    ogType: "website",
  },
  "/cockpit": {
    en: {
      title: "Earth System Trend Cockpit — 42-Year NASA POWER & Attribution | Cockpit-OMNI",
      description:
        "Interactive Seasonal Mann-Kendall and deseasonalized Theil-Sen workbench across 504 monthly NASA POWER observations (1984–2025) for Campinas-SP, Petrolina-PE, Manaus-AM, and custom coordinates, plus FIRMS, DONKI, CMR, and Ask OMNI.",
      ogTitle: "Earth System Trend Cockpit — 42-Year NASA POWER Trends & Attribution",
      ogDescription:
        "Verify warming, rainfall, cloud attenuation vs. clear-sky aerosols, and open Ask OMNI Q&A with zero API keys.",
    },
    pt: {
      title: "Cockpit de Tendências Climáticas — 42 Anos NASA POWER | Cockpit-OMNI",
      description:
        "Bancada interativa com Mann-Kendall Sazonal e Theil-Sen em 504 meses da NASA POWER (1984–2025), atribuição em Campinas, Petrolina e Manaus, queimadas FIRMS, DONKI e Ask OMNI.",
      ogTitle: "Cockpit de Tendências Climáticas — 42 Anos NASA POWER",
      ogDescription:
        "Verifique tendências de temperatura, chuva, nuvens vs. aerossóis e consulte o Ask OMNI sem login ou chaves.",
    },
    canonical: `${SITE_ORIGIN}/cockpit`,
    ogType: "website",
  },
  "/game": {
    en: {
      title: "Curve of Duck: Rover Pilot 3D & Academy — Earth, Mars & Moon Physics",
      description:
        "Three.js 3D planetary rover simulation grounded in NASA Mars 2020 MEDA, Beer-Lambert solar attenuation, 7 physical MPTO agents, and a 5-module zero-login Trend Detective Academy.",
      ogTitle: "Curve of Duck: Rover Pilot 3D & Trend Detective Academy",
      ogDescription:
        "Pilot an orbital-calibrated rover across Earth biomes, Mars Jezero Crater, and the Lunar South Pole while mastering statistical trend falsification.",
    },
    pt: {
      title: "Curve of Duck: Rover Pilot 3D & Academy — Física Terra, Marte e Lua",
      description:
        "Simulador 3D em Three.js calibrado com dados NASA Mars 2020 MEDA, atenuação solar Beer-Lambert, 7 agentes físicos MPTO e Academia com 5 módulos sem login.",
      ogTitle: "Curve of Duck: Rover Pilot 3D & Academy",
      ogDescription:
        "Pilote o rover na Terra, Cratera Jezero (Marte) e Polo Sul Lunar dominando falseamento estatístico real.",
    },
    canonical: `${SITE_ORIGIN}/game`,
    ogType: "website",
  },
};

export function getRouteMeta(route = "/", lang = "en") {
  const entry = ROUTE_META[route] || ROUTE_META["/"];
  const locale = lang === "pt" ? "pt" : "en";
  const localized = entry[locale] || entry.en;
  return {
    ...localized,
    canonical: entry.canonical,
    ogType: entry.ogType,
  };
}

function upsertMeta(selector, createAttrs, content) {
  let el = document.head.querySelector(selector);
  if (!el) {
    el = document.createElement("meta");
    for (const [k, v] of Object.entries(createAttrs)) {
      el.setAttribute(k, v);
    }
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Keeps document.title, canonical URL, html[lang], and OG/Twitter tags synchronized
 * during client-side navigation without introducing external helmet dependencies.
 */
export function applyDocumentMeta({ route = "/", lang = "en" } = {}) {
  if (typeof document === "undefined") return;
  const meta = getRouteMeta(route, lang);
  document.documentElement.lang = lang === "pt" ? "pt-BR" : "en";
  document.title = meta.title;

  upsertMeta('meta[name="description"]', { name: "description" }, meta.description);
  upsertMeta('meta[property="og:url"]', { property: "og:url" }, meta.canonical);
  upsertMeta('meta[property="og:title"]', { property: "og:title" }, meta.ogTitle);
  upsertMeta('meta[property="og:description"]', { property: "og:description" }, meta.ogDescription);
  upsertMeta('meta[name="twitter:title"]', { name: "twitter:title" }, meta.ogTitle);
  upsertMeta('meta[name="twitter:description"]', { name: "twitter:description" }, meta.ogDescription);

  let canonicalEl = document.head.querySelector('link[rel="canonical"]');
  if (!canonicalEl) {
    canonicalEl = document.createElement("link");
    canonicalEl.setAttribute("rel", "canonical");
    document.head.appendChild(canonicalEl);
  }
  canonicalEl.setAttribute("href", meta.canonical);
}
