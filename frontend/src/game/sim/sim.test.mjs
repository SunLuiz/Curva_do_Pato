import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  IMPULSE_CALIBRATION_PROFILES,
  PLANETS,
  computeFrameDelta,
  computeGeotechnicalSlip,
  computeSolarYieldPct,
  computeThermalLoadPct,
  computeWindStress,
} from "./planetaryPhysics.js";
import { terrainHeight, findZonesAt } from "./terrainField.js";
import { AUDITED_PARAMS, MISSION_ORDER, generateMissionTelemetry } from "../missions/missionParams.js";
import { computeOraclePolicy, evaluateMissionOutcome } from "./oracle.js";
import { createMissionRuntime, stepSimulation, triggerRoverAction } from "./roverSimulation.js";
import { loadProfile, saveProfile } from "../../academy/storage.js";
import {
  OCARINA_MELODIES,
  OCARINA_N64_PADS,
  computeCurveAudioParams,
  computeProximityAudioParams,
  computeWindAudioParams,
} from "../soundEngine.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../../../..");

test("AUDITED_PARAMS matches baked mission_params.json and frozen cache stats", () => {
  const bakedPath = path.join(ROOT, "frontend", "public", "game", "data", "mission_params.json");
  const baked = JSON.parse(fs.readFileSync(bakedPath, "utf8"));

  assert.equal(baked.power_ne_hourly.stats.sw_max, AUDITED_PARAMS.power_ne_hourly.swMax);
  assert.equal(baked.meda_sol40_wind.sentinel_count, AUDITED_PARAMS.meda_sol40_wind.sentinelCount);
  assert.equal(baked.meda_sol40_wind.stats.max, AUDITED_PARAMS.meda_sol40_wind.max);
  assert.equal(baked.meda_sol1100_rad.rows_count, AUDITED_PARAMS.meda_sol1100_rad.rowsCount);
  assert.equal(baked.space_and_fires.donki.count, AUDITED_PARAMS.space.donkiCount);

  const wsCampinas = JSON.parse(
    fs.readFileSync(path.join(ROOT, "frontend", "public", "cache", "trend_campinas_WS2M.json"), "utf8")
  );
  assert.equal(wsCampinas.stats.p_value, AUDITED_PARAMS.trends.campinas_WS2M.pValue);
  assert.equal(wsCampinas.stats.significant_5pct, false);

  const allSkyCampinas = JSON.parse(
    fs.readFileSync(
      path.join(ROOT, "frontend", "public", "cache", "trend_campinas_ALLSKY_SFC_SW_DWN.json"),
      "utf8"
    )
  );
  assert.equal(allSkyCampinas.stats.p_value, AUDITED_PARAMS.trends.campinas_ALLSKY.pValue);
});

test("Planetary context vector Θ scales physics cleanly across Earth, Mars, and Moon", () => {
  // Moon vacuum has zero aerodynamic drag even under high nominal wind parameter
  assert.equal(
    computeWindStress({ windMs: 10, planet: PLANETS.moon_artemis, wingsMode: "open", mastRaised: true }),
    0
  );
  // Stowing wings + lowering mast + shelter drastically cuts Mars wind stress
  const exposed = computeWindStress({
    windMs: 5.0,
    planet: PLANETS.mars_jezero,
    wingsMode: "open",
    mastRaised: true,
    inShelter: false,
  });
  const sheltered = computeWindStress({
    windMs: 5.0,
    planet: PLANETS.mars_jezero,
    wingsMode: "stowed",
    mastRaised: false,
    inShelter: true,
  });
  assert.ok(exposed > 1.0 && sheltered < 0.15);

  // Crater rim IR albedo increases Moon yield by ~13%
  const offRim = computeSolarYieldPct({ irradianceNorm: 0.8, tau: 0.05, planet: PLANETS.moon_artemis, onCraterRim: false });
  const onRim = computeSolarYieldPct({ irradianceNorm: 0.8, tau: 0.05, planet: PLANETS.moon_artemis, onCraterRim: true });
  assert.ok(onRim > offRim);

  // T^4 radiator saturates >= 82% at peak sunlight unless shaded/stowed/tethered
  const hot = computeThermalLoadPct({ irradianceNorm: 0.95, tau: 0.22, planet: PLANETS.earth_ne, wingsMode: "open" });
  const shaded = computeThermalLoadPct({
    irradianceNorm: 0.95,
    tau: 0.22,
    planet: PLANETS.earth_ne,
    wingsMode: "open",
    inShadow: true,
  });
  assert.ok(hot >= 82 && shaded < 75);

  // Frame delta t-1 -> t increases with rover speed and sentinel glitch
  const stillDelta = computeFrameDelta({ prevTau: 0.5, currTau: 0.5, speedNorm: 0 });
  const fastDelta = computeFrameDelta({ prevTau: 0.5, currTau: 0.5, speedNorm: 1 });
  assert.ok(fastDelta > stillDelta);
});

