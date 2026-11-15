import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  PLANETS,
  computeFrameDelta,
  computeGeotechnicalSlip,
  computeSolarYieldPct,
  computeThermalLoadPct,
  computeWindStress,
} from "../game/sim/planetaryPhysics.js";
import {
  PLANET_LIST,
  buildGameDeepLink,
  computeUnifiedMPTO,
  defaultParamsForPlanet,
  enrichFrontiersWithLiveState,
} from "./mptoEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../..");

test("PLANET_LIST includes all 5 planetary bodies from planetaryPhysics.js", () => {
  assert.equal(PLANET_LIST.length, 5);
  const ids = new Set(PLANET_LIST.map((p) => p.id));
  for (const k of Object.keys(PLANETS)) {
    assert.ok(ids.has(k), `Missing planet ${k} in PLANET_LIST`);
  }
});

test("computeUnifiedMPTO delegates strictly to planetaryPhysics equations", () => {
  for (const pl of PLANET_LIST) {
    const defaults = defaultParamsForPlanet(pl.id);
    const out = computeUnifiedMPTO({ ...defaults, tau: 0.9, windMs: 3.4, slope: 0.1 });

    const expectedPv = computeSolarYieldPct({
      irradianceNorm: defaults.irradianceNorm,
      tau: 0.9,
      soilingPct: defaults.soilingPct,
      wingsMode: defaults.wingsMode,
      planet: { ...pl, albedoIrGain: defaults.albedoIr / 100 },
      onCraterRim: defaults.onCraterRim,
    });
    assert.equal(out.pvYieldPct, expectedPv);

    const expectedT = computeThermalLoadPct({
      irradianceNorm: defaults.irradianceNorm,
      tau: 0.9,
      planet: { ...pl, cpDust: defaults.cpDust },
      wingsMode: defaults.wingsMode,
      inShadow: defaults.inShadow,
      tethered: defaults.tethered,
    });
    assert.equal(out.thermalLoadPct, expectedT);

    const expectedWind = computeWindStress({
      windMs: 3.4,
      planet: pl,
      wingsMode: defaults.wingsMode,
      mastRaised: defaults.mastRaised,
      inShelter: defaults.inShelter,
    });
    assert.equal(out.windStress, expectedWind);
  }
});

test("Moon vacuum enforces zero wind drag even at extreme gust velocities", () => {
  const moonOut = computeUnifiedMPTO({ planetId: "moon_artemis", windMs: 14.0 });
  assert.equal(moonOut.windStress, 0);
  assert.equal(moonOut.windStatus, "vacuum");

  const marsDanger = computeUnifiedMPTO({
    planetId: "mars_jezero",
    windMs: 5.2,
    wingsMode: "open",
    mastRaised: true,
    inShelter: false,
  });
  assert.ok(marsDanger.windStress >= 1.0);
  assert.equal(marsDanger.windStatus, "danger");

  const marsSheltered = computeUnifiedMPTO({
    planetId: "mars_jezero",
    windMs: 5.2,
    wingsMode: "stowed",
    mastRaised: false,
    inShelter: true,
  });
  assert.ok(marsSheltered.windStress < 0.2);
  assert.equal(marsSheltered.windStatus, "calm");
});

test("Geotechnical 64 m inversion distinguishes compact_basalt, lunar_regolith, terrestrial_loam & eolian_sand", () => {
  const sand = computeUnifiedMPTO({ planetId: "mars_jezero", terrainProfile: "eolian_sand", slope: 0.05 });
  assert.equal(sand.geotechnical.tauC_Pa, 24);
  assert.equal(sand.geotechnical.energyDistanceMult, 1.8);
  assert.ok(sand.geotechnical.wheelSlipPct >= 44);

  const basalt = computeUnifiedMPTO({ planetId: "mars_jezero", terrainProfile: "compact_basalt", slope: 0 });
  assert.equal(basalt.geotechnical.tauC_Pa, 85);
  assert.equal(basalt.geotechnical.energyDistanceMult, 1.0);
  assert.ok(sand.roverMoveDrainPctSec > basalt.roverMoveDrainPctSec);

  const moonAuto = computeGeotechnicalSlip({ missionId: "M5", planet: PLANETS.moon_artemis, onRidge: false });
  assert.equal(moonAuto.profileId, "lunar_regolith");
  assert.equal(moonAuto.energyDistanceMult, 1.15);

  const earthAuto = computeGeotechnicalSlip({ missionId: "M1", planet: PLANETS.earth_ne, onRidge: false });
  assert.equal(earthAuto.profileId, "terrestrial_loam");
  assert.equal(earthAuto.tauC_Pa, 62);
});

