/**
 * Analytical heightfield h(biomeId, x, z), surface normal, and mission spatial zones.
 * Shared single source of truth for Three.js terrain geometry, rover wheel contact,
 * 2D NavCam/radar minimap, and deterministic Node unit tests.
 */

export const ARENA_HALF = 42;

export const MISSION_ZONES = {
  M1: [
    {
      id: "bess_station",
      kind: "bess",
      x: 16,
      z: -10,
      radius: 5.5,
      labelEn: "Regolith BESS Dock [5]",
      labelPt: "Estação BESS Regolito [5]",
    },
    {
      id: "shadow_rock",
      kind: "shelter",
      x: -16,
      z: 8,
      radius: 5.5,
      labelEn: "Cooling Rock Shadow",
      labelPt: "Sombra da Rocha",
    },
    {
      id: "sun_ridge",
      kind: "ridge",
      x: 18,
      z: 18,
      radius: 6.5,
      labelEn: "East Sunlit Ridge",
      labelPt: "Crista Solar Leste",
    },
  ],
  M2: [
    {
      id: "wind_ridge",
      kind: "ridge",
      x: 4,
      z: -14,
      radius: 6.0,
      labelEn: "Exposed Anemometer Ridge",
      labelPt: "Crista Exposta (Vento)",
    },
    {
      id: "shelter_rock",
      kind: "shelter",
      x: -17,
      z: 12,
      radius: 6.0,
      labelEn: "Leeward Rock Shelter",
      labelPt: "Abrigo Atrás da Rocha",
    },
    {
      id: "crater_shelter",
      kind: "crater_safe",
      x: 17,
      z: 14,
      radius: 6.0,
      labelEn: "Basin Shelter Crater",
      labelPt: "Cratera de Abrigo",
    },
  ],
  M3: [
    {
      id: "crater_alpha",
      kind: "hazard",
      x: 8,
      z: -4,
      radius: 7.2,
      labelEn: "Alpha Crater Fault (DANGER)",
      labelPt: "Cratera Alpha (PERIGO)",
    },
    {
      id: "safe_plateau",
      kind: "ridge",
      x: -14,
      z: -10,
      radius: 5.8,
      labelEn: "Green Plateau (Landmark Lock)",
      labelPt: "Platô Seguro (Rota Verde)",
    },
    {
      id: "landing_beacon",
      kind: "beacon",
      x: 20,
      z: -20,
      radius: 5.5,
      labelEn: "EDL Landing Beacon [5]",
      labelPt: "Farol de Pouso EDL [5]",
    },
  ],
  M4: [
    {
      id: "sample_1984",
      kind: "sample",
      x: -16,
      z: 12,
      radius: 5.2,
      decade: "1984–1997",
      labelEn: "1984–1997 Baseline Mast [2]",
      labelPt: "Estação 1984–1997 [2]",
    },
    {
      id: "sample_2005",
      kind: "sample",
      x: 0,
      z: -12,
      radius: 5.2,
      decade: "1998–2011",
      labelEn: "1998–2011 Mid-Era Mast [2]",
      labelPt: "Estação 1998–2011 [2]",
    },
    {
      id: "sample_2025",
      kind: "sample",
      x: 16,
      z: 10,
      radius: 5.2,
      decade: "2012–2025",
      labelEn: "2012–2025 Modern Mast [2]",
      labelPt: "Estação 2012–2025 [2]",
    },
    {
      id: "aerosol_station",
      kind: "bess",
      x: -15,
      z: -18,
      radius: 5.5,
      labelEn: "Clear-Sky / Aerosol Driver [5]",
      labelPt: "Vetor Aerossol / Céu Limpo [5]",
    },
    {
      id: "cloud_station",
      kind: "hazard_choice",
      x: 17,
      z: -18,
      radius: 5.5,
      labelEn: "Cloud Cover Driver [5]",
      labelPt: "Vetor Nuvens [5]",
    },
  ],
  M5: [
    {
      id: "crater_rim",
      kind: "ridge",
      x: -18,
      z: -14,
      radius: 6.2,
      labelEn: "Sunlit Crater Rim (+13% IR Albedo)",
      labelPt: "Borda Iluminada (+13% Albedo IR)",
    },
    {
      id: "greenhouse_soc",
      kind: "bess",
      x: 15,
      z: 10,
      radius: 5.8,
      labelEn: "OSD-615 Greenhouse (SoC_bio) [5]",
      labelPt: "Estufa OSD-615 (SoC_bio) [5]",
    },
    {
      id: "lava_tube",
      kind: "shelter",
      x: 0,
      z: -22,
      radius: 6.2,
      labelEn: "Subsurface Lava Tube Shelter",
      labelPt: "Tubo de Lava Subterrâneo",
    },
  ],
};

