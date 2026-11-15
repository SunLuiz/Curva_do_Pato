/**
 * Deterministic Optimal Policy Oracle & Unified Academy XP/Star Scoring.
 * Computes the benchmark optimal action timestamps directly from any mission's
 * timeline so Debrief can compare Player Actions vs. Oracle vs. NASA Truth.
 */

import { starsFor, xpFor } from "../../academy/xp.js";

export function computeOraclePolicy(missionId, timeline = []) {
  if (!timeline.length) return [];
  const pins = [];

  if (missionId === "M1") {
    const surplusTick = timeline.find((p) => p.primaryVal >= 760) || timeline[18];
    const neckTick = timeline.find((p, idx) => idx > 30 && p.primaryVal <= 480) || timeline[40];
    if (surplusTick) {
      pins.push({
        t: surplusTick.t,
        action: "DOCK_BESS_OR_STOW",
        labelEn: "Dock BESS [5] / Fold [1]",
        labelPt: "Acoplar BESS [5] / Fechar [1]",
      });
    }
    if (neckTick) {
      pins.push({
        t: neckTick.t,
        action: "OPEN_RIDGE",
        labelEn: "Reopen Wings [1] on Ridge",
        labelPt: "Reabrir Asas [1] na Crista",
      });
    }
  } else if (missionId === "M2") {
    const cleanTick = timeline.find((p) => p.primaryVal >= 2.2 && p.primaryVal < 3.4) || timeline[9];
    const p90Trigger = timeline.find((p) => p.uncertaintyHi >= 3.8) || timeline[25];
    if (cleanTick) {
      pins.push({
        t: cleanTick.t,
        action: "TILT_CLEAN",
        labelEn: "Tilt [3] Wind-Clean",
        labelPt: "Inclinar [3] Limpeza",
      });
    }
    if (p90Trigger) {
      pins.push({
        t: p90Trigger.t,
        action: "SHELTER_STOW",
        labelEn: "Shelter + Stow [1][2] (P90>=3.8)",
        labelPt: "Abrigo + Recolher [1][2] (P90)",
      });
    }
  } else if (missionId === "M3") {
    const firstSentinel = timeline.find((p) => p.sentinel);
    const firstDust = timeline.find((p) => p.tau >= 1.55);
    if (firstSentinel) {
      pins.push({
        t: firstSentinel.t,
        action: "SANITIZE_OPTICS",
        labelEn: "Purge 999999999.0 [4]",
        labelPt: "Filtrar 999999999.0 [4]",
      });
    }
    if (firstDust) {
      pins.push({
        t: firstDust.t,
        action: "ROVER_STILL",
        labelEn: "Halt (ROVER_STILL=1) in Dust",
        labelPt: "Parar (ROVER_STILL=1) na Poeira",
      });
    }
    pins.push({
      t: Math.max(4, timeline.length - 8),
      action: "DOCK_BEACON",
      labelEn: "Bypass Alpha -> Beacon [5]",
      labelPt: "Desviar Alpha -> Farol [5]",
    });
  } else if (missionId === "M4") {
    pins.push({
      t: 12,
      action: "SAMPLE_MAST",
      labelEn: "Sample 3 Decades [2] (MK)",
      labelPt: "Coletar 3 Décadas [2] (MK)",
    });
    pins.push({
      t: Math.max(18, timeline.length - 12),
      action: "PICK_AEROSOL",
      labelEn: "Dock Aerosol Driver [5]",
      labelPt: "Acoplar Vetor Aerossol [5]",
    });
  } else if (missionId === "M5") {
    pins.push({
      t: 8,
      action: "RIM_HARVEST",
      labelEn: "Crater Rim +13% IR [1][3]",
      labelPt: "Borda +13% IR [1][3]",
    });
    pins.push({
      t: 22,
      action: "DOCK_GREENHOUSE",
      labelEn: "Stabilize OSD-615 [5]",
      labelPt: "Estufa OSD-615 [5]",
    });
    const stormTick = timeline.find((p) => p.secondaryVal >= 68) || timeline[36];
    pins.push({
      t: Math.max(26, stormTick.t - 2),
      action: "LAVA_SHELTER",
      labelEn: "Lava Tube + Stow [1][2]",
      labelPt: "Tubo Lava + Recolher [1][2]",
    });
  }

  return pins;
}

/**
 * Evaluates performance using the SAME Academy starsFor() and xpFor() functions
 * so Game Mode feeds the shared profile and Hall of Fame transparently.
 */
export function evaluateMissionOutcome({
  won,
  attempt = 1,
  usedHint = false,
  integrity = 100,
  battery = 50,
  bonusScore = 0,
  streak = 0,
}) {
  if (!won) {
    return {
      stars: 0,
      xp: 10, // Small discovery practice XP even on retry, keeping real fail consequences
      grade: "FAILED",
      efficiencyPct: Math.max(0, Math.round((integrity * 0.4 + battery * 0.3 + bonusScore * 0.3))),
    };
  }

  const efficiencyPct = Math.min(
    100,
    Math.round(integrity * 0.45 + Math.min(100, battery) * 0.25 + Math.min(100, bonusScore) * 0.3)
  );
  // Map performance + attempt/hint into Academy's 1..3 stars
  let effectiveAttempt = attempt;
  if (efficiencyPct < 65 && effectiveAttempt < 2) effectiveAttempt = 2;
  const stars = starsFor(effectiveAttempt, usedHint, true);
  const xp = xpFor(stars, streak) + (efficiencyPct >= 88 ? 25 : 0);

  return {
    stars,
    xp,
    grade: stars === 3 ? "GOLD" : stars === 2 ? "SILVER" : "BRONZE",
    efficiencyPct,
  };
}
