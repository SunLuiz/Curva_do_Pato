import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  evaluateClientInsight,
  listClientPresets,
  scoreVariableSeverity,
} from "./presets.js";

const CACHE_DIR = path.resolve(process.cwd(), "frontend/public/cache");

function loadTrend(region, variable) {
  return JSON.parse(
    fs.readFileSync(path.join(CACHE_DIR, `trend_${region}_${variable}.json`), "utf8")
  );
}

test("listClientPresets returns 5 localized presets in EN and PT", () => {
  const en = listClientPresets("en");
  const pt = listClientPresets("pt");
  assert.equal(en.length, 5);
  assert.equal(pt.length, 5);
  assert.equal(en[0].id, "calor");
  assert.equal(pt[0].id, "calor");
  assert.equal(en[0].title, "Prepare for Heatwaves");
  assert.equal(pt[0].title, "Preparar para onda de calor");
});

test("Campinas calor preset triggers red severity with +0.41 and +1.72 numbers", () => {
  const payloads = {
    T2M: loadTrend("campinas", "T2M"),
    ALLSKY_SFC_SW_DWN: loadTrend("campinas", "ALLSKY_SFC_SW_DWN"),
    RH2M: loadTrend("campinas", "RH2M"),
  };
  const insight = evaluateClientInsight({
    presetId: "calor",
    regionInfo: payloads.T2M.region,
    trendPayloads: payloads,
    lang: "en",
  });
  assert.equal(insight.severity, "red");
  assert.ok(insight.headline.includes("0.41"));
  assert.ok(insight.headline.includes("1.72"));
  assert.equal(insight.indicators.length, 3);
});

test("WS2M null trend always yields green stable severity", () => {
  const ws2m = loadTrend("campinas", "WS2M");
  assert.equal(scoreVariableSeverity("WS2M", ws2m.stats), "green");
  const insight = evaluateClientInsight({
    presetId: "clima_espacial",
    regionInfo: ws2m.region,
    trendPayloads: {
      ALLSKY_SFC_SW_DWN: loadTrend("campinas", "ALLSKY_SFC_SW_DWN"),
      WS2M: ws2m,
    },
    spaceWeather: { count: 2, notifications: [] },
    lang: "pt",
  });
  const wsIndicator = insight.indicators.find((i) => i.variable === "WS2M");
  assert.equal(wsIndicator.severity, "green");
  assert.ok(wsIndicator.sentence.includes("não mostrou tendência"));
});
