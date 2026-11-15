/**
 * Unified Multi-Physics Thermodynamic Orchestration (MPTO) engine shared by
 * Cockpit Tab 5 (SpaceAnalogTab) and Rover Pilot 3D (planetaryPhysics.js).
 * Zero React or Three.js dependencies; strictly deterministic.
 */

import {
  IMPULSE_CALIBRATION_PROFILES,
  PLANETS,
  computeFrameDelta,
  computeGeotechnicalSlip,
  computeMoveDrainPerSec,
  computeSolarYieldPct,
  computeThermalLoadPct,
  computeWindStress,
  getPlanet,
} from "../game/sim/planetaryPhysics.js";

export const PLANET_ORDER = [
  "mars_jezero",
  "moon_artemis",
  "earth_ne",
  "earth_se",
  "earth_am",
];

export const PLANET_LIST = PLANET_ORDER.map((id) => PLANETS[id]);

export const IMPULSE_PROFILE_META = {
  compact_basalt: {
    id: "compact_basalt",
    labelEn: "Compact Basalt Bedrock",
    labelPt: "Basalto Compacto (Rocha Firme)",
    siteEn: "Green Plateau · Low-slip bypass route",
    sitePt: "Platô Verde · Rota segura de contorno",
    verdictEn: "Nominal traction · 1.0× nominal energy distance",
    verdictPt: "Tração nominal · 1,0× distância energética",
    tone: "--sig",
  },
  terrestrial_loam: {
    id: "terrestrial_loam",
    labelEn: "Terrestrial Loam / Semi-Arid Soil",
    labelPt: "Solo Franco / Semiárido Terrestre",
    siteEn: "Brazil Analogue Corridors (Petrolina / Campinas / Manaus)",
    sitePt: "Corredores Análogos Brasil (Petrolina / Campinas / Manaus)",
    verdictEn: "Cohesive terrain · slight 8% wheel slip baseline",
    verdictPt: "Solo coesivo · patinagem basal reduzida (8%)",
    tone: "--biome-se",
  },
  lunar_regolith: {
    id: "lunar_regolith",
    labelEn: "Lunar Highland Regolith (Artemis)",
    labelPt: "Regolito Lunar (Polo Sul Artemis)",
    siteEn: "Crater wall slopes · 1.62 m/s² low gravity",
    sitePt: "Encostas lunares · baixa gravidade (1,62 m/s²)",
    verdictEn: "Moderate slip (18%) + electrostatic dust abrasion risk",
    verdictPt: "Patinagem moderada (18%) + risco abrasivo eletrostático",
    tone: "--biome-n",
  },
  eolian_sand: {
    id: "eolian_sand",
    labelEn: "Eolian Sand Trap (Crater Alpha)",
    labelPt: "Areia Eólica Não Consolidada (Cratera Alpha)",
    siteEn: "Sector 4 hazard calibrated by 64 m retro-plume inversion",
    sitePt: "Risco Setor 4 calibrado por inversão do empuxo a 64 m",
    verdictEn: "CRITICAL SLIP (>=44%) · 1 km geometric = 1.8 km Wh/km",
    verdictPt: "PATINAGEM CRÍTICA (>=44%) · 1 km geométrico = 1,8 km Wh/km",
    tone: "--danger",
  },
};

export function defaultParamsForPlanet(planetId = "mars_jezero") {
  const planet = getPlanet(planetId);
  const isMoon = planet.id === "moon_artemis";
  const isMars = planet.id === "mars_jezero";

  return {
    planetId: planet.id,
    tau: planet.baseTau,
    cpDust: planet.cpDust,
    kReg: planet.kRegolith,
    albedoIr: Math.round((planet.albedoIrGain || 0) * 100),
    irradianceNorm: isMoon ? 0.92 : 0.85,
    soilingPct: isMars ? 18 : 8,
    wingsMode: "open",
    mastRaised: true,
    inShelter: false,
    inShadow: false,
    tethered: false,
    onCraterRim: isMoon,
    windMs: isMoon ? 0 : isMars ? 2.8 : 4.6,
    terrainProfile: isMoon ? "lunar_regolith" : isMars ? "compact_basalt" : "terrestrial_loam",
    slope: 0.05,
    prevTau: planet.baseTau,
    currTau: Number((planet.baseTau + (isMars ? 0.55 : 0.15)).toFixed(2)),
    speedNorm: 0.45,
    sentinelActive: false,
    recommendedMission: isMars ? "M3" : isMoon ? "M5" : planet.id === "earth_ne" ? "M1" : "M4",
  };
}

