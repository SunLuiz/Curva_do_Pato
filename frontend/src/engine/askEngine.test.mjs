import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { answerEcosystemQuestion, parseQuestion, haversineKm } from "./askEngine.js";

const cacheDir = path.resolve(import.meta.dirname, "../../public/cache");

function loadFromDisk(filename) {
  return JSON.parse(fs.readFileSync(path.join(cacheDir, filename), "utf8"));
}

test("Campinas warming question returns grounded POWER trend without backend keys", async () => {
  const res = await answerEcosystemQuestion("What is the warming trend in Campinas?", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(res.detectedTopic, "climate_trend");
  assert.equal(res.action?.tab, "trend");
  assert.equal(res.action?.region, "campinas");
  assert.equal(res.action?.variable, "T2M");
  assert.match(res.answer, /Surface Air Temperature/);
  assert.match(res.answer, /0\.409/);
  assert.match(res.answer, /significant upward trend/);
});

test("Manaus attribution question distinguishes cloud cover from fire aerosols", async () => {
  const res = await answerEcosystemQuestion("Por que Manaus mudou: nuvens ou queimadas?", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(res.resolvedLang, "pt");
  assert.equal(res.detectedTopic, "attribution");
  assert.equal(res.action?.tab, "attribution");
  assert.equal(res.action?.region, "manaus");
  assert.match(res.answer, /cloud-dominated/i);
  assert.match(res.answer, /-0\.855/);
});

test("Custom year slice and calendar month trigger browser-side Seasonal Mann-Kendall", async () => {
  const res = await answerEcosystemQuestion("Campinas temperature trend 2000-2025", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(res.detectedTopic, "climate_trend");
  assert.match(res.answer, /2000-2025/);
  assert.match(res.answer, /recomputed in browser/);
  assert.match(res.answer, /n=312 months/);
});

test("Extremum and single-year queries extract exact cached observations", async () => {
  const maxRes = await answerEcosystemQuestion("Qual foi o mes mais quente em Petrolina?", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(maxRes.resolvedLang, "pt");
  assert.match(maxRes.answer, /Petrolina-PE/);
  assert.match(maxRes.answer, /maxima/i);

  const yrRes = await answerEcosystemQuestion("Campinas temperature in 2024-03", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.match(yrRes.answer, /2024-03/);
  assert.match(yrRes.answer, /°C/);
});

test("Multi-biome comparison ranks all 3 regions cleanly even with rate words", async () => {
  const res = await answerEcosystemQuestion("Which biome has the highest warming trend across all 3 regions?", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(res.detectedTopic, "compare_trend");
  assert.match(res.answer, /Campinas-SP/);
  assert.match(res.answer, /Petrolina-PE/);
  assert.match(res.answer, /Manaus-AM/);
});

test("WS2M wind query honestly flags null hypothesis and hourly Duck Curve limit", async () => {
  const res = await answerEcosystemQuestion("Is wind speed WS2M rising in Campinas?", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(res.action?.variable, "WS2M");
  assert.match(res.answer, /no statistically significant trend/i);
  assert.match(res.answer, /Duck Curve/i);
});

test("FIRMS Haversine radius query computes nearby fire hotspots from cached GeoJSON", async () => {
  assert.ok(Math.abs(haversineKm(-9.39, -40.5, -9.39, -40.5)) < 0.01);
  const res = await answerEcosystemQuestion("How many fires within 250 km of Petrolina?", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(res.detectedTopic, "firms");
  assert.equal(res.action?.tab, "live");
  assert.match(res.answer, /3313/);
  assert.match(res.answer, /250 km/);
});

test("DONKI space weather question summarizes 7-day solar alerts", async () => {
  const res = await answerEcosystemQuestion("Quais os alertas solares do DONKI?", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(res.resolvedLang, "pt");
  assert.equal(res.detectedTopic, "donki");
  assert.equal(res.action?.tab, "space");
  assert.match(res.answer, /8 alertas/);
  assert.match(res.answer, /RBE/);
});

test("CMR evidence handles NISAR/ECOSTRESS honesty and live open catalog search", async () => {
  const nisarRes = await answerEcosystemQuestion("Are NISAR and ECOSTRESS plotted in Cockpit?", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(nisarRes.detectedTopic, "cmr_evidence");
  assert.match(nisarRes.answer, /NISAR_L2_GUNW_PROVISIONAL_V1/);
  assert.match(nisarRes.answer, /ECO_L2T_LSTE/);

  const liveCmrRes = await answerEcosystemQuestion("Search CMR for soil moisture", {
    loadJson: loadFromDisk,
    fetchLive: async () => ({
      ok: true,
      json: async () => ({
        feed: {
          entry: [{ id: "C123-NSIDC", short_name: "SPL3SMP", title: "SMAP L3 Soil Moisture", data_center: "NSIDC" }],
        },
      }),
    }),
  });
  assert.equal(liveCmrRes.detectedTopic, "cmr_live");
  assert.match(liveCmrRes.answer, /SPL3SMP/);
});

test("Space Analog answers DSN, OSDR, CelesTrak, and 7 MPTO frontiers", async () => {
  const res = await answerEcosystemQuestion("Explain the 7 MPTO frontiers, DSN and OSD-615", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(res.detectedTopic, "space_analog");
  assert.equal(res.action?.tab, "space");
  assert.match(res.answer, /Goldstone/);
  assert.match(res.answer, /OSD-615/);
  assert.match(res.answer, /Heat Sink Saturation/);
});

test("Custom coordinates query calls zero-key NASA POWER API and computes Theil-Sen trend", async () => {
  const paramValues = {};
  for (let y = 1984; y <= 2005; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      paramValues[`${y}${String(m).padStart(2, "0")}`] = 20 + (y - 1984) * 0.05 + m * 0.1;
    }
    paramValues[`${y}13`] = 22;
  }

  const res = await answerEcosystemQuestion("Temperature trend at -23.55, -46.63", {
    loadJson: loadFromDisk,
    fetchLive: async (url) => {
      assert.match(url, /power\.larc\.nasa\.gov/);
      assert.match(url, /latitude=-23\.5500/);
      return {
        ok: true,
        json: async () => ({ properties: { parameter: { T2M: paramValues } } }),
      };
    },
  });
  assert.equal(res.detectedTopic, "custom_coords_live");
  assert.match(res.answer, /significant upward trend/i);
  assert.match(res.answer, /n=264 months/);

  const parsed = parseQuestion("Compare 2000-2025 warming in Campinas", { lang: "en" });
  assert.equal(parsed.customCoords, null);
  assert.deepEqual(parsed.yearRange, [2000, 2025]);
});

test("Hourly forecast and private utility telemetry get honest boundary messages", async () => {
  const hourly = await answerEcosystemQuestion("Predict hourly wind ramps for tomorrow morning", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(hourly.detectedTopic, "boundary");
  assert.match(hourly.answer, /MONTHLY resolution/i);

  const scada = await answerEcosystemQuestion("Show me private substation SCADA load", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(scada.detectedTopic, "out_of_scope");
});

test("Glossary and region summary respond cleanly in both EN and PT-BR", async () => {
  const duck = await answerEcosystemQuestion("What is the Solar Duck Curve?", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(duck.detectedTopic, "glossary:duck-curve");
  assert.match(duck.answer, /Solar Duck Curve/i);

  const summary = await answerEcosystemQuestion("Resumo de Petrolina", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(summary.resolvedLang, "pt");
  assert.equal(summary.detectedTopic, "region_overview");
  assert.match(summary.answer, /Petrolina-PE/);
  assert.match(summary.answer, /Precipitacao/);
});

test("7-Agent Orchestration & Rover VCE/FPGA hardware queries return exact engineering facts", async () => {
  const agRes = await answerEcosystemQuestion("Como funcionam os 7 agentes e o Auditor Estatistico?", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(agRes.resolvedLang, "pt");
  assert.equal(agRes.detectedTopic, "multiagent");
  assert.match(agRes.answer, /Hebe Radiance/);
  assert.match(agRes.answer, /Grok Cratera/);
  assert.match(agRes.answer, /Bios Guardian/);
  assert.match(agRes.answer, /Storm Watcher/);
  assert.match(agRes.answer, /Auditor Estatistico/);

  const hwRes = await answerEcosystemQuestion("Explain Perseverance RAD750, VCE FPGA and PIC64-HPSC", {
    loadJson: loadFromDisk,
    lang: "en",
  });
  assert.equal(hwRes.detectedTopic, "rover_hardware");
  assert.match(hwRes.answer, /Virtex-5QV/);
  assert.match(hwRes.answer, /CMV20000/);
  assert.match(hwRes.answer, /PIC64-HPSC/);
});