test("Optical quality filter isolates sentinel 999999999.0 spikes cleanly", () => {
  const withSentinel = computeUnifiedMPTO({
    planetId: "mars_jezero",
    prevTau: 0.5,
    currTau: 0.6,
    speedNorm: 0,
    sentinelActive: true,
  });
  assert.equal(withSentinel.optical.rawSensorValue, 999999999.0);
  assert.equal(withSentinel.optical.rawDelta, 1.0);
  assert.ok(withSentinel.optical.sanitizedDelta < 0.25);
  assert.equal(
    withSentinel.optical.sanitizedDelta,
    computeFrameDelta({ prevTau: 0.5, currTau: 0.6, speedNorm: 0, sentinelActive: true, sanitized: true })
  );
});

test("enrichFrontiersWithLiveState binds all 7 frozen space_analog.json frontiers cleanly", () => {
  const cached = JSON.parse(
    fs.readFileSync(path.join(ROOT, "frontend", "public", "cache", "space_analog.json"), "utf8")
  );
  const hotSand = computeUnifiedMPTO({
    planetId: "mars_jezero",
    tau: 0.2,
    cpDust: 1.05,
    irradianceNorm: 1.0,
    wingsMode: "open",
    terrainProfile: "eolian_sand",
    windMs: 5.0,
    sentinelActive: true,
  });
  const enrichedPt = enrichFrontiersWithLiveState(cached.mpto_frontiers, hotSand, "pt");
  assert.equal(enrichedPt.length, 7);
  for (const item of enrichedPt) {
    assert.ok(["nominal", "watch", "critical"].includes(item.liveLevel));
    assert.ok(item.liveMetric.length > 0);
    assert.ok(item.liveNote.length > 0);
    assert.ok(item.liveTone.startsWith("var(--"));
  }
  // Frontier 1 (T^4) and Frontier 5 (Wh/km) should escalate to critical under hot clear sky + eolian sand
  assert.equal(enrichedPt[0].liveLevel, "critical");
  assert.equal(enrichedPt[4].liveLevel, "critical");
});

test("buildGameDeepLink builds deterministic query strings for GamePage", () => {
  const url = buildGameDeepLink({
    missionId: "M5",
    planetId: "moon_artemis",
    depth: "specialist",
    tau: 0.45,
  });
  assert.equal(url, "/game?mission=M5&planet=moon_artemis&depth=specialist&tau=0.45");
});

test("computeAgentOrchestration fuses all 7 MPTO agents, Statistical Auditor & VCE FPGA cues", () => {
  const sandAlert = computeUnifiedMPTO({
    planetId: "mars_jezero",
    terrainProfile: "eolian_sand",
    slope: 0.1,
    windMs: 5.0,
    wingsMode: "open",
    mastRaised: true,
    inShelter: false,
  });
  const orch = sandAlert.orchestration;
  assert.equal(orch.agents.length, 7);
  for (const agent of orch.agents) {
    assert.ok(agent.vote >= 0 && agent.vote <= 1);
    assert.ok(agent.frontierId >= 1 && agent.frontierId <= 7);
  }
  assert.ok(orch.activeVetoes.includes("Grok Cratera"));
  assert.ok(orch.activeVetoes.includes("Storm Watcher"));
  assert.equal(orch.status, "critical");
  assert.match(orch.auditorRule.statusEn, /WS2M/);
});
