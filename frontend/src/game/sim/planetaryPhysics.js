/**
 * Planetary Context Vector Θ = [g, rho, cpDust, kRegolith, baseTau, albedoIrGain]
 * and physics-informed transfer equations ("The Planet Breathes") shared by
 * the 3D viewport, live HUD, and deterministic simulation tests.
 */

export const PLANETS = {
  earth_ne: {
    id: "earth_ne",
    body: "Earth",
    labelEn: "Petrolina-PE · Caatinga Solar Corridor",
    labelPt: "Petrolina-PE · Corredor Solar Caatinga",
    g: 9.81,
    rho: 1.225,
    cpDust: 0.85,
    kRegolith: 0.85,
    baseTau: 0.22,
    albedoIrGain: 0.0,
    maxSafeWindMs: 14.0,
    dustCleanMinMs: 4.5,
  },
  earth_se: {
    id: "earth_se",
    body: "Earth",
    labelEn: "Campinas-SP · Atlantic/Cerrado (42-yr)",
    labelPt: "Campinas-SP · Mata Atlântica/Cerrado (42 anos)",
    g: 9.81,
    rho: 1.225,
    cpDust: 0.82,
    kRegolith: 0.85,
    baseTau: 0.3,
    albedoIrGain: 0.0,
    maxSafeWindMs: 14.0,
    dustCleanMinMs: 4.5,
  },
  earth_am: {
    id: "earth_am",
    body: "Earth",
    labelEn: "Manaus-AM · Amazon Basin (42-yr)",
    labelPt: "Manaus-AM · Bacia Amazônica (42 anos)",
    g: 9.81,
    rho: 1.225,
    cpDust: 0.8,
    kRegolith: 0.85,
    baseTau: 0.35,
    albedoIrGain: 0.0,
    maxSafeWindMs: 13.5,
    dustCleanMinMs: 4.5,
  },
  mars_jezero: {
    id: "mars_jezero",
    body: "Mars",
    labelEn: "Mars · Jezero Crater (MEDA)",
    labelPt: "Marte · Cratera Jezero (MEDA)",
    g: 3.71,
    rho: 0.02,
    cpDust: 0.8,
    kRegolith: 0.85,
    baseTau: 0.6,
    albedoIrGain: 0.04,
    maxSafeWindMs: 4.2,
    dustCleanMinMs: 2.2,
  },
  moon_artemis: {
    id: "moon_artemis",
    body: "Moon",
    labelEn: "Moon · South Pole Crater & Lava Tube",
    labelPt: "Lua · Cratera Polo Sul & Tubo de Lava",
    g: 1.62,
    rho: 0.0,
    cpDust: 0.78,
    kRegolith: 0.85,
    baseTau: 0.05,
    albedoIrGain: 0.13,
    maxSafeWindMs: 999.0,
    dustCleanMinMs: 999.0,
  },
};

export function getPlanet(planetId) {
  return PLANETS[planetId] || PLANETS.mars_jezero;
}

/**
 * Deterministic PRNG (Mulberry32) so every Mission Lab run is 100% reproducible by seed.
 */
export function mulberry32(seed = 2026) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Beer-Lambert solar yield coupled with wing deployment, soiling, and crater IR albedo.
 * Mirrors SpaceAnalogTab.jsx: pvYieldPct = 100 * exp(-0.55 * tau).
 */
export function computeSolarYieldPct({
  irradianceNorm = 1,
  tau = 0.3,
  soilingPct = 0,
  wingsMode = "open",
  planet = PLANETS.mars_jezero,
  onCraterRim = false,
}) {
  if (wingsMode === "stowed") return 0;
  const beerLambert = Math.exp(-0.55 * Math.max(0, tau));
  const wingFactor = wingsMode === "tilted" ? 0.78 : 1.0;
  const cleanFactor = Math.max(0.25, 1 - Math.min(80, soilingPct) / 110);
  const rimBonus = onCraterRim ? 1 + (planet.albedoIrGain || 0) : 1;
  return Math.max(
    0,
    Math.min(130, Math.round(100 * irradianceNorm * beerLambert * wingFactor * cleanFactor * rimBonus))
  );
}

/**
 * Radiative T^4 thermal load matching SpaceAnalogTab.jsx ceiling (82% saturation).
 */
export function computeThermalLoadPct({
  irradianceNorm = 0.8,
  tau = 0.4,
  planet = PLANETS.mars_jezero,
  wingsMode = "open",
  inShadow = false,
  tethered = false,
}) {
  const baseLoad = 38 + irradianceNorm * 56 - tau * 14 + (planet.cpDust - 0.8) * 18;
  const wingHeat = wingsMode === "open" ? 8 : wingsMode === "tilted" ? 3 : -14;
  const shadowCool = inShadow ? -24 : 0;
  const bessDrain = tethered ? -18 : 0;
  return Math.max(8, Math.min(100, Math.round(baseLoad + wingHeat + shadowCool + bessDrain)));
}

/**
 * Wind stress ratio (> 1.0 causes structural wing/mast damage).
 * Incorporates atmospheric density scaling, shelter protection, and Hunker Down (-60% area).
 */
export function computeWindStress({
  windMs = 0,
  planet = PLANETS.mars_jezero,
  wingsMode = "open",
  mastRaised = true,
  inShelter = false,
}) {
  if (planet.rho <= 0.0001) return 0; // Vacuum: no aerodynamic drag
  const shelterFactor = inShelter ? 0.28 : 1.0;
  const effectiveWind = windMs * shelterFactor;
  // Exposure multiplier: open wings + raised mast suffer full aerodynamic torque;
  // stowed + lowered suspension cuts cross-sectional area by ~65%.
  const wingArea = wingsMode === "open" ? 1.0 : wingsMode === "tilted" ? 0.72 : 0.3;
  const mastArea = mastRaised ? 1.15 : 0.78;
  const safeThreshold = planet.maxSafeWindMs || 10;
  return Number(((effectiveWind / safeThreshold) * wingArea * mastArea).toFixed(3));
}

/**
 * NavCam frame-to-frame optical derivative |I_t - I_{t-1}|.
 * Combines real dust plume / smoke opacity changes, rover motion blur (ROVER_STILL=0),
 * and raw sensor sentinel glitches (999999999.0) before optical sanitization.
 */
export function computeFrameDelta({
  prevTau = 0.4,
  currTau = 0.4,
  speedNorm = 0,
  sentinelActive = false,
  sanitized = false,
}) {
  if (sentinelActive && !sanitized) return 1.0;
  const envDelta = Math.min(0.85, Math.abs(currTau - prevTau) * 1.45 + Math.max(0, currTau - 0.9) * 0.22);
  const motionBlur = speedNorm * 0.42;
  return Number(Math.min(1.0, envDelta + motionBlur).toFixed(3));
}

/**
 * Locomotion power cost in battery %/sec scaled by planetary gravity and terrain slope.
 */
export function computeMoveDrainPerSec({ speedNorm = 0, slope = 0, planet = PLANETS.mars_jezero }) {
  if (speedNorm <= 0.01) return 0.22; // Base avionics idle draw
  const gravityFactor = 0.55 + (planet.g / 9.81) * 0.65;
  const climbFactor = 1 + Math.max(0, slope) * 1.8;
  return Number((0.25 + speedNorm * 1.25 * gravityFactor * climbFactor).toFixed(3));
}