test("Telemetry generation is deterministic by seed across all 5 missions", () => {
  for (const id of MISSION_ORDER) {
    const a = generateMissionTelemetry(id, { severity: "P90", seed: 777 });
    const b = generateMissionTelemetry(id, { severity: "P90", seed: 777 });
    assert.deepEqual(a, b);
    assert.ok(a.length >= 50);
    const oracle = computeOraclePolicy(id, a);
    assert.ok(oracle.length >= 2, `${id} should emit >= 2 oracle actions`);
  }
});

test("M2 Wind Shelter fails when unsheltered and wins when wind-cleaned + sheltered + stowed", () => {
  // Unmitigated failure case
  const failRun = createMissionRuntime({ missionId: "M2", severity: "P99", seed: 2026 });
  for (let i = 0; i < 560 && failRun.status === "playing"; i += 1) {
    stepSimulation(failRun, { throttle: 0, steer: 0 }, 0.1);
  }
  assert.equal(failRun.status, "lost");
  assert.ok(failRun.outcome.stars === 0);

  // Skilled play case: tilt [3] during gentle wind, then drive to shelter_rock (-17, 12), fold [1] & lower [2]
  const winRun = createMissionRuntime({ missionId: "M2", severity: "P90", seed: 2026 });
  let cleaned = false;
  let sheltered = false;
  for (let i = 0; i < 620 && winRun.status === "playing"; i += 1) {
    if (!cleaned && winRun.tickIndex >= 9) {
      triggerRoverAction(winRun, "TILT_PANELS");
      cleaned = true;
    }
    if (winRun.tickIndex >= 23 && !sheltered) {
      // Move directly inside shelter_rock zone and stow
      winRun.rover.x = -17;
      winRun.rover.z = 12;
      triggerRoverAction(winRun, "TOGGLE_WINGS"); // stow
      triggerRoverAction(winRun, "TOGGLE_MAST"); // lower
      sheltered = true;
    }
    if (winRun.tickIndex >= 47 && winRun.rover.wingsMode === "stowed") {
      triggerRoverAction(winRun, "TOGGLE_WINGS"); // reopen to keep battery healthy
    }
    stepSimulation(winRun, { throttle: 0, steer: 0 }, 0.1);
  }
  assert.equal(winRun.status, "won");
  assert.ok(winRun.progress.gustSurvived);
  assert.ok(winRun.outcome.stars >= 2 && winRun.outcome.xp > 0);
});

test("M4 Falsification rejects Cloud Cover trap and passes on Clear-Sky Aerosol driver", () => {
  const run = createMissionRuntime({ missionId: "M4", seed: 2026 });
  // Sample 2 decades via mast [2]
  run.rover.x = -16;
  run.rover.z = 12;
  triggerRoverAction(run, "TOGGLE_MAST");
  run.rover.x = 0;
  run.rover.z = -12;
  triggerRoverAction(run, "TOGGLE_MAST");
  assert.equal(run.progress.sampledDecades.length, 2);

  // Wrong choice: Cloud station
  run.rover.x = 17;
  run.rover.z = -18;
  triggerRoverAction(run, "COUPLE_DISPATCH");
  assert.equal(run.progress.wrongSubmissions, 1);
  assert.equal(run.status, "playing");
  assert.ok(run.resources.integrity < 100);

  // Right choice: Aerosol / Clear-Sky station
  run.rover.x = -15;
  run.rover.z = -18;
  triggerRoverAction(run, "COUPLE_DISPATCH");
  assert.equal(run.status, "won");
  assert.ok(run.progress.driverChosen);
});

test("Terrain heightfield & zone lookup are well-formed and bounded", () => {
  for (const id of MISSION_ORDER) {
    const h = terrainHeight(id, 0, 0);
    assert.ok(Number.isFinite(h));
  }
  const zones = findZonesAt("M3", 8, -4);
  assert.ok(zones.some((z) => z.id === "crater_alpha" && z.kind === "hazard"));
  const outcome = evaluateMissionOutcome({ won: true, attempt: 1, usedHint: false, integrity: 95, battery: 80, bonusScore: 95, streak: 2 });
  assert.equal(outcome.stars, 3);
  assert.equal(outcome.grade, "GOLD");
});

