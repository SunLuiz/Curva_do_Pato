/**
 * Pure JavaScript 3D Rover Simulation & Mission State Machine.
 * Zero React or Three.js dependencies — runs identically in browser rAF and Node tests.
 */

import {
  PLANETS,
  computeFrameDelta,
  computeMoveDrainPerSec,
  computeSolarYieldPct,
  computeThermalLoadPct,
  computeWindStress,
  getPlanet,
} from "./planetaryPhysics.js";
import {
  clampToArena,
  findZonesAt,
  getMissionZones,
  terrainHeight,
  terrainNormal,
  terrainSlopeRatio,
} from "./terrainField.js";
import { MISSION_DEFS, generateMissionTelemetry } from "../missions/missionParams.js";
import { computeOraclePolicy, evaluateMissionOutcome } from "./oracle.js";

export function createMissionRuntime({
  missionId = "M2",
  planetId = null,
  depth = "explorer",
  severity = "P90",
  dropoutRate = null,
  seed = 2026,
  attempt = 1,
  usedHint = false,
  streak = 0,
} = {}) {
  const def = MISSION_DEFS[missionId] || MISSION_DEFS.M2;
  const resolvedPlanetId = planetId || def.defaultPlanet;
  const planet = getPlanet(resolvedPlanetId);
  const timeline = generateMissionTelemetry(missionId, { severity, dropoutRate, seed });
  const oraclePins = computeOraclePolicy(missionId, timeline);
  const zones = getMissionZones(missionId);
  const start = def.startPos || { x: 0, z: 0, heading: 0 };
  const startY = terrainHeight(missionId, start.x, start.z);

  return {
    missionId,
    planetId: planet.id,
    planet,
    depth,
    severity,
    seed,
    attempt,
    usedHint,
    streak,
    status: "playing", // playing | won | lost
    failReason: null,
    paused: false,
    elapsedSec: 0,
    tickIndex: 0,
    tickAccumSec: 0,
    tickDurationSec: def.tickDurationSec,
    timeline,
    visibleSeries: timeline.slice(0, 1),
    oraclePins,
    zones,
    rover: {
      x: start.x,
      y: startY,
      z: start.z,
      heading: start.heading,
      speed: 0,
      pitch: 0,
      roll: 0,
      wingsMode: "open", // open | stowed | tilted
      mastRaised: true,
      tethered: false,
      tetherZoneId: null,
      sanitizePulseSec: 0,
      inZones: [],
      roverStillSec: 0,
    },
    resources: {
      battery: 68,
      integrity: 100,
      thermalLoad: 38,
      soiling: missionId === "M2" ? 48 : 14,
      socBio: 64,
      frameDelta: 0.08,
      windStress: 0,
      solarYieldPct: 60,
    },
    telemetry: {
      sentinelPending: false,
      sentinelClearTimer: 0,
      prevTau: timeline[0]?.tau ?? 0.4,
      currentPoint: timeline[0],
      revealedSeasonalMk: false,
    },
    progress: {
      peakHandled: false,
      eveningRecovered: false,
      windCleaned: false,
      gustSurvived: false,
      gustStarted: false,
      sentinelsPurged: 0,
      dustStabilized: false,
      beaconDocked: false,
      sampledDecades: [],
      driverChosen: false,
      rimHarvested: false,
      greenhouseSecured: false,
      lavaTubeSheltered: false,
      wrongSubmissions: 0,
    },
    alert: {
      level: "info", // info | warn | danger | success
      code: "MISSION_START",
      textEn: def.en.objectiveShort,
      textPt: def.pt.objectiveShort,
      countdownSec: null,
      targetZoneId: zones[0]?.id || null,
    },
    actionLog: [],
    outcome: null,
  };
}

function logAction(state, action, labelEn, labelPt) {
  state.actionLog.push({
    t: state.tickIndex,
    sec: Number(state.elapsedSec.toFixed(1)),
    action,
    labelEn,
    labelPt,
    x: Number(state.rover.x.toFixed(1)),
    z: Number(state.rover.z.toFixed(1)),
  });
}

