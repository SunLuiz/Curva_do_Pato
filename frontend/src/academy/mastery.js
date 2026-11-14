/**
 * Pure mastery gate engine for Curva do Pato Academy.
 *
 * Adapted from DeepTutor's formative mastery loop (Apache-2.0):
 * - Credit comes only from unassisted attempts (hints count as valid
 *   guided practice via stars/XP, never toward the mastery gate).
 * - Recency weight multiplies later items up to 2x relative to item 0.
 * - Gate passes only when weighted mastery >= threshold (0.8), all critical
 *   falsification/limit checks are solved unassisted, every item was attempted,
 *   and the module contains at least 5 questions.
 */

export function creditFor(attempt, usedHint) {
  if (usedHint) return 0;
  if (attempt === 1) return 1;
  if (attempt === 2) return 0.5;
  return 0;
}

export function masteryScore(items) {
  const n = items.length;
  if (!n) return 0;
  // Recency weight: the final item weighs 2x the initial item.
  const weights = items.map((_, i) => 1 + i / Math.max(1, n - 1));
  const numerator = items.reduce((acc, it, i) => acc + (it.credit ?? 0) * weights[i], 0);
  const denominator = weights.reduce((a, b) => a + b, 0);
  return numerator / denominator;
}

export function gate(items, threshold = 0.8) {
  const score = masteryScore(items);
  const criticalOk = items.filter((i) => i.critical).every((i) => i.solvedUnassisted);
  const attemptedAll = items.length > 0 && items.every((i) => i.attempts >= 1);
  const enoughItems = items.length >= 5;
  return {
    score,
    passed: score >= threshold && criticalOk && attemptedAll && enoughItems,
    reasons: {
      thresholdMet: score >= threshold,
      criticalOk,
      attemptedAll,
      enoughItems,
    },
    earned: items.filter((i) => i.solvedUnassisted).length,
    total: items.length,
  };
}