test("M1 Solar Duck, M3 Sentinel/Beacon, and M5 Conjugated Storm play cleanly to win", () => {
  // M1: dock BESS during midday peak, then reopen wings for evening ramp
  const m1 = createMissionRuntime({ missionId: "M1", seed: 2026 });
  let docked = false;
  let reopened = false;
  for (let i = 0; i < 580 && m1.status === "playing"; i += 1) {
    if (!docked && m1.tickIndex >= 16) {
      m1.rover.x = 16;
      m1.rover.z = -10;
      triggerRoverAction(m1, "COUPLE_DISPATCH");
      docked = true;
    }
    if (!reopened && m1.tickIndex >= 40) {
      m1.rover.x = 18;
      m1.rover.z = 18;
      if (m1.rover.wingsMode === "stowed") triggerRoverAction(m1, "TOGGLE_WINGS");
      reopened = true;
    }
    stepSimulation(m1, { throttle: 0, steer: 0 }, 0.1);
  }
  assert.equal(m1.status, "won");
  assert.ok(m1.progress.peakHandled);

  // M3: purge sentinel glitch [4], bypass Alpha crater, dock Beacon [5]
  const m3 = createMissionRuntime({ missionId: "M3", seed: 2026 });
  for (let i = 0; i < 200 && m3.status === "playing"; i += 1) {
    if (m3.telemetry.sentinelPending) {
      triggerRoverAction(m3, "SANITIZE_OPTICS");
    }
    stepSimulation(m3, { throttle: 0, steer: 0 }, 0.1);
  }
  assert.ok(m3.progress.sentinelsPurged >= 1);
  m3.rover.x = 20;
  m3.rover.z = -20;
  triggerRoverAction(m3, "COUPLE_DISPATCH");
  assert.equal(m3.status, "won");

  // M5: Crater rim IR harvest -> Greenhouse [5] -> Lava tube stow [1][2]
  const m5 = createMissionRuntime({ missionId: "M5", seed: 2026 });
  let stepDone = 0;
  for (let i = 0; i < 650 && m5.status === "playing"; i += 1) {
    if (stepDone === 0) {
      m5.rover.x = -18;
      m5.rover.z = -14;
      stepDone = 1;
    } else if (stepDone === 1 && m5.tickIndex >= 12) {
      m5.rover.x = 15;
      m5.rover.z = 10;
      triggerRoverAction(m5, "COUPLE_DISPATCH");
      stepDone = 2;
    } else if (stepDone === 2 && m5.tickIndex >= 28) {
      m5.rover.x = 0;
      m5.rover.z = -22;
      triggerRoverAction(m5, "TOGGLE_WINGS");
      triggerRoverAction(m5, "TOGGLE_MAST");
      stepDone = 3;
    }
    stepSimulation(m5, { throttle: 0, steer: 0 }, 0.1);
  }
  assert.equal(m5.status, "won");
  assert.ok(m5.progress.rimHarvested && m5.progress.greenhouseSecured && m5.progress.lavaTubeSheltered);
});

test("Storage safely upgrades legacy profile without game field and computes game badges", () => {
  const mem = new Map();
  const fakeStorage = {
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => mem.set(k, v),
    removeItem: (k) => mem.delete(k),
  };
  fakeStorage.setItem(
    "cockpit-omni/detective/v1",
    JSON.stringify({ name: "Pilot", xp: 120, stars: 4, mastery: { M1: { passed: true, score: 0.9 } } })
  );
  const loaded = loadProfile(fakeStorage);
  assert.equal(loaded.xp, 120);
  assert.ok(loaded.game && typeof loaded.game.missions === "object");

  loaded.game.missions.M2 = { won: true, stars: 3 };
  const saved = saveProfile(loaded, fakeStorage);
  assert.ok(saved.game.badges.includes("martian-wind-shelter"));
});

