/**
 * Build-time static HTML prerenderer for /, /cockpit, and /game.
 * Runs right after `vite build` so non-JS crawlers (OAI-SearchBot, ChatGPT-User,
 * PerplexityBot, ClaudeBot, Bingbot) receive complete <h1>, factual tables, links,
 * canonical URLs, and route-specific JSON-LD inside dist/ while React 19 createRoot
 * seamlessly replaces #root on browser mount with zero hydration mismatch.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getRouteMeta } from "../src/content/routeMeta.js";
import { STORY } from "../src/content/story.js";
import { FAQ_ITEMS } from "../src/content/faq.js";
import { PLANET_LIST } from "../src/engine/mptoEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "..");
const DIST_DIR = path.join(FRONTEND_DIR, "dist");
const CACHE_DIR = path.join(FRONTEND_DIR, "public", "cache");

function esc(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function readCache(name) {
  return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, name), "utf8"));
}

const campinas = readCache("attribution_campinas.json");
const petrolina = readCache("attribution_petrolina.json");
const manaus = readCache("attribution_manaus.json");
const wsCampinas = readCache("trend_campinas_WS2M.json");
const wsPetrolina = readCache("trend_petrolina_WS2M.json");
const wsManaus = readCache("trend_manaus_WS2M.json");

function fmtNum(n, digits = 4) {
  const sign = n > 0 ? "+" : "";
  return `${sign}${Number(n).toFixed(digits)}`;
}

function renderBenchmarkTable() {
  const rows = [
    {
      label: "Campinas-SP (-22.90, -47.06)",
      biome: "Atlantic Forest / Cerrado",
      t2m: campinas.headline_temperature,
      hydro: campinas.vectors.find((v) => v.id === "hydrometeorological").details,
      fire: campinas.vectors.find((v) => v.id === "fire_aerosol").details,
      ws: wsCampinas.stats,
      verdict: "Aerosol / Clear-Sky Driven",
    },
    {
      label: "Petrolina-PE (-9.39, -40.50)",
      biome: "Caatinga Semi-Arid Solar Corridor",
      t2m: petrolina.headline_temperature,
      hydro: petrolina.vectors.find((v) => v.id === "hydrometeorological").details,
      fire: petrolina.vectors.find((v) => v.id === "fire_aerosol").details,
      ws: wsPetrolina.stats,
      verdict: "Cloud-Driven Brightening",
    },
    {
      label: "Manaus-AM (-3.10, -60.02)",
      biome: "Amazon Rainforest",
      t2m: manaus.headline_temperature,
      hydro: manaus.vectors.find((v) => v.id === "hydrometeorological").details,
      fire: manaus.vectors.find((v) => v.id === "fire_aerosol").details,
      ws: wsManaus.stats,
      verdict: "Cloud-Driven Brightening",
    },
  ];

  const trs = rows
    .map(
      (r) => `
      <tr>
        <td><strong>${esc(r.label)}</strong><br /><span>${esc(r.biome)}</span></td>
        <td>${esc(fmtNum(r.t2m.slope_per_decade))} °C/dec (95% CI [${esc(fmtNum(r.t2m.ci_95_per_decade[0]))}, ${esc(fmtNum(r.t2m.ci_95_per_decade[1]))}], total ${esc(fmtNum(r.t2m.total_change, 3))} °C, p=${esc(r.t2m.p_value === 0 ? "<1e-16" : r.t2m.p_value.toExponential(2))})</td>
        <td>${esc(fmtNum(r.hydro.precip_slope_per_decade))} mm/day/dec (p=${esc(r.hydro.precip_p_value.toExponential(2))})</td>
        <td>${esc(fmtNum(r.hydro.cloud_attenuation_slope_per_decade))} %/dec (p=${esc(r.hydro.cloud_attenuation_p_value.toExponential(2))})</td>
        <td>${esc(fmtNum(r.fire.clrsky_slope_per_decade))} MJ/m²/day/dec (p=${esc(r.fire.clrsky_p_value === 0 ? "<1e-16" : r.fire.clrsky_p_value)})</td>
        <td>${esc(fmtNum(r.ws.slope_per_decade))} m/s/dec (p=${esc(r.ws.p_value)}, null)</td>
        <td><strong>${esc(r.verdict)}</strong></td>
      </tr>`
    )
    .join("");

  return `
    <table>
      <caption>NASA POWER 42-Year Monthly Trends (1984–2025, n = 504 months, Seasonal Mann-Kendall period=12 + Deseasonalized Theil-Sen)</caption>
      <thead>
        <tr>
          <th>Station &amp; Biome</th>
          <th>2m Air Temp (T2M)</th>
          <th>Rainfall (PRECTOTCORR)</th>
          <th>Cloud Attenuation</th>
          <th>Clear-Sky SW</th>
          <th>2m Wind (WS2M)</th>
          <th>Causal Verdict</th>
        </tr>
      </thead>
      <tbody>${trs}</tbody>
    </table>`;
}

function navLinksHtml() {
  return `
    <header>
      <nav aria-label="Primary Navigation">
        <a href="/">Cockpit-OMNI · Curve of Duck (Story)</a>
        <a href="/cockpit">Earth System Cockpit &amp; Ask OMNI</a>
        <a href="/game">3D Rover Pilot &amp; Academy</a>
        <a href="/science/">Science Monographs</a>
        <a href="/llms.txt">llms.txt</a>
        <a href="/llms-full.txt">llms-full.txt</a>
      </nav>
    </header>`;
}

function footerHtml() {
  return `
    <footer>
      <p>Team Curva do Pato (Luiz Antonio Gois Junior) · NASA Space Apps Challenge 2026 — Campinas, SP, Brazil · MIT License · <a href="https://github.com/SunLuiz/Curva_do_Pato">GitHub</a></p>
    </footer>`;
}

function buildHomeBody() {
  const slidesHtml = STORY.map(
    (s) => `
      <section>
        <h2>${esc(s.kicker)} — ${esc(s.title)}</h2>
        <p>${esc(s.body)}</p>
        <ul>${(s.highlights || []).map((h) => `<li><strong>${esc(h.label)}:</strong> ${esc(h.value)}</li>`).join("")}</ul>
      </section>`
  ).join("");

  return `
    <div class="prerender-shell">
      ${navLinksHtml()}
      <main>
        <h1>Curve of Duck · Cockpit-OMNI — Challenge #2: Be An Earth System Trend Detective!</h1>
        <p>Cockpit-OMNI (Curve of Duck) is an open, zero-key NASA Earth observation platform analyzing 42 years of monthly NASA POWER telemetry (1984–2025, n = 504 months) using Seasonal Mann-Kendall (period = 12) and deseasonalized Theil-Sen slopes with 95% confidence intervals.</p>
        ${renderBenchmarkTable()}
        ${slidesHtml}
        <section>
          <h2>Citable Research Monographs</h2>
          <ul>
            <li><a href="/science/brazilian-biomes-solar-brightening-1984-2025/">42 Years of NASA POWER Trends Across Brazilian Biomes (1984–2025)</a></li>
            <li><a href="/science/northeast-brazil-solar-irradiance-clouds-vs-aerosols/">Is Solar Irradiance Really Rising in Brazil's Northeast? Cloud-Driven vs. Aerosol-Driven Brightening</a></li>
            <li><a href="/science/duck-curve-to-mars-wind-ramp-limits/">From Duck Curve to Mars: Planetary Analog &amp; Monthly Wind Ramp Limits</a></li>
          </ul>
        </section>
      </main>
      ${footerHtml()}
    </div>`;
}

function buildCockpitBody() {
  const faqsHtml = FAQ_ITEMS.map(
    (f) => `
      <article>
        <h3>${esc(f.question)}</h3>
        <p>${esc(f.answer)}</p>
      </article>`
  ).join("");

  return `
    <div class="prerender-shell">
      ${navLinksHtml()}
      <main>
        <h1>Earth System Trend Cockpit — 42-Year NASA POWER, FIRMS, DONKI, CMR &amp; Ask OMNI</h1>
        <p>Inspect 504 monthly NASA POWER observations (1984–2025) across Campinas-SP, Petrolina-PE, Manaus-AM, and any global (lat, lon) coordinate via open zero-key CORS APIs. Compare Seasonal Mann-Kendall trends, multi-vector attribution, and 5 citizen Action Presets (Heatwaves, Drought, Wildfires 150 km, Solar Storm, City Health).</p>
        ${renderBenchmarkTable()}
        <section>
          <h2>Declared Limitation: Monthly WS2M Wind Speed</h2>
          <p>Monthly surface wind speed (WS2M) exhibits no significant trend at Campinas (p = ${esc(wsCampinas.stats.p_value)}), Petrolina (p = ${esc(wsPetrolina.stats.p_value)}), or Manaus (p = ${esc(wsManaus.stats.p_value)}) and smooths intra-hour gusts. Cockpit-OMNI explicitly marks hourly wind-ramp and battery-dispatch claims unsupported.</p>
        </section>
        <section>
          <h2>Verified Telemetry Q&amp;A (Ask OMNI Knowledge Base)</h2>
          ${faqsHtml}
        </section>
        <section>
          <h2>Audited JSON Snapshots</h2>
          <ul>
            <li><a href="/cache/attribution_campinas.json">Campinas-SP Attribution JSON</a></li>
            <li><a href="/cache/attribution_petrolina.json">Petrolina-PE Attribution JSON</a></li>
            <li><a href="/cache/attribution_manaus.json">Manaus-AM Attribution JSON</a></li>
            <li><a href="/cache/cmr_evidence.json">NASA Earthdata CMR MCP Evidence JSON</a></li>
          </ul>
        </section>
      </main>
      ${footerHtml()}
    </div>`;
}

function buildGameBody() {
  const planetsRows = PLANET_LIST.map(
    (p) =>
      `<tr><td><code>${esc(p.id)}</code></td><td>${esc(p.labelEn)}</td><td>${esc(p.g)} m/s²</td><td>${esc(p.rho)} kg/m³</td><td>${esc(p.baseTau)}</td><td>${esc(p.albedoIrGain)}</td></tr>`
  ).join("");

  return `
    <div class="prerender-shell">
      ${navLinksHtml()}
      <main>
        <h1>Curve of Duck: Rover Pilot 3D &amp; Trend Detective Academy</h1>
        <p>Three.js 3D planetary rover simulation powered by the universal Planetary Context Vector Theta = [g, rho, cpDust, kRegolith, baseTau, albedoIrGain], Beer-Lambert solar yield (100 * exp(-0.55 * tau)), NASA Mars 2020 MEDA Sol 40 telemetry, 64 m plume-regolith impulse-response calibration, 7 physical MPTO agents under a non-LLM Statistical Auditor veto, and a zero-login 5-module Mastery Academy (gate >= 0.80).</p>
        <table>
          <caption>Active Planetary Simulation Environments (planetaryPhysics.js)</caption>
          <thead>
            <tr><th>ID</th><th>Environment</th><th>Gravity (g)</th><th>Density (rho)</th><th>Base Tau</th><th>Crater IR Albedo Gain</th></tr>
          </thead>
          <tbody>${planetsRows}</tbody>
        </table>
        <section>
          <h2>Five Real-Data Missions (M1–M5) &amp; Academy Tracks</h2>
          <ul>
            <li><strong>M1 — Solar Duck Curve &amp; T^4 Thermal Saturation:</strong> Peak irradiance 1007.85 W/m² management &amp; BESS docking.</li>
            <li><strong>M2 — MEDA Sol 40 Gusts vs. Monthly WS2M Null:</strong> 2 Hz gust shelter against flat monthly WS2M (p = 0.489).</li>
            <li><strong>M3 — 999999999.0 Sentinel Purge &amp; Alpha Crater Slip Avoidance:</strong> Filtering 867 corrupt MEDA rows and avoiding >= 44% wheel slip (1.8x Wh/km).</li>
            <li><strong>M4 — 42-Year Statistical Falsification:</strong> Distinguishing Campinas clear-sky aerosol shifts (p &lt; 1e-16) from cloud-driven Manaus (p = 3.02e-08).</li>
            <li><strong>M5 — Conjugated DONKI + OSDR OSD-615 + Lunar Lava Tube Survival:</strong> Protecting biological circularity (SoC_bio) under 13% crater IR albedo gain.</li>
          </ul>
        </section>
      </main>
      ${footerHtml()}
    </div>`;
}

function patchHtml(template, route, bodyHtml, extraJsonLd = null) {
  const meta = getRouteMeta(route, "en");
  let html = template;

  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(meta.title)}</title>`);
  html = html.replace(
    /<meta\s+name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="${esc(meta.description)}" />`
  );
  html = html.replace(
    /<link\s+rel="canonical"\s+href="[^"]*"\s*\/>/,
    `<link rel="canonical" href="${esc(meta.canonical)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:url"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:url" content="${esc(meta.canonical)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:title"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:title" content="${esc(meta.ogTitle)}" />`
  );
  html = html.replace(
    /<meta\s+property="og:description"\s+content="[^"]*"\s*\/>/,
    `<meta property="og:description" content="${esc(meta.ogDescription)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:title" content="${esc(meta.ogTitle)}" />`
  );
  html = html.replace(
    /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/>/,
    `<meta name="twitter:description" content="${esc(meta.ogDescription)}" />`
  );

  if (extraJsonLd) {
    html = html.replace(
      "</head>",
      `  <script type="application/ld+json">${JSON.stringify(extraJsonLd)}</script>\n  </head>`
    );
  }

  html = html.replace('<div id="root"></div>', `<div id="root">${bodyHtml}</div>`);
  return html;
}

const templatePath = path.join(DIST_DIR, "index.html");
const template = fs.readFileSync(templatePath, "utf8");

// 1. Prerender root /
fs.writeFileSync(templatePath, patchHtml(template, "/", buildHomeBody()), "utf8");

// 2. Prerender /cockpit and /game into _prerender/ (avoids trailing-slash directory collisions on Vercel)
const prerenderDir = path.join(DIST_DIR, "_prerender");
fs.mkdirSync(prerenderDir, { recursive: true });

const cockpitJsonLd = {
  "@context": "https://schema.org",
  "@type": "Dataset",
  "@id": "https://www.curveofduck.xyz/cockpit#dataset",
  name: "Cockpit-OMNI 42-Year NASA POWER Trend & Multi-Vector Attribution Workbench",
  url: "https://www.curveofduck.xyz/cockpit",
  temporalCoverage: "1984-01/2025-12",
  license: "https://opensource.org/licenses/MIT",
  distribution: [
    { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: "https://www.curveofduck.xyz/cache/attribution_campinas.json" },
    { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: "https://www.curveofduck.xyz/cache/attribution_petrolina.json" },
    { "@type": "DataDownload", encodingFormat: "application/json", contentUrl: "https://www.curveofduck.xyz/cache/attribution_manaus.json" },
  ],
};

const gameJsonLd = {
  "@context": "https://schema.org",
  "@type": "LearningResource",
  "@id": "https://www.curveofduck.xyz/game#learning",
  name: "Curve of Duck: Rover Pilot 3D & Trend Detective Academy",
  url: "https://www.curveofduck.xyz/game",
  learningResourceType: "Interactive 3D Physics Simulation & Mastery Academy",
  isAccessibleForFree: true,
  license: "https://opensource.org/licenses/MIT",
};

fs.writeFileSync(
  path.join(prerenderDir, "cockpit.html"),
  patchHtml(template, "/cockpit", buildCockpitBody(), cockpitJsonLd),
  "utf8"
);
fs.writeFileSync(
  path.join(prerenderDir, "game.html"),
  patchHtml(template, "/game", buildGameBody(), gameJsonLd),
  "utf8"
);

console.log("Prerendered static SEO/GEO HTML for /, /cockpit, and /game.");