/**
 * Compute all coupled physical outputs across Solar, T^4 Thermal, Geotechnical Slip,
 * Aerodynamic Stress, Optical Frame Delta, and the 7 MPTO Frontiers.
 */
export function computeUnifiedMPTO(input = {}) {
  const base = defaultParamsForPlanet(input.planetId || "mars_jezero");
  const params = { ...base, ...input };
  const rawPlanet = getPlanet(params.planetId);

  const effectivePlanet = {
    ...rawPlanet,
    cpDust: Number(params.cpDust),
    kRegolith: Number(params.kReg),
    baseTau: Number(params.tau),
    albedoIrGain: Number(params.albedoIr) / 100,
  };

  const pvYieldPct = computeSolarYieldPct({
    irradianceNorm: params.irradianceNorm,
    tau: params.tau,
    soilingPct: params.soilingPct,
    wingsMode: params.wingsMode,
    planet: effectivePlanet,
    onCraterRim: params.onCraterRim,
  });

  // Clear-sky theoretical Beer-Lambert baseline (matching original SpaceAnalogTab comparison)
  const pvDirectExpPct = Math.round(100 * Math.exp(-0.55 * Math.max(0, params.tau)));

  const thermalLoadPct = computeThermalLoadPct({
    irradianceNorm: params.irradianceNorm,
    tau: params.tau,
    planet: effectivePlanet,
    wingsMode: params.wingsMode,
    inShadow: params.inShadow,
    tethered: params.tethered,
  });
  const radiatorSaturated = thermalLoadPct >= 82;

  const conductivityGainX = Math.max(1, Math.round(Number(params.kReg) / 0.02));
  const heatingReductionPct = Math.round(Number(params.albedoIr));
  const bioBufferHrs = Number(Math.max(1.2, (pvYieldPct / 100) * 6.5).toFixed(1));

  // Active geotechnical slip profile
  const geo = computeGeotechnicalSlip({
    missionId: params.terrainProfile === "eolian_sand" ? "M3" : "M1",
    planet: effectivePlanet,
    inHazard: params.terrainProfile === "eolian_sand",
    onRidge: params.terrainProfile === "compact_basalt",
    slope: params.slope,
    profileOverride: params.terrainProfile,
  });

  const terrainMatrix = Object.keys(IMPULSE_CALIBRATION_PROFILES).map((id) => {
    const res = computeGeotechnicalSlip({
      missionId: id === "eolian_sand" ? "M3" : "M1",
      planet: effectivePlanet,
      inHazard: id === "eolian_sand",
      onRidge: id === "compact_basalt",
      slope: params.slope,
      profileOverride: id,
    });
    return {
      ...res,
      meta: IMPULSE_PROFILE_META[id],
      active: res.profileId === geo.profileId,
      effectiveSpeedFactorPct: Math.round(res.tractionFactor * 100),
    };
  });

  const baseMoveDrain = computeMoveDrainPerSec({
    speedNorm: params.speedNorm,
    slope: params.slope,
    planet: effectivePlanet,
  });
  const roverMoveDrainPctSec = Number((baseMoveDrain * geo.energyDistanceMult).toFixed(3));
  const roverNetGainPct = Math.max(
    0,
    Math.round(pvYieldPct * 0.28 + heatingReductionPct * 0.6 - 8 * geo.energyDistanceMult)
  );

  // Wind stress & cleaning window across selected planet + cross-planet matrix
  const windStress = computeWindStress({
    windMs: params.windMs,
    planet: effectivePlanet,
    wingsMode: params.wingsMode,
    mastRaised: params.mastRaised,
    inShelter: params.inShelter,
  });

  let windStatus = "calm";
  if (effectivePlanet.rho <= 0.0001) {
    windStatus = "vacuum";
  } else if (windStress >= 1.0) {
    windStatus = "danger";
  } else if (
    params.windMs >= (effectivePlanet.dustCleanMinMs || 99) &&
    params.windMs <= (effectivePlanet.maxSafeWindMs || 99) &&
    !params.inShelter
  ) {
    windStatus = "cleaning_window";
  }

  const windComparison = [
    PLANETS.mars_jezero,
    PLANETS.moon_artemis,
    PLANETS.earth_ne,
  ].map((pl) => ({
    planetId: pl.id,
    labelEn: pl.labelEn,
    labelPt: pl.labelPt,
    rho: pl.rho,
    maxSafeWindMs: pl.maxSafeWindMs,
    stress: computeWindStress({
      windMs: params.windMs,
      planet: pl,
      wingsMode: params.wingsMode,
      mastRaised: params.mastRaised,
      inShelter: params.inShelter,
    }),
  }));

  // Optical NavCam frame delta |I_t - I_{t-1}| + Sentinel 999999999.0 sanitization
  const rawDelta = computeFrameDelta({
    prevTau: params.prevTau,
    currTau: params.currTau,
    speedNorm: params.speedNorm,
    sentinelActive: params.sentinelActive,
    sanitized: false,
  });
  const sanitizedDelta = computeFrameDelta({
    prevTau: params.prevTau,
    currTau: params.currTau,
    speedNorm: params.speedNorm,
    sentinelActive: params.sentinelActive,
    sanitized: true,
  });
  const stillDelta = computeFrameDelta({
    prevTau: params.prevTau,
    currTau: params.currTau,
    speedNorm: 0,
    sentinelActive: false,
    sanitized: true,
  });
  const motionBlurShare = Number(Math.max(0, sanitizedDelta - stillDelta).toFixed(3));

  // Frontier operational states (1..7)
  const frontierSignals = {
    1: {
      level: thermalLoadPct >= 82 ? "critical" : thermalLoadPct >= 70 ? "watch" : "nominal",
      metric: `T⁴ = ${thermalLoadPct}%`,
      noteEn: radiatorSaturated ? "Curtail compute / fold wings [1] (>=82%)" : "Radiator margin safe (<82%)",
      notePt: radiatorSaturated ? "Acionar curtailment / fechar [1] (>=82%)" : "Margem radiativa segura (<82%)",
    },
    2: {
      level: conductivityGainX < 25 ? "watch" : "nominal",
      metric: `${conductivityGainX}× (${Number(params.kReg).toFixed(2)} W/m·K)`,
      noteEn: geo.profileId === "lunar_regolith" ? "High abrasive electrostatic wear" : "Sintered regolith bed active",
      notePt: geo.profileId === "lunar_regolith" ? "Alto desgaste abrasivo eletrostático" : "Leito sinterizado ativo",
    },
    3: {
      level: heatingReductionPct >= 10 ? "nominal" : "watch",
      metric: `+${heatingReductionPct}% IR albedo`,
      noteEn: params.onCraterRim ? "Crater rim IR boost engaged" : "Flat terrain — no rim IR boost",
      notePt: params.onCraterRim ? "Ganho IR da encosta engajado" : "Plano aberto — sem ganho IR",
    },
    4: {
      level: bioBufferHrs < 2.5 ? "critical" : bioBufferHrs < 4.0 ? "watch" : "nominal",
      metric: `SoC_bio = ${bioBufferHrs} h`,
      noteEn: `PV yield ${pvYieldPct}% sustains OSD-615 greenhouse`,
      notePt: `Rendimento PV ${pvYieldPct}% sustenta estufa OSD-615`,
    },
    5: {
      level: geo.energyDistanceMult > 1.3 ? "critical" : geo.wheelSlipPct > 15 ? "watch" : "nominal",
      metric: `${geo.wheelSlipPct}% slip · ${geo.energyDistanceMult}× Wh/km`,
      noteEn: `Arbitrage net +${roverNetGainPct}% · ${geo.tauC_Pa} Pa soil`,
      notePt: `Ganho líquido +${roverNetGainPct}% · solo ${geo.tauC_Pa} Pa`,
    },
    6: {
      level: windStatus === "danger" || params.sentinelActive ? "critical" : windStatus === "cleaning_window" ? "watch" : "nominal",
      metric: `Stress ${windStress.toFixed(2)} · ΔI ${sanitizedDelta}`,
      noteEn:
        windStatus === "danger"
          ? "Structural limit >1.0 — dispatch shelter 30–60m ahead!"
          : windStatus === "cleaning_window"
            ? "Wind-cleaning window open — tilt [3] recommended"
            : params.sentinelActive
              ? "999999999.0 purged cleanly without abort"
              : "Lead-time actuator margin healthy",
      notePt:
        windStatus === "danger"
          ? "Limite estrutural >1,0 — abrigar 30–60 min antes!"
          : windStatus === "cleaning_window"
            ? "Janela de limpeza eólica — inclinar [3]"
            : params.sentinelActive
              ? "Sentinela 999999999.0 purgado sem abortar"
              : "Margem de atuação antecipada nominal",
    },
    7: {
      level: Number(params.tau) >= 2.2 || Number(params.cpDust) >= 1.0 ? "watch" : "nominal",
      metric: `τ=${Number(params.tau).toFixed(2)} · Cp=${Number(params.cpDust).toFixed(2)}`,
      noteEn: `Direct Beer-Lambert ${pvDirectExpPct}% · g=${effectivePlanet.g} m/s²`,
      notePt: `Beer-Lambert direto ${pvDirectExpPct}% · g=${effectivePlanet.g} m/s²`,
    },
  };

  return {
    params,
    planet: effectivePlanet,
    pvYieldPct,
    pvDirectExpPct,
    thermalLoadPct,
    radiatorSaturated,
    conductivityGainX,
    heatingReductionPct,
    bioBufferHrs,
    geotechnical: geo,
    terrainMatrix,
    roverMoveDrainPctSec,
    roverNetGainPct,
    windStress,
    windStatus,
    windComparison,
    optical: {
      rawDelta,
      sanitizedDelta,
      stillDelta,
      motionBlurShare,
      rawSensorValue: params.sentinelActive ? 999999999.0 : Number(params.currTau),
    },
    frontierSignals,
  };
}

export function enrichFrontiersWithLiveState(frontiers = [], unified = null, lang = "en") {
  const l = lang === "pt" ? "pt" : "en";
  return (frontiers || []).map((f) => {
    const live = unified?.frontierSignals?.[f.id];
    const tone =
      live?.level === "critical"
        ? "var(--danger)"
        : live?.level === "watch"
          ? "var(--biome-ne)"
          : "var(--sig)";
    return {
      ...f,
      liveLevel: live?.level || "nominal",
      liveMetric: live?.metric || "--",
      liveNote: l === "pt" ? live?.notePt || "" : live?.noteEn || "",
      liveTone: tone,
    };
  });
}

export function buildGameDeepLink({
  missionId = "M5",
  planetId = "mars_jezero",
  depth = "specialist",
  tau = null,
} = {}) {
  const qp = new URLSearchParams();
  if (missionId) qp.set("mission", missionId);
  if (planetId) qp.set("planet", planetId);
  if (depth) qp.set("depth", depth);
  if (tau !== null && tau !== undefined && Number.isFinite(Number(tau))) {
    qp.set("tau", Number(tau).toFixed(2));
  }
  return `/game?${qp.toString()}`;
}