test("Active Impulse-Response geotechnical slip calibration (>40% slip & 1.8x Wh/km) avoids exponential speed decay", () => {
  const sandGeo = computeGeotechnicalSlip({
    missionId: "M3",
    planet: PLANETS.mars_jezero,
    inHazard: true,
    onRidge: false,
    slope: 0.05,
  });
  assert.ok(sandGeo.wheelSlipPct >= 42);
  assert.ok(sandGeo.tractionFactor <= 0.58);
  assert.equal(sandGeo.energyDistanceMult, 1.8);
  assert.equal(sandGeo.tauC_Pa, IMPULSE_CALIBRATION_PROFILES.eolian_sand.tauC_Pa);
  assert.equal(sandGeo.grainSizeUm, IMPULSE_CALIBRATION_PROFILES.eolian_sand.grainSizeUm);

  const basaltGeo = computeGeotechnicalSlip({
    missionId: "M3",
    planet: PLANETS.mars_jezero,
    inHazard: false,
    onRidge: true,
    slope: 0,
  });
  assert.equal(basaltGeo.energyDistanceMult, 1.0);
  assert.equal(basaltGeo.tauC_Pa, 85);
  assert.equal(basaltGeo.grainSizeUm, 40);

  // Runtime starts with populated tauC_Pa and grainSizeUm
  const m3Haz = createMissionRuntime({ missionId: "M3", seed: 2026 });
  assert.equal(m3Haz.rover.tauC_Pa, 85);
  assert.equal(m3Haz.rover.grainSizeUm, 40);

  // Place one rover inside Crater Alpha hazard (8, -4) and one on Safe Plateau (-14, -10)
  const m3Safe = createMissionRuntime({ missionId: "M3", seed: 2026 });
  m3Haz.rover.x = 8;
  m3Haz.rover.z = -4;
  m3Haz.rover.heading = Math.PI / 2;
  m3Safe.rover.x = -14;
  m3Safe.rover.z = -10;
  m3Safe.rover.heading = -Math.PI / 2;

  for (let i = 0; i < 16; i += 1) {
    stepSimulation(m3Haz, { throttle: 1, steer: 0 }, 0.05);
    stepSimulation(m3Safe, { throttle: 1, steer: 0 }, 0.05);
  }

  // Motor wheel speed stays responsive (not exponentially crushed toward 0), while effective ground speed slips >= 42%
  assert.ok(m3Haz.rover.speed > 7.5, `Expected non-stalled wheel speed, got ${m3Haz.rover.speed}`);
  assert.ok(m3Haz.rover.effectiveSpeed <= m3Haz.rover.speed * 0.58);
  assert.ok(m3Haz.rover.wheelSlipPct >= 42);
  assert.equal(m3Haz.rover.energyCostMult, 1.8);
  assert.equal(m3Haz.rover.tauC_Pa, 24);
  assert.ok(
    m3Haz.resources.battery < m3Safe.resources.battery,
    `Expected higher drain in Crater Alpha (${m3Haz.resources.battery}) vs Safe Plateau (${m3Safe.resources.battery})`
  );

  // tauOverride propagates cleanly from Cockpit Space tab deep links
  const customTauRun = createMissionRuntime({ missionId: "M5", planetId: "mars_jezero", tauOverride: 2.35, seed: 2026 });
  assert.equal(customTauRun.planet.baseTau, 2.35);
  assert.equal(customTauRun.planetId, "mars_jezero");
});

test("Ocarina synth, chart sonification, planetary wind & proximity sonar map telemetry physics", () => {
  // 5 classical N64 Ocarina notes + 3 built-in melodies
  assert.equal(OCARINA_N64_PADS.length, 5);
  assert.deepEqual(
    OCARINA_N64_PADS.map((p) => p.note),
    ["D5", "F5", "A5", "B5", "D6"]
  );
  for (const key of ["title", "lullaby", "time"]) {
    assert.ok(OCARINA_MELODIES[key].length >= 8);
    for (const [freq, dur] of OCARINA_MELODIES[key]) {
      assert.ok(freq > 400 && dur > 0);
    }
  }

  // Rising curve near threshold accelerates BPM, shortens step interval, raises pitch & gain
  const calm = computeCurveAudioParams({ normVal: 0.1, slope: -0.5, nearThreshold: false });
  const spike = computeCurveAudioParams({ normVal: 0.9, slope: 0.85, nearThreshold: true });
  assert.ok(spike.bpm > calm.bpm, `Expected rising BPM (${spike.bpm}) > calm (${calm.bpm})`);
  assert.ok(spike.stepIntervalSec < calm.stepIntervalSec);
  assert.ok(spike.baseFreqHz > calm.baseFreqHz);
  assert.ok(spike.gainScale > calm.gainScale);
  assert.ok(spike.filterCutoffHz > calm.filterCutoffHz);
  assert.ok(spike.vibratoHz > calm.vibratoHz);

  // Vacuum Moon has zero wind noise; Mars/Earth wind attenuates inside Shelter
  const moonVacuum = computeWindAudioParams({ windMs: 9.5, rho: 0, sheltered: false });
  assert.equal(moonVacuum.active, false);
  assert.equal(moonVacuum.windGain, 0);

  const marsExposed = computeWindAudioParams({ windMs: 4.5, rho: PLANETS.mars_jezero.rho, sheltered: false });
  const marsSheltered = computeWindAudioParams({ windMs: 4.5, rho: PLANETS.mars_jezero.rho, sheltered: true });
  assert.equal(marsExposed.active, true);
  assert.ok(marsExposed.windGain > marsSheltered.windGain * 2.5);

  // Target distance sonar speeds up and raises pitch closer to goal; slip>=30 triggers traction alert
  const far = computeProximityAudioParams({ targetDist: 44, speed: 4.0, slipPct: 8 });
  const near = computeProximityAudioParams({ targetDist: 4, speed: 3.5, slipPct: 44 });
  assert.ok(near.pingIntervalSec < far.pingIntervalSec);
  assert.ok(near.pingFreqHz > far.pingFreqHz);
  assert.ok(near.pingGain > far.pingGain);
  assert.equal(far.highSlip, false);
  assert.equal(near.highSlip, true);
  assert.ok(near.slipGain > far.slipGain);
});