function resolveTargetZone(state) {
  const { missionId, progress, tickIndex } = state;
  if (missionId === "M1") {
    if (!progress.peakHandled && tickIndex >= 14) return "bess_station";
    if (tickIndex >= 36 && !progress.eveningRecovered) return "sun_ridge";
    return "bess_station";
  }
  if (missionId === "M2") {
    if (!progress.windCleaned && tickIndex < 23) return "wind_ridge";
    if (!progress.gustSurvived) return "shelter_rock";
    return "crater_shelter";
  }
  if (missionId === "M3") {
    if (!progress.beaconDocked) return "landing_beacon";
    return "safe_plateau";
  }
  if (missionId === "M4") {
    const remaining = ["sample_1984", "sample_2005", "sample_2025"].find(
      (id) => !progress.sampledDecades.includes(id)
    );
    if (remaining) return remaining;
    return "aerosol_station";
  }
  if (missionId === "M5") {
    if (!progress.rimHarvested) return "crater_rim";
    if (!progress.greenhouseSecured) return "greenhouse_soc";
    return "lava_tube";
  }
  return null;
}

/**
 * Handles discrete engineering commands [1]..[5] from keyboard or HUD buttons.
 */
export function triggerRoverAction(state, code) {
  if (state.status !== "playing" || state.paused) return state;

  const { rover, progress, resources, telemetry, missionId } = state;
  const activeZones = findZonesAt(missionId, rover.x, rover.z);

  if (code === "TOGGLE_WINGS") {
    // [1] Open <-> Stowed
    rover.wingsMode = rover.wingsMode === "stowed" ? "open" : "stowed";
    if (rover.wingsMode === "stowed") {
      rover.tethered = false;
      rover.tetherZoneId = null;
    }
    logAction(
      state,
      rover.wingsMode === "stowed" ? "STOW_WINGS" : "OPEN_WINGS",
      rover.wingsMode === "stowed" ? "Folded Solar Wings [1]" : "Opened Solar Wings [1]",
      rover.wingsMode === "stowed" ? "Recolheu Asas [1]" : "Abriu Asas [1]"
    );
  } else if (code === "TOGGLE_MAST") {
    // [2] Lower suspension / Hunker Down <-> Raise mast & sample
    rover.mastRaised = !rover.mastRaised;
    logAction(
      state,
      rover.mastRaised ? "RAISE_MAST" : "LOWER_MAST",
      rover.mastRaised ? "Raised Mast/Suspension [2]" : "Hunkered Down [2]",
      rover.mastRaised ? "Ergueu Mastro [2]" : "Abaixou Suspensão [2]"
    );
    // M4 Decade sampling when pressing [2] inside a sample zone
    if (missionId === "M4") {
      const sampleZone = activeZones.find((z) => z.kind === "sample");
      if (sampleZone && !progress.sampledDecades.includes(sampleZone.id)) {
        rover.mastRaised = true;
        progress.sampledDecades.push(sampleZone.id);
        if (progress.sampledDecades.length >= 2) {
          telemetry.revealedSeasonalMk = true;
        }
        logAction(
          state,
          "SAMPLE_DECADE",
          `Sampled ${sampleZone.decade} (Seasonal MK)`,
          `Coletou ${sampleZone.decade} (MK Sazonal)`
        );
      }
    }
  } else if (code === "TILT_PANELS") {
    // [3] Tilt 35 deg for wind-cleaning / solar angle
    rover.wingsMode = rover.wingsMode === "tilted" ? "open" : "tilted";
    logAction(
      state,
      "TILT_PANELS",
      rover.wingsMode === "tilted" ? "Tilted Panels 35° [3]" : "Reset Panel Angle [3]",
      rover.wingsMode === "tilted" ? "Inclinou Painéis 35° [3]" : "Alinhou Painéis [3]"
    );
  } else if (code === "SANITIZE_OPTICS") {
    // [4] Purge 999999999.0 sentinel & clean lens
    rover.sanitizePulseSec = 1.8;
    if (telemetry.sentinelPending) {
      telemetry.sentinelPending = false;
      telemetry.sentinelClearTimer = 0;
      progress.sentinelsPurged += 1;
      resources.soiling = Math.max(0, resources.soiling - 10);
      logAction(
        state,
        "PURGE_SENTINEL",
        "Purged 999999999.0 Sentinel [4]",
        "Filtrou Sentinela 999999999.0 [4]"
      );
    } else {
      resources.soiling = Math.max(0, resources.soiling - 6);
      logAction(state, "OPTIC_PULSE", "NavCam Lens Pulse [4]", "Pulso Óptico NavCam [4]");
    }
  } else if (code === "COUPLE_DISPATCH") {
    // [5] Contextual station dock / cable couple / attribution choice
    const dockable = activeZones.find((z) =>
      ["bess", "beacon", "hazard_choice"].includes(z.kind)
    );
    if (!dockable) {
      // Fallback: thermal compute throttle if not at a station
      rover.tethered = !rover.tethered;
      rover.tetherZoneId = null;
      logAction(
        state,
        "THERMAL_THROTTLE",
        "Toggled Compute Thermal Throttle [5]",
        "Alternou Curtailment Térmico [5]"
      );
      state.alert = {
        ...state.alert,
        level: "info",
        textEn: "Move inside a glowing Station pad to dock cable [5].",
        textPt: "Entre no anel brilhante de uma Estação para acoplar o cabo [5].",
      };
      return state;
    }

    if (missionId === "M1" && dockable.id === "bess_station") {
      rover.tethered = true;
      rover.tetherZoneId = dockable.id;
      progress.peakHandled = true;
      resources.thermalLoad = Math.max(25, resources.thermalLoad - 26);
      resources.battery = Math.min(100, resources.battery + 18);
      logAction(state, "DOCK_BESS", "Docked Regolith BESS [5]", "Acoplou BESS Regolito [5]");
    } else if (missionId === "M3" && dockable.id === "landing_beacon") {
      if (state.telemetry.sentinelPending) {
        state.alert = {
          ...state.alert,
          level: "warn",
          code: "PURGE_BEFORE_LOCK",
          textEn: "Purge active 999999999.0 glitch [4] before locking EDL Beacon [5]!",
          textPt: "Filtre a falha 999999999.0 [4] antes de travar o Farol EDL [5]!",
        };
        return state;
      }
      progress.beaconDocked = true;
      rover.tethered = true;
      rover.tetherZoneId = dockable.id;
      logAction(state, "DOCK_BEACON", "Locked EDL Landing Beacon [5]", "Travou Farol EDL [5]");
      finalizeWin(state);
    } else if (missionId === "M4") {
      if (progress.sampledDecades.length < 2) {
        state.alert = {
          ...state.alert,
          level: "warn",
          code: "NEED_SAMPLES",
          textEn: "Sample at least 2 decade poles [2] before choosing attribution!",
          textPt: "Colete ao menos 2 décadas [2] antes de escolher a causa!",
        };
        return state;
      }
      if (dockable.id === "aerosol_station") {
        progress.driverChosen = true;
        rover.tethered = true;
        rover.tetherZoneId = dockable.id;
        logAction(
          state,
          "PICK_AEROSOL",
          "Submitted Aerosol / Clear-Sky Driver [5]",
          "Confirmou Vetor Aerossol / Céu Limpo [5]"
        );
        finalizeWin(state);
      } else if (dockable.id === "cloud_station") {
        progress.wrongSubmissions += 1;
        resources.integrity = Math.max(0, resources.integrity - 22);
        logAction(
          state,
          "WRONG_CLOUD",
          "False Attribution: Cloud Cover (p=0.948 null)",
          "Falsa Atribuição: Nuvens (p=0,948 nulo)"
        );
        state.alert = {
          ...state.alert,
          level: "danger",
          code: "FALSIFICATION_FAIL",
          textEn: "Falsified! Campinas CLOUD_ATTEN_PCT has p=0.948 (no trend). Check Clear-Sky!",
          textPt: "Falsificado! Nuvens em Campinas têm p=0,948 (nulo). Verifique Céu Limpo!",
        };
        if (resources.integrity <= 0) {
          finalizeLoss(state, "Falsification errors depleted research integrity.");
        }
      }
    } else if (missionId === "M5" && dockable.id === "greenhouse_soc") {
      rover.tethered = true;
      rover.tetherZoneId = dockable.id;
      progress.greenhouseSecured = true;
      resources.socBio = Math.min(100, resources.socBio + 28);
      resources.battery = Math.max(15, resources.battery - 8);
      logAction(
        state,
        "DOCK_GREENHOUSE",
        "Stabilized OSD-615 SoC_bio [5]",
        "Estabilizou Estufa OSD-615 [5]"
      );
    }
  }

  return state;
}

