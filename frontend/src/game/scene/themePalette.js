/**
 * Three.js color palettes by planetary context vector Θ.
 * Isolated here so React JSX components stay 100% token-driven with zero hex literals.
 */

export const BIOME_PALETTES = {
  earth_ne: {
    sky: 0xd9ecfa,
    fog: 0xe6e4d8,
    groundLow: 0xc29864,
    groundHigh: 0x9b7142,
    sun: 0xfff3d1,
    ambient: 0x8aa4b8,
    rock: 0x765e4b,
    accent: 0x2a7047,
  },
  earth_se: {
    sky: 0xcce3f5,
    fog: 0xd9e6df,
    groundLow: 0x5c8055,
    groundHigh: 0x876c4e,
    sun: 0xfff7e0,
    ambient: 0x829994,
    rock: 0x625a52,
    accent: 0x2a7047,
  },
  earth_am: {
    sky: 0xbad9e8,
    fog: 0xcce0d8,
    groundLow: 0x396b45,
    groundHigh: 0x5e7d47,
    sun: 0xfff5d8,
    ambient: 0x779b8a,
    rock: 0x4f564a,
    accent: 0x1f6f8b,
  },
  mars_jezero: {
    sky: 0xc97b53,
    fog: 0xc97a52,
    groundLow: 0x9e4929,
    groundHigh: 0xc76d3f,
    sun: 0xffd7b3,
    ambient: 0x8c553e,
    rock: 0x5d3122,
    accent: 0x4cd4e8,
  },
  moon_artemis: {
    sky: 0x090c12,
    fog: 0x111620,
    groundLow: 0x4f545e,
    groundHigh: 0x7b8290,
    sun: 0xf7f9ff,
    ambient: 0x444c5c,
    rock: 0x3a3f4a,
    accent: 0x45c97a,
  },
};

export const HUD_3D_COLORS = {
  roverBody: 0xe8edf2,
  roverGold: 0xd9a13b,
  roverWheel: 0x1e2228,
  roverWheelRim: 0xb6c2cf,
  roverGrouser: 0x4b5563,
  roverStrut: 0x9aa6b4,
  headlightBeam: 0xfff4d6,
  solarBlue: 0x1a4c8a,
  solarDusty: 0x6b5342,
  safeGreen: 0x3cd070,
  warnAmber: 0xf5b942,
  dangerRed: 0xf25244,
  cyan: 0x4cd4e8,
  purple: 0x9b6dff,
  sandHazard: 0xd9924c,
  basaltSafe: 0x3f4c46,
  trackFirm: 0x2a2420,
  trackSlip: 0x171210,
};

export const CELESTIAL_COLORS = {
  starWhite: 0xf4f7ff,
  starBlue: 0xb8dcff,
  starAmber: 0xffd59e,
  nebulaMars: 0xd99b7e,
  nebulaMoon: 0x6e9eff,
  earthOcean: 0x1c69c9,
  earthLand: 0x3f8f56,
  earthAtmo: 0x64b5ff,
  saturnBody: 0xe3c38a,
  saturnRing: 0xcbb07a,
  phobosRock: 0x6e5a52,
  deimosRock: 0x877b74,
};

export const SPRITE_PALETTE = {
  bg: "rgba(11, 21, 34, 0.88)",
  text: "#f4f6f8",
  danger: "#f25244",
  warn: "#f5b942",
  safe: "#3cd070",
  cyan: "#4cd4e8",
};