function gauss(x, z, cx, cz, amp, sigma) {
  const dx = x - cx;
  const dz = z - cz;
  return amp * Math.exp(-(dx * dx + dz * dz) / (2 * sigma * sigma));
}

/**
 * Deterministic terrain elevation h(x, z) in meters for each mission arena.
 */
export function terrainHeight(missionId, x, z) {
  // Gentle multi-frequency planetary undulation ("terrain breathing")
  const base =
    Math.sin(x * 0.085) * Math.cos(z * 0.075) * 1.15 +
    Math.sin((x + z) * 0.05) * 0.65;

  if (missionId === "M1") {
    const ridge = gauss(x, z, 18, 18, 3.6, 8.5);
    const rockMound = gauss(x, z, -20, 10, 4.4, 4.2);
    const valley = gauss(x, z, 16, -10, -1.2, 6.5);
    return base * 0.75 + ridge + rockMound + valley;
  }

  if (missionId === "M2") {
    const ridge = gauss(x, z, 4, -14, 3.2, 7.5);
    const rockWall = gauss(x, z, -21, 14, 5.2, 4.0);
    const crater = gauss(x, z, 17, 14, -2.8, 5.5) + gauss(x, z, 17, 14, 1.1, 8.5);
    return base * 0.9 + ridge + rockWall + crater;
  }

  if (missionId === "M3") {
    const alphaCrater = gauss(x, z, 8, -4, -5.2, 5.4) + gauss(x, z, 8, -4, 1.8, 8.2);
    const plateau = gauss(x, z, -14, -10, 2.2, 7.0);
    const beaconHill = gauss(x, z, 20, -20, 2.4, 6.5);
    return base * 0.95 + alphaCrater + plateau + beaconHill;
  }

  if (missionId === "M4") {
    const hill1 = gauss(x, z, -16, 12, 2.0, 6.5);
    const hill2 = gauss(x, z, 0, -12, 1.8, 6.5);
    const hill3 = gauss(x, z, 16, 10, 2.4, 6.5);
    return base * 0.8 + hill1 + hill2 + hill3;
  }

  // M5 Lunar / Mars South Pole Crater & Lava Tube
  const rim = gauss(x, z, -18, -14, 4.2, 7.5);
  const centralBasin = gauss(x, z, 2, 2, -2.0, 10.0);
  const tubeDip = gauss(x, z, 0, -22, -2.4, 5.5);
  return base * 0.9 + rim + centralBasin + tubeDip;
}

export function terrainNormal(missionId, x, z) {
  const eps = 0.5;
  const hL = terrainHeight(missionId, x - eps, z);
  const hR = terrainHeight(missionId, x + eps, z);
  const hD = terrainHeight(missionId, x, z - eps);
  const hU = terrainHeight(missionId, x, z + eps);
  const nx = hL - hR;
  const ny = 2 * eps;
  const nz = hD - hU;
  const len = Math.hypot(nx, ny, nz) || 1;
  return { x: nx / len, y: ny / len, z: nz / len };
}

export function terrainSlopeRatio(missionId, x, z) {
  const n = terrainNormal(missionId, x, z);
  return Math.max(0, 1 - n.y);
}

export function clampToArena(x, z) {
  return {
    x: Math.max(-ARENA_HALF, Math.min(ARENA_HALF, x)),
    z: Math.max(-ARENA_HALF, Math.min(ARENA_HALF, z)),
  };
}

export function getMissionZones(missionId) {
  return MISSION_ZONES[missionId] || [];
}

export function findZonesAt(missionId, x, z) {
  const zones = getMissionZones(missionId);
  return zones.filter((zone) => Math.hypot(x - zone.x, z - zone.z) <= zone.radius);
}