function computeBonusScore(state) {
  const { missionId, progress } = state;
  if (missionId === "M1") {
    return (progress.peakHandled ? 60 : 0) + (progress.eveningRecovered ? 40 : 15);
  }
  if (missionId === "M2") {
    return (progress.windCleaned ? 40 : 0) + (progress.gustSurvived ? 60 : 0);
  }
  if (missionId === "M3") {
    return (
      Math.min(35, progress.sentinelsPurged * 18) +
      (progress.dustStabilized ? 30 : 0) +
      (progress.beaconDocked ? 35 : 0)
    );
  }
  if (missionId === "M4") {
    const sampleBonus = Math.min(45, progress.sampledDecades.length * 15);
    const cleanFalsification = progress.wrongSubmissions === 0 ? 25 : 5;
    return sampleBonus + (progress.driverChosen ? 30 : 0) + cleanFalsification;
  }
  if (missionId === "M5") {
    return (
      (progress.rimHarvested ? 35 : 0) +
      (progress.greenhouseSecured ? 35 : 0) +
      (progress.lavaTubeSheltered ? 30 : 0)
    );
  }
  return 50;
}

function finalizeWin(state) {
  if (state.status !== "playing") return;
  state.status = "won";
  const bonusScore = computeBonusScore(state);
  state.outcome = evaluateMissionOutcome({
    won: true,
    attempt: state.attempt,
    usedHint: state.usedHint,
    integrity: state.resources.integrity,
    battery: state.resources.battery,
    bonusScore,
    streak: state.streak,
  });
}

