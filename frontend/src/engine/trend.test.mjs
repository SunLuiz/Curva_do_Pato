import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { computeTrend, toCsv, humanVerdict, probeBackend } from "./trend.js";
import { parsePowerMonthlySeries, fetchPowerTrendPayload } from "./powerCors.js";

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

test("probeBackend surfaces JSON reason cleanly on 200 offline_snapshot and 503 without HTTP noise", async () => {
  const makeRes = (status, body, ct = "application/json") => ({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (k) => (k.toLowerCase() === "content-type" ? ct : "") },
    json: async () => body,
  });

  const snap200 = await probeBackend("", 2000, async () =>
    makeRes(200, { status: "offline_snapshot", reason: "open zero-key browser mode (no FastAPI backend attached)" })
  );
  assert.equal(snap200.live, false);
  assert.match(snap200.reason, /open zero-key browser mode/);

  const snap503 = await probeBackend("", 2000, async () =>
    makeRes(503, { status: "offline_snapshot", reason: "static snapshot mode" })
  );
  assert.equal(snap503.live, false);
  assert.equal(snap503.reason, "static snapshot mode");

  const okLive = await probeBackend("", 2000, async () =>
    makeRes(200, { status: "ok", service: "FastAPI-Live" })
  );
  assert.equal(okLive.live, true);
  assert.equal(okLive.service, "FastAPI-Live");

  const htmlRewrite = await probeBackend("", 2000, async () =>
    makeRes(200, {}, "text/html")
  );
  assert.equal(htmlRewrite.live, false);
  assert.match(htmlRewrite.reason, /static SPA rewrite/);
});

test("powerCors parses NASA POWER monthly rows, drops YYYY13/-999, and computes custom trend", async () => {
  const parsed = parsePowerMonthlySeries(
    {
      ALLSKY_SFC_SW_DWN: { "202001": 18, "202002": -999, "202013": 19 },
      CLRSKY_SFC_SW_DWN: { "202001": 24, "202002": 25, "202013": 24.5 },
    },
    "CLOUD_ATTEN_PCT"
  );
  assert.deepEqual(parsed, [{ t: "2020-01", v: 25 }]);

  const paramValues = {};
  for (let y = 1990; y <= 2015; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      paramValues[`${y}${String(m).padStart(2, "0")}`] = 17 + (y - 1990) * 0.08 + m * 0.1;
    }
    paramValues[`${y}13`] = 18;
  }

  const payload = await fetchPowerTrendPayload({
    lat: -23.55,
    lon: -46.63,
    variable: "ALLSKY_SFC_SW_DWN",
    fetchImpl: async (url) => {
      assert.match(url, /community=AG/);
      assert.match(url, /latitude=-23\.5500/);
      return {
        ok: true,
        status: 200,
        json: async () => ({ properties: { parameter: { ALLSKY_SFC_SW_DWN: paramValues } } }),
      };
    },
  });
  assert.equal(payload._transport, "live_cors");
  assert.equal(payload.unit, "MJ/m²/day");
  assert.equal(payload.stats.significant_5pct, true);
  assert.equal(payload.series.length, 312);

  await assert.rejects(
    () => fetchPowerTrendPayload({ lat: 999, lon: 0, fetchImpl: async () => ({}) }),
    /Invalid coordinates/
  );
});
