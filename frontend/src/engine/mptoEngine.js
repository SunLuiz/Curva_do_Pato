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

  const orchestration = computeAgentOrchestration({
    params,
    planet: effectivePlanet,
    pvYieldPct,
    thermalLoadPct,
    radiatorSaturated,
    conductivityGainX,
    heatingReductionPct,
    bioBufferHrs,
    geotechnical: geo,
    windStress,
    windStatus,
    sanitizedDelta,
  });

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
    orchestration,
  };
}

function clamp01(val) {
  return Number(Math.max(0, Math.min(1, val)).toFixed(2));
}

/**
 * Deterministic 7-Agent + Statistical Auditor + OMNI Orchestrator fusion layer.
 * Every agent vote [0..1] binds 1:1 to a physical MPTO Frontier and real flight hardware/sensors.
 */
export function computeAgentOrchestration({
  params,
  planet,
  pvYieldPct,
  thermalLoadPct,
  radiatorSaturated,
  conductivityGainX,
  heatingReductionPct,
  bioBufferHrs,
  geotechnical,
  windStress,
  windStatus,
  sanitizedDelta,
}) {
  const hebeVote = clamp01((thermalLoadPct - 45) / 42);
  const geminiVote = clamp01(Math.max(sanitizedDelta, (100 - pvYieldPct) / 100));
  const solVote = clamp01((params.onCraterRim ? 0.15 : 0.45) + (conductivityGainX < 25 ? 0.45 : 0));
  const biosVote = clamp01((4.8 - bioBufferHrs) / 3.6);
  const grokVote = clamp01(
    geotechnical.energyDistanceMult >= 1.5 ? 0.92 : (geotechnical.wheelSlipPct || 0) / 55
  );
  const stormVote = clamp01(
    windStatus === "danger" ? 1.0 : windStatus === "cleaning_window" ? 0.45 : windStress * 0.85
  );
  const prudenceVote = clamp01((Number(params.tau) / 3.0) * 0.65 + (Number(params.cpDust) - 0.7) * 0.8);

  const agents = [
    {
      id: "hebe_radiance",
      name: "Hebe Radiance",
      frontierId: 1,
      weight: 0.18,
      vote: hebeVote,
      veto: radiatorSaturated,
      roleEn: "Radiative T⁴ Cooling Ceiling",
      rolePt: "Teto Radiativo T⁴ do Radiador",
      hardwareEn: "Throttles BAE RAD750 + VCE Virtex-5QV FPGA above 82%",
      hardwarePt: "Limita dissipação do BAE RAD750 + VCE FPGA acima de 82%",
      signalEn: `Thermal load ${thermalLoadPct}% (ceiling 82%)`,
      signalPt: `Carga térmica ${thermalLoadPct}% (teto 82%)`,
      actionKey: radiatorSaturated ? "[1] / [5]" : "NOMINAL",
    },
    {
      id: "gemini_vision",
      name: "Gemini Vision",
      frontierId: 2,
      weight: 0.16,
      vote: geminiVote,
      veto: params.sentinelActive,
      roleEn: "Optical Frame Derivative (t-1 -> t) & Beer-Lambert",
      rolePt: "Derivada Óptica (t-1 -> t) & Beer-Lambert",
      hardwareEn: "CMV20000 20MP Global Shutter (4x4 bin) + FPGA LoG + MEDA RDS",
      hardwarePt: "CMV20000 20MP Global Shutter (bin 4x4) + Filtro LoG + MEDA RDS",
      signalEn: `ΔI=${sanitizedDelta} · PV yield ${pvYieldPct}%${params.sentinelActive ? " · 999999999.0 flagged" : ""}`,
      signalPt: `ΔI=${sanitizedDelta} · PV ${pvYieldPct}%${params.sentinelActive ? " · erro 999999999.0" : ""}`,
      actionKey: params.sentinelActive ? "[4] SANITIZE" : sanitizedDelta > 0.6 ? "HALT" : "NOMINAL",
    },
    {
      id: "sol_invicta",
      name: "Sol Invicta",
      frontierId: 3,
      weight: 0.11,
      vote: solVote,
      veto: false,
      roleEn: "Sintered Regolith Bed (~50x k) & Crater IR Gain",
      rolePt: "Regolito Sinterizado (~50x k) & Albedo IR da Cratera",
      hardwareEn: "Couples thermal BESS sink with crater wall +10–15% IR flux",
      hardwarePt: "Gerencia bateria térmica BESS + ganho IR de 10–15% na encosta",
      signalEn: `k=${conductivityGainX}x · IR boost +${heatingReductionPct}%`,
      signalPt: `k=${conductivityGainX}x · ganho IR +${heatingReductionPct}%`,
      actionKey: params.onCraterRim ? "IR LOCK" : "[5] BESS",
    },
    {
      id: "bios_guardian",
      name: "Bios Guardian",
      frontierId: 4,
      weight: 0.14,
      vote: biosVote,
      veto: bioBufferHrs < 2.5,
      roleEn: "Biological Circularity Reserve (SoC_bio)",
      rolePt: "Reserva Biológica Circular (SoC_bio)",
      hardwareEn: "OSDR OSD-615 Arabidopsis floor through 35% CelesTrak eclipses",
      hardwarePt: "Piso biológico OSDR OSD-615 nos eclipses de 35% (CelesTrak)",
      signalEn: `SoC_bio=${bioBufferHrs} h reserve`,
      signalPt: `Reserva SoC_bio=${bioBufferHrs} h`,
      actionKey: bioBufferHrs < 2.5 ? "[5] PROTECT BIOS" : "NOMINAL",
    },
    {
      id: "grok_cratera",
      name: "Grok Cratera",
      frontierId: 5,
      weight: 0.18,
      vote: grokVote,
      veto: geotechnical.energyDistanceMult > 1.35,
      roleEn: "64m Impulse Geotechnics & Wh/km Routing",
      rolePt: "Geotecnia 64m & Roteamento Energético (Wh/km)",
      hardwareEn: "VCE SAD Stereo (1/16 px, 10cm DEM) + RANSAC 6-DoF VO + ACE",
      hardwarePt: "FPGA Estéreo SAD (1/16 px, DEM 10cm) + Odometria VO + ACE",
      signalEn: `${geotechnical.wheelSlipPct}% slip · ${geotechnical.energyDistanceMult}x Wh/km (τ_c=${geotechnical.tauC_Pa} Pa)`,
      signalPt: `${geotechnical.wheelSlipPct}% patinagem · ${geotechnical.energyDistanceMult}x Wh/km (τ_c=${geotechnical.tauC_Pa} Pa)`,
      actionKey: geotechnical.energyDistanceMult > 1.35 ? "BYPASS ALPHA" : "NOMINAL",
    },
    {
      id: "storm_watcher",
      name: "Storm Watcher",
      frontierId: 6,
      weight: 0.14,
      vote: stormVote,
      veto: windStatus === "danger",
      roleEn: "30–60 min Lead-Time Wind & DONKI SEU Watch",
      rolePt: "Antecipação 30–60 min Vento & Clima Espacial DONKI",
      hardwareEn: "MEDA 2Hz gusts + DONKI 7d RBE/CME alert watch for ECC RAM",
      hardwarePt: "Rajadas MEDA 2Hz + alertas DONKI 7d contra SEUs na RAM ECC",
      signalEn: `Wind stress ${windStress.toFixed(2)} (${windStatus})`,
      signalPt: `Estresse eólico ${windStress.toFixed(2)} (${windStatus})`,
      actionKey: windStatus === "danger" ? "[1] + [2] SHELTER" : windStatus === "cleaning_window" ? "[3] TILT" : "NOMINAL",
    },
    {
      id: "prudence_bounds",
      name: "Prudence",
      frontierId: 7,
      weight: 0.09,
      vote: prudenceVote,
      veto: false,
      roleEn: "Parametric P10–P95 Uncertainty Margin",
      rolePt: "Margem de Incerteza Paramétrica P10–P95",
      hardwareEn: "Tracks tau & dust Cp dispersion before nominal threshold trips",
      hardwarePt: "Monitora dispersão de τ e Cp da poeira (banda P90/P95)",
      signalEn: `τ=${Number(params.tau).toFixed(2)} · Cp=${Number(params.cpDust).toFixed(2)} · g=${planet.g}`,
      signalPt: `τ=${Number(params.tau).toFixed(2)} · Cp=${Number(params.cpDust).toFixed(2)} · g=${planet.g}`,
      actionKey: prudenceVote >= 0.65 ? "CONSERVATIVE MARGINS" : "NOMINAL",
    },
  ];

  const consensusScore = Number(
    agents.reduce((acc, a) => acc + a.vote * a.weight, 0).toFixed(2)
  );
  const activeVetoes = agents.filter((a) => a.veto);

  let dispatchEn = "Nominal telemetry across all 7 physical vectors — maintain harvesting.";
  let dispatchPt = "Telemetria nominal nos 7 vetores físicos — manter captação.";
  if (params.sentinelActive) {
    dispatchEn = "Gemini Vision detected sensor glitch 999999999.0 -> Statistical Auditor confirms no physical storm; execute [4] Optical Purge without aborting.";
    dispatchPt = "Gemini Vision isolou sentinela 999999999.0 -> Auditor confirma ausência de tempestade física; acionar [4] Purga Óptica sem abortar.";
  } else if (geotechnical.energyDistanceMult > 1.35) {
    dispatchEn = "VETO by Grok Cratera (VCE ACE + VO): loose sand exceeds 40% slip (1.8x Wh/km) — reject Position Alpha and reroute via compact basalt plateau.";
    dispatchPt = "VETO do Grok Cratera (FPGA VO + ACE): areia fofa excede 40% de patinagem (1,8x Wh/km) — rejeitar Cratera Alpha e contornar pelo basalto compacto.";
  } else if (windStatus === "danger") {
    dispatchEn = "CRITICAL ALERT by Storm Watcher: aerodynamic stress >= 1.0 — fold wings [1], crouch suspension [2], and seek leeward/lava shelter 30–60 min ahead.";
    dispatchPt = "ALERTA CRÍTICO do Storm Watcher: estresse eólico >= 1,0 — recolher asas [1], abaixar mastro [2] e abrigar 30–60 min antes.";
  } else if (radiatorSaturated) {
    dispatchEn = "THERMAL VETO by Hebe Radiance: T⁴ radiator >= 82% — throttle VCE FPGA compute and dock BESS [5] / fold wings [1] immediately.";
    dispatchPt = "VETO TÉRMICO da Hebe Radiance: radiador T⁴ >= 82% — reduzir carga do VCE FPGA e acoplar BESS [5] ou fechar asas [1].";
  } else if (windStatus === "cleaning_window") {
    dispatchEn = "OPPORTUNITY by Storm Watcher + Hebe: moderate breeze open — tilt solar panels [3] at 35 deg for natural wind-cleaning.";
    dispatchPt = "OPORTUNIDADE (Storm Watcher + Hebe): brisa moderada ideal — inclinar painéis [3] a 35° para limpeza eólica natural.";
  }

  return {
    agents,
    consensusScore,
    status: activeVetoes.length > 0 || consensusScore >= 0.6 ? "critical" : consensusScore >= 0.35 ? "watch" : "nominal",
    activeVetoes: activeVetoes.map((a) => a.name),
    auditorRule: {
      nameEn: "Statistical Auditor (Non-LLM Veto)",
      namePt: "Auditor Estatístico (Veto Não-LLM)",
      statusEn: "ENFORCED · WS2M monthly p=0.489 (null) & NISAR/ECOSTRESS locked to roadmap",
      statusPt: "ATIVO · Vento WS2M nulo (p=0,489) e NISAR/ECOSTRESS bloqueados no roadmap",
    },
    dispatchEn,
    dispatchPt,
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