function finalizeLoss(state, reasonEn, reasonPt = reasonEn) {
  if (state.status !== "playing") return;
  state.status = "lost";
  state.failReason = { en: reasonEn, pt: reasonPt };
  state.outcome = evaluateMissionOutcome({
    won: false,
    attempt: state.attempt,
    usedHint: state.usedHint,
    integrity: state.resources.integrity,
    battery: state.resources.battery,
    bonusScore: computeBonusScore(state),
    streak: 0,
  });
}

/**
 * Advances simulation by dt seconds (clamped for tab-switch safety).
 * input = { throttle: -1..1, steer: -1..1 }
 */
export function stepSimulation(state, input = {}, rawDt = 1 / 60) {
  if (state.status !== "playing" || state.paused) return state;

  const dt = Math.min(0.1, Math.max(0.001, rawDt));
  const { rover, resources, telemetry, progress, planet, missionId } = state;

  state.elapsedSec += dt;
  if (rover.sanitizePulseSec > 0) {
    rover.sanitizePulseSec = Math.max(0, rover.sanitizePulseSec - dt);
  }

  // 1. Rover Kinematics on Heightfield
  const throttle = Math.max(-1, Math.min(1, input.throttle || 0));
  const steer = Math.max(-1, Math.min(1, input.steer || 0));
  const maxSpeed = rover.mastRaised ? 12.5 : 8.5; // Hunkered down drives steadier/slower
  const targetSpeed = throttle * maxSpeed;
  rover.speed += (targetSpeed - rover.speed) * Math.min(1, dt * 6);

  if (Math.abs(steer) > 0.01) {
    const turnRate = 2.15 * (throttle < -0.1 ? -1 : 1);
    rover.heading += steer * turnRate * dt;
  }

  if (Math.abs(rover.speed) > 0.08) {
    rover.tethered = false;
    rover.tetherZoneId = null;
    const nextPos = clampToArena(
      rover.x + Math.sin(rover.heading) * rover.speed * dt,
      rover.z + Math.cos(rover.heading) * rover.speed * dt
    );
    rover.x = nextPos.x;
    rover.z = nextPos.z;
    rover.roverStillSec = 0;
  } else {
    rover.speed = 0;
    rover.roverStillSec += dt;
  }

  rover.y = terrainHeight(missionId, rover.x, rover.z);
  const norm = terrainNormal(missionId, rover.x, rover.z);
  const sinH = Math.sin(rover.heading);
  const cosH = Math.cos(rover.heading);
  rover.pitch = Number((-(norm.x * sinH + norm.z * cosH) * 0.7).toFixed(3));
  rover.roll = Number(((norm.x * cosH - norm.z * sinH) * 0.7).toFixed(3));

  const activeZones = findZonesAt(missionId, rover.x, rover.z);
  rover.inZones = activeZones.map((z) => z.id);
  const inShelter = activeZones.some((z) => z.kind === "shelter" || z.kind === "crater_safe");
  const onRidge = activeZones.some((z) => z.kind === "ridge");
  const inHazard = activeZones.some((z) => z.kind === "hazard");

  // 2. Advance Telemetry Timeline
  state.tickAccumSec += dt;
  while (state.tickAccumSec >= state.tickDurationSec && state.tickIndex < state.timeline.length - 1) {
    state.tickAccumSec -= state.tickDurationSec;
    telemetry.prevTau = state.timeline[state.tickIndex]?.tau ?? telemetry.prevTau;
    state.tickIndex += 1;
    const pt = state.timeline[state.tickIndex];
    telemetry.currentPoint = pt;
    state.visibleSeries.push(pt);
    if (pt.sentinel) {
      telemetry.sentinelPending = true;
      telemetry.sentinelClearTimer = 6.5;
    }
  }

  const pt = telemetry.currentPoint || state.timeline[state.tickIndex];

  // 3. Coupled Planetary Physics (Battery, T^4 Thermal, Wind Drag, NavCam t-1 -> t)
  const speedNorm = Math.min(1, Math.abs(rover.speed) / 12.5);
  const slope = terrainSlopeRatio(missionId, rover.x, rover.z);
  const irrNorm =
    missionId === "M1"
      ? pt.primaryVal / 1000
      : missionId === "M5"
      ? pt.primaryVal / 100
      : 0.72;

  resources.solarYieldPct = computeSolarYieldPct({
    irradianceNorm: irrNorm,
    tau: pt.tau,
    soilingPct: resources.soiling,
    wingsMode: rover.wingsMode,
    planet,
    onCraterRim: missionId === "M5" && onRidge,
  });

  resources.thermalLoad = computeThermalLoadPct({
    irradianceNorm: irrNorm,
    tau: pt.tau,
    planet,
    wingsMode: rover.wingsMode,
    inShadow: inShelter,
    tethered: rover.tethered,
  });

  resources.windStress = computeWindStress({
    windMs: pt.windMs || 1.5,
    planet,
    wingsMode: rover.wingsMode,
    mastRaised: rover.mastRaised,
    inShelter,
  });

  resources.frameDelta = computeFrameDelta({
    prevTau: telemetry.prevTau,
    currTau: pt.tau,
    speedNorm,
    sentinelActive: telemetry.sentinelPending,
    sanitized: rover.sanitizePulseSec > 0,
  });

  const moveDrain = computeMoveDrainPerSec({ speedNorm, slope, planet });
  const solarCharge = (resources.solarYieldPct / 100) * (missionId === "M1" ? 2.6 : 1.7);
  resources.battery = Math.max(0, Math.min(100, resources.battery + (solarCharge - moveDrain) * dt));

  if (rover.wingsMode !== "stowed" && pt.tau > 0.7) {
    resources.soiling = Math.min(85, resources.soiling + dt * (pt.tau - 0.5) * 2.2);
  }

  // 4. Mission-Specific Mechanics, Trade-Offs & Alerts
  evaluateMissionTick(state, {
    dt,
    pt,
    inShelter,
    onRidge,
    inHazard,
    speedNorm,
  });

  state.alert.targetZoneId = resolveTargetZone(state);

  // 5. Win / Fail Resource Gates
  if (resources.integrity <= 0) {
    finalizeLoss(
      state,
      "Structural integrity reached 0% under unmitigated environmental load.",
      "A integridade estrutural zerou sob carga ambiental sem mitigação."
    );
    return state;
  }
  if (resources.battery <= 0) {
    finalizeLoss(
      state,
      "Battery depleted to 0%. Balance propulsion drain with solar harvesting.",
      "Bateria esgotada (0%). Equilibre o gasto de locomoção com a captação solar."
    );
    return state;
  }
  if (missionId === "M5" && resources.socBio <= 0) {
    finalizeLoss(
      state,
      "Greenhouse OSD-615 biological reserve (SoC_bio) collapsed during eclipse.",
      "Reserva biológica da estufa OSD-615 (SoC_bio) colapsou no eclipse."
    );
    return state;
  }

  // Timeline finished
  if (state.tickIndex >= state.timeline.length - 1 && state.tickAccumSec >= state.tickDurationSec * 0.9) {
    if (missionId === "M1") {
      if (progress.peakHandled) finalizeWin(state);
      else finalizeLoss(state, "Midday solar surplus overloaded inverter without BESS/stow action.", "Excesso do meio-dia sobrecarregou o sistema sem BESS ou recolhimento.");
    } else if (missionId === "M2") {
      if (progress.gustSurvived || resources.integrity >= 70) {
        progress.gustSurvived = true;
        finalizeWin(state);
      } else {
        finalizeLoss(state, "Rover suffered severe gust damage outside shelter.", "O rover sofreu dano severo de rajada fora do abrigo.");
      }
    } else if (missionId === "M3") {
      if (progress.beaconDocked) finalizeWin(state);
      else finalizeLoss(state, "Time expired before locking the EDL Landing Beacon [5].", "Tempo esgotado antes de travar o Farol EDL [5].");
    } else if (missionId === "M4") {
      if (progress.driverChosen) finalizeWin(state);
      else finalizeLoss(state, "Time expired before submitting the physical attribution driver [5].", "Tempo esgotado antes de confirmar o vetor físico [5].");
    } else if (missionId === "M5") {
      if (progress.lavaTubeSheltered && progress.greenhouseSecured) finalizeWin(state);
      else finalizeLoss(state, "Failed to secure OSD-615 SoC_bio and enter the Lava Tube before CME peak.", "Falha em proteger SoC_bio e abrigar no Tubo de Lava antes do pico CME.");
    }
  }

  return state;
}

