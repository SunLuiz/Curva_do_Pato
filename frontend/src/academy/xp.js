/**
 * Stars, XP, badges, and biome companions for Curva do Pato Academy.
 * Stars reward effort and learning persistence (even when guided by a hint);
 * XP tracks active progression with a capped consecutive-unassisted streak bonus.
 */

export const STARS = {
  firstTry: 3,
  secondTry: 2,
  hinted: 1,
  wrong: 0,
};

export function starsFor(attempt, usedHint, correct) {
  if (!correct) return STARS.wrong;
  if (usedHint) return STARS.hinted;
  if (attempt <= 1) return STARS.firstTry;
  return STARS.secondTry;
}

export function xpFor(stars, streak = 0) {
  return Math.round(stars * 10 * Math.min(3, 1 + Math.max(0, streak) * 0.5));
}

export const AVATARS = [
  { id: "campinas-analyst", label: "Campinas Field Owl", short: "SE", tone: "--biome-se" },
  { id: "caatinga-fox", label: "Caatinga Solar Fox", short: "NE", tone: "--biome-ne" },
  { id: "amazon-otter", label: "Amazon River Otter", short: "AM", tone: "--biome-n" },
  { id: "ceres-eye", label: "CERES Radiometer", short: "SW", tone: "--sig" },
  { id: "viirs-spotter", label: "VIIRS Fire Spotter", short: "FR", tone: "--danger" },
  { id: "tau-detective", label: "Kendall Tau Auditor", short: "MK", tone: "--null-ink" },
];

export const DEPTH_TRACKS = [
  {
    id: "explorer",
    label: "Explorer",
    tagline: "Plain-English intuition: visual curves, everyday metaphors, zero jargon.",
  },
  {
    id: "analyst",
    label: "Analyst",
    tagline: "Decision-maker rigor: p-values, 95% confidence intervals, and causal checks.",
  },
  {
    id: "specialist",
    label: "Specialist",
    tagline: "Full telemetry spec: Kendall's tau-b, Hamed-Rao / Seasonal MK, MERRA-2 vs CERES.",
  },
];

export const BADGES = [
  {
    id: "season-breaker",
    title: "Season Breaker",
    moduleId: "M1",
    description: "Uncovered trends hidden behind summer/winter cycles using Seasonal Mann-Kendall.",
    tone: "--biome-se",
  },
  {
    id: "null-hunter",
    title: "Null Hunter",
    moduleId: "M2",
    description: "Separated real climate signals from random noise across Brazil's biomes.",
    tone: "--biome-n",
  },
  {
    id: "slope-auditor",
    title: "Slope Auditor",
    moduleId: "M3",
    description: "Read Theil-Sen decadal rates and rejected estimates whose 95% CI crosses zero.",
    tone: "--biome-se",
  },
  {
    id: "cloud-buster",
    title: "Cloud vs. Aerosol Detective",
    moduleId: "M4",
    description: "Passed the unassisted falsification check distinguishing Campinas from Manaus.",
    tone: "--biome-ne",
  },
  {
    id: "honest-detective",
    title: "Honest Scientist",
    moduleId: "M5",
    description: "Refused to overclaim where monthly MERRA-2 wind data shows a null signal (p = 0.489).",
    tone: "--null-ink",
  },
  {
    id: "case-closed",
    title: "Chief Earth System Detective",
    moduleId: "ALL",
    description: "Passed the mastery gate across all 5 investigation modules (M1-M5).",
    tone: "--sig",
  },
];

export function computeEarnedBadges(mastery = {}) {
  const passedIds = BADGES.filter((b) => b.moduleId !== "ALL" && mastery[b.moduleId]?.passed).map(
    (b) => b.id
  );
  if (
    ["M1", "M2", "M3", "M4", "M5"].every((m) => Boolean(mastery[m]?.passed))
  ) {
    passedIds.push("case-closed");
  }
  return passedIds;
}
