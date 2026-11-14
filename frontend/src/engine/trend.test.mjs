import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { computeTrend, toCsv, humanVerdict } from "./trend.js";

const cacheDir = path.resolve(import.meta.dirname, "../../public/cache");

test("JS trend engine reproduces Campinas T2M warming within 1% of Python cache", () => {
  const raw = JSON.parse(fs.readFileSync(path.join(cacheDir, "trend_campinas_T2M.json"), "utf8"));
  const t0 = performance.now();
  const res = computeTrend(raw.series);
  const dt = performance.now() - t0;

  assert.equal(res.stats.significant_5pct, true);
  assert.equal(res.stats.trend, "increasing");
  assert.ok(Math.abs(res.stats.slope_per_decade - raw.stats.slope_per_decade) < 0.01);
  assert.ok(Math.abs(res.stats.tau - raw.stats.tau) < 0.02);
  assert.ok(res.stats.p_value < 1e-10);
  assert.ok(dt < 250, `Expected fast execution (<250ms), took ${dt.toFixed(1)}ms`);
});

test("JS trend engine reproduces Campinas WS2M null result", () => {
  const raw = JSON.parse(fs.readFileSync(path.join(cacheDir, "trend_campinas_WS2M.json"), "utf8"));
  const res = computeTrend(raw.series);
  assert.equal(res.stats.significant_5pct, false);
  assert.equal(res.stats.trend, "no trend");
  assert.ok(res.stats.p_value > 0.05);
});

test("toCsv produces header plus all series rows", () => {
  const raw = JSON.parse(fs.readFileSync(path.join(cacheDir, "trend_campinas_T2M.json"), "utf8"));
  const csv = toCsv(raw.series, raw.unit);
  const lines = csv.trim().split("\n");
  assert.equal(lines.length, 505);
  assert.equal(lines[0], "month,value (°C),sen_fit");
});

test("humanVerdict gives plain-English positive and null verdicts", () => {
  const rawT2M = JSON.parse(fs.readFileSync(path.join(cacheDir, "trend_campinas_T2M.json"), "utf8"));
  const rawWS = JSON.parse(fs.readFileSync(path.join(cacheDir, "trend_campinas_WS2M.json"), "utf8"));
  const v1 = humanVerdict(rawT2M.stats, "Campinas-SP", "2m Air Temperature", "°C");
  const v2 = humanVerdict(rawWS.stats, "Campinas-SP", "2m Wind Speed", "m/s");
  assert.equal(v1.tone, "sig");
  assert.ok(v1.headline.includes("rising significantly"));
  assert.equal(v2.tone, "null");
  assert.ok(v2.headline.includes("No significant trend"));
});