function evaluateMissionTick(state, ctx) {
  const { dt, pt, inShelter, onRidge, inHazard, speedNorm } = ctx;
  const { rover, resources, telemetry, progress, missionId, planet } = state;

  if (missionId === "M1") {
    const surplusActive = pt.primaryVal >= 760;
    if (surplusActive) {
      const mitigated = rover.wingsMode === "stowed" || rover.tethered || inShelter;
      if (mitigated) {
        progress.peakHandled = true;
        state.alert = {
          level: "success",
          code: "SURPLUS_MITIGATED",
          textEn: "Midday surplus safely mitigated! Watch for the 16h duck neck ramp.",
          textPt: "Pico do meio-dia protegido! Prepare-se para a rampa das 16h.",
          countdownSec: null,
          targetZoneId: state.alert.targetZoneId,
        };
      } else if (resources.thermalLoad >= 82) {
        resources.integrity = Math.max(0, resources.integrity - 7.5 * dt);
        state.alert = {
          level: "danger",
          code: "THERMAL_T4_OVERLOAD",
          textEn: "T⁴ > 82% & Solar Surplus! Dock BESS [5], fold wings [1], or seek shade!",
          textPt: "T⁴ > 82% com excesso solar! Acople no BESS [5], feche [1] ou vá à sombra!",
          countdownSec: Math.max(0, Math.round(resources.integrity / 7.5)),
          targetZoneId: "bess_station",
        };
      }
    } else if (state.tickIndex >= 38) {
      if (rover.wingsMode !== "stowed" && (onRidge || resources.battery >= 35)) {
        progress.eveningRecovered = true;
      }
      state.alert = {
        level: rover.wingsMode === "stowed" ? "warn" : "info",
        code: "DUCK_NECK",
        textEn:
          rover.wingsMode === "stowed"
            ? "Duck Neck ramp! Open wings [1] on the East Ridge before dusk!"
            : "Capturing evening ramp on open panels — keep battery healthy!",
        textPt:
          rover.wingsMode === "stowed"
            ? "Pescoço do Pato! Reabra as asas [1] na Crista Leste antes de escurecer!"
            : "Captando a rampa da tarde — mantenha a bateria estável!",
        countdownSec: null,
        targetZoneId: "sun_ridge",
      };
    }
  } else if (missionId === "M2") {
    const wind = pt.windMs;
    // Phase 1: Wind Cleaning opportunity
    if (
      !progress.windCleaned &&
      rover.wingsMode === "tilted" &&
      wind >= (planet.dustCleanMinMs || 2.2) &&
      wind < 3.6
    ) {
      resources.soiling = Math.max(6, resources.soiling - 28 * dt);
      if (resources.soiling <= 16) {
        progress.windCleaned = true;
        logAction(state, "WIND_CLEANED", "Wind-Cleaned Panels [3]", "Limpeza Eólica Concluída [3]");
      }
    }

    // Phase 2: P90 uncertainty trigger & gust damage
    if (pt.uncertaintyHi >= 3.8 && state.tickIndex >= 24 && state.tickIndex <= 45) {
      progress.gustStarted = true;
      const safe = inShelter && rover.wingsMode === "stowed" && !rover.mastRaised;
      if (wind >= 3.8 && !safe) {
        const damageRate = Math.max(4, (resources.windStress - 0.55) * 14);
        resources.integrity = Math.max(0, resources.integrity - damageRate * dt);
        state.alert = {
          level: "danger",
          code: "GUST_IMPACT",
          textEn: "GUST STRIKE! Enter Rock/Crater Shelter + Fold [1] + Lower [2]!",
          textPt: "RAJADA ATIVA! Entre no Abrigo + Feche [1] + Abaixe [2]!",
          countdownSec: Math.max(0, 45 - state.tickIndex),
          targetZoneId: "shelter_rock",
        };
      } else if (safe) {
        progress.gustSurvived = true;
        state.alert = {
          level: "success",
          code: "SHELTERED",
          textEn: "Sheltered & hunkered down safely while Sol 40 gust passes!",
          textPt: "Abrigado e rebaixado em segurança enquanto a rajada passa!",
          countdownSec: Math.max(0, 45 - state.tickIndex),
          targetZoneId: "shelter_rock",
        };
      } else {
        state.alert = {
          level: "warn",
          code: "P90_WARNING",
          textEn: "P90 band >= 3.8 m/s! Drive to Shelter Rock + Fold [1] + Lower [2]!",
          textPt: "Banda P90 >= 3,8 m/s! Vá para a Rocha + Feche [1] + Abaixe [2]!",
          countdownSec: Math.max(0, 29 - state.tickIndex),
          targetZoneId: "shelter_rock",
        };
      }
    } else if (state.tickIndex > 45 && progress.gustStarted) {
      if (resources.integrity >= 70) {
        progress.gustSurvived = true;
      }
      state.alert = {
        level: progress.gustSurvived ? "success" : "warn",
        code: "GUST_PASSED",
        textEn: "Gust passed! Reopen wings [1] and raise mast [2] to recharge.",
        textPt: "Rajada passou! Reabra asas [1] e erga mastro [2] para recarregar.",
        countdownSec: null,
        targetZoneId: "wind_ridge",
      };
    } else if (!progress.windCleaned && wind >= 2.2) {
      state.alert = {
        level: "info",
        code: "WIND_CLEAN_WINDOW",
        textEn: "Gentle breeze (2.2–3.5 m/s): press [3] Tilt Wings for natural dust cleaning!",
        textPt: "Brisa moderada (2,2–3,5 m/s): aperte [3] Inclinar Painel para limpeza eólica!",
        countdownSec: null,
        targetZoneId: "wind_ridge",
      };
    }
  } else if (missionId === "M3") {
    if (telemetry.sentinelPending) {
      telemetry.sentinelClearTimer = Math.max(0, telemetry.sentinelClearTimer - dt);
      state.alert = {
        level: "warn",
        code: "SENTINEL_999",
        textEn: "999999999.0 SENSOR GLITCH! Press [4] Sanitize Optics — don't abort!",
        textPt: "FALHA 999999999.0! Aperte [4] Purgar Óptica — não aborte a rota!",
        countdownSec: Math.ceil(telemetry.sentinelClearTimer),
        targetZoneId: "landing_beacon",
      };
      if (telemetry.sentinelClearTimer <= 0) {
        telemetry.sentinelPending = false;
        resources.integrity = Math.max(0, resources.integrity - 8);
      }
    } else if (inHazard) {
      resources.integrity = Math.max(0, resources.integrity - 16 * dt);
      state.alert = {
        level: "danger",
        code: "ALPHA_CRATER",
        textEn: "ALPHA CRATER ANOMALY! Steep slope — steer out toward Green Plateau!",
        textPt: "ANOMALIA CRATERA ALPHA! Declive perigoso — desvie pelo Platô Verde!",
        countdownSec: null,
        targetZoneId: "safe_plateau",
      };
    } else if (pt.tau >= 1.55) {
      if (speedNorm < 0.04 && rover.roverStillSec >= 1.2) {
        progress.dustStabilized = true;
        state.alert = {
          level: "success",
          code: "TRN_LOCKED",
          textEn: "ROVER_STILL=1 landmark lock OK! Proceed safely to EDL Beacon [5].",
          textPt: "ROVER_STILL=1 travado nos marcos! Siga com segurança ao Farol EDL [5].",
          countdownSec: null,
          targetZoneId: "landing_beacon",
        };
      } else {
        if (speedNorm > 0.35) {
          resources.integrity = Math.max(0, resources.integrity - 3.5 * dt);
        }
        state.alert = {
          level: "warn",
          code: "DUST_BLUR",
          textEn: "Dust Plume (tau >= 1.6)! STOP moving briefly (ROVER_STILL=1) to lock landmarks!",
          textPt: "Pluma de poeira (tau >= 1,6)! PARE brevemente (ROVER_STILL=1) para travar rota!",
          countdownSec: null,
          targetZoneId: "landing_beacon",
        };
      }
    } else {
      state.alert = {
        level: "info",
        code: "NAV_TO_BEACON",
        textEn: "Navigate around red Alpha Crater to the EDL Beacon and press [5].",
        textPt: "Contorne a Cratera Alpha vermelha até o Farol EDL e aperte [5].",
        countdownSec: null,
        targetZoneId: "landing_beacon",
      };
    }
  } else if (missionId === "M4") {
    if (progress.sampledDecades.length < 2) {
      state.alert = {
        level: "info",
        code: "SAMPLE_DECADES",
        textEn: `Sampled ${progress.sampledDecades.length}/3 decades — drive to glowing mast & press [2].`,
        textPt: `Coletadas ${progress.sampledDecades.length}/3 décadas — vá ao poste e aperte [2].`,
        countdownSec: null,
        targetZoneId: state.alert.targetZoneId,
      };
    } else {
      state.alert = {
        level: "success",
        code: "MK_REVEALED",
        textEn:
          "Seasonal MK revealed p=0.00086! Inspect CLRSKY vs CLOUD (p=0.948) and dock [5] at true driver.",
        textPt:
          "MK Sazonal revelou p=0,00086! Compare Céu Limpo vs Nuvens (p=0,948) e acople [5] na causa real.",
        countdownSec: null,
        targetZoneId: "aerosol_station",
      };
    }
  } else if (missionId === "M5") {
    if (onRidge && rover.wingsMode !== "stowed") {
      progress.rimHarvested = true;
    }
    const donkiHot = pt.secondaryVal >= 68;
    const shelteredNow = inShelter && rover.wingsMode === "stowed" && !rover.mastRaised;

    if (!progress.greenhouseSecured && state.tickIndex >= 18) {
      resources.socBio = Math.max(0, resources.socBio - 2.4 * dt);
    }

    if (donkiHot) {
      if (shelteredNow) {
        progress.lavaTubeSheltered = true;
        state.alert = {
          level: "success",
          code: "LAVA_SHIELDED",
          textEn: "Protected inside Lava Tube while DONKI CME/RBE peak passes!",
          textPt: "Protegido no Tubo de Lava enquanto o pico DONKI CME/RBE passa!",
          countdownSec: null,
          targetZoneId: "lava_tube",
        };
      } else {
        resources.integrity = Math.max(0, resources.integrity - 9.5 * dt);
        state.alert = {
          level: "danger",
          code: "CME_IMPACT",
          textEn: "DONKI CME/RBE STORM! Enter Lava Tube + Fold [1] + Lower [2] immediately!",
          textPt: "TEMPESTADE DONKI CME/RBE! Entre no Tubo de Lava + Feche [1] + Abaixe [2]!",
          countdownSec: Math.max(0, 62 - state.tickIndex),
          targetZoneId: "lava_tube",
        };
      }
    } else if (!progress.rimHarvested) {
      state.alert = {
        level: "info",
        code: "RIM_STEP",
        textEn: "Step 1: Drive to Sunlit Crater Rim (+13% IR Albedo) with wings open/tilted.",
        textPt: "Passo 1: Suba na Borda Iluminada (+13% Albedo IR) com asas abertas/inclinadas.",
        countdownSec: null,
        targetZoneId: "crater_rim",
      };
    } else if (!progress.greenhouseSecured) {
      state.alert = {
        level: "warn",
        code: "GREENHOUSE_STEP",
        textEn: "Step 2: Drive to OSD-615 Greenhouse & press [5] to secure SoC_bio before eclipse!",
        textPt: "Passo 2: Vá à Estufa OSD-615 e aperte [5] para estabilizar SoC_bio antes do eclipse!",
        countdownSec: Math.max(0, 34 - state.tickIndex),
        targetZoneId: "greenhouse_soc",
      };
    } else {
      state.alert = {
        level: "warn",
        code: "SHELTER_PREP",
        textEn: "Step 3: Head to Lava Tube, fold [1] and lower [2] before DONKI reaches 68!",
        textPt: "Passo 3: Siga ao Tubo de Lava, feche [1] e abaixe [2] antes do DONKI bater 68!",
        countdownSec: Math.max(0, 38 - state.tickIndex),
        targetZoneId: "lava_tube",
      };
    }
  }
}
