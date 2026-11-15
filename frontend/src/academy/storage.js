/**
 * Browser-local profile, 3-layer DeepTutor-inspired learner memory, and
 * device-only Hall of Fame storage (zero server login, zero tracking).
 */

import { computeEarnedBadges, computeGameBadges } from "./xp.js";
import {
  RANKING_LIMITS,
  mergeRankingEntry,
  sanitizeRankingEntry,
  sortRankingRows,
  validatePilotName,
} from "../engine/rankingModel.js";

export { validatePilotName };

export const STORAGE_KEY = "cockpit-omni/detective/v1";
export const HOF_KEY = "cockpit-omni/hall-of-fame/v1";

export function generatePilotId() {
  try {
    if (typeof globalThis.crypto?.randomUUID === "function") {
      return `p_${globalThis.crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;
    }
  } catch {
    // Fallback below when Web Crypto is unavailable
  }
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function isValidPilotUuid(rawId) {
  return /^[a-zA-Z0-9_-]{8,64}$/.test(String(rawId || "")) && !String(rawId || "").startsWith("legacy:");
}

export function createInitialGameState() {
  return {
    introSeen: false,
    judgeUnlock: false,
    missions: {},
    labRuns: [],
    badges: [],
  };
}

export function createInitialProfile() {
  return {
    pilotId: generatePilotId(),
    name: "",
    avatar: "campinas-analyst",
    depth: "explorer",
    xp: 0,
    streak: 0,
    stars: 0,
    mastery: {},
    badges: [],
    events: [],
    game: createInitialGameState(),
    summary: "New detective profile. Complete questions in Academy to build your statistical dossier.",
    updatedAt: null,
  };
}

function resolveStorage(customStorage) {
  if (customStorage) return customStorage;
  if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
  return null;
}

/**
 * Layer 3 memory synthesis derived from Layer 1 (events) + Layer 2 (module mastery).
 * Kept compact and plain-text so both AskPanel and optional /api/ask can inspect it cleanly.
 */
export function buildMemorySummary(profile) {
  const mastered = Object.entries(profile.mastery || {})
    .filter(([, m]) => m?.passed)
    .map(([id, m]) => `${id} (${Math.round((m.score || 0) * 100)}%)`);

  const recentMistakes = (profile.events || [])
    .filter((e) => !e.correct)
    .slice(-3)
    .map((e) => `${e.moduleId}/${e.questionId}`);

  const gameMissions = Object.entries(profile.game?.missions || {})
    .filter(([, m]) => m?.won)
    .map(([id, m]) => `${id} (${m.stars || 0}*)`);

  const totalAnswered = (profile.events || []).length;
  const parts = [
    `Track: ${profile.depth}`,
    `Answered events: ${totalAnswered}`,
    mastered.length ? `Mastered: ${mastered.join(", ")}` : "Mastered: none yet",
  ];
  if (gameMissions.length) {
    parts.push(`3D Rover Missions: ${gameMissions.join(", ")}`);
  }
  if (recentMistakes.length) {
    parts.push(`Recent misses to reinforce: ${recentMistakes.join(", ")}`);
  }
  return parts.join(" | ");
}

export function loadProfile(customStorage) {
  const store = resolveStorage(customStorage);
  if (!store) return createInitialProfile();
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return createInitialProfile();
    const parsed = JSON.parse(raw);
    const mergedGame = {
      ...createInitialGameState(),
      ...(parsed.game && typeof parsed.game === "object" ? parsed.game : {}),
      missions:
        parsed.game?.missions && typeof parsed.game.missions === "object"
          ? parsed.game.missions
          : {},
      labRuns: Array.isArray(parsed.game?.labRuns) ? parsed.game.labRuns.slice(-15) : [],
    };
    mergedGame.badges = computeGameBadges(mergedGame);

    const merged = {
      ...createInitialProfile(),
      ...parsed,
      pilotId: isValidPilotUuid(parsed.pilotId) ? parsed.pilotId : generatePilotId(),
      mastery: parsed.mastery && typeof parsed.mastery === "object" ? parsed.mastery : {},
      events: Array.isArray(parsed.events) ? parsed.events.slice(-20) : [],
      game: mergedGame,
    };
    merged.badges = computeEarnedBadges(merged.mastery);
    merged.summary = buildMemorySummary(merged);
    if (!isValidPilotUuid(parsed.pilotId)) {
      try {
        store.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        // Ignore storage quota errors
      }
    }
    return merged;
  } catch {
    return createInitialProfile();
  }
}

export function saveProfile(profile, customStorage) {
  const store = resolveStorage(customStorage);
  const nextGame = {
    ...createInitialGameState(),
    ...(profile.game || {}),
    labRuns: Array.isArray(profile.game?.labRuns) ? profile.game.labRuns.slice(-15) : [],
  };
  nextGame.badges = computeGameBadges(nextGame);

  const next = {
    ...profile,
    pilotId: isValidPilotUuid(profile.pilotId) ? profile.pilotId : generatePilotId(),
    game: nextGame,
    events: Array.isArray(profile.events) ? profile.events.slice(-20) : [],
    badges: computeEarnedBadges(profile.mastery || {}),
    updatedAt: new Date().toISOString(),
  };
  next.summary = buildMemorySummary(next);
  if (store) {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(next));
      syncHallOfFame(next, store);
    } catch {
      // Ignore storage quota errors in restricted incognito contexts.
    }
  }
  return next;
}

export function buildRankingEntry(profile) {
  if (!profile) return null;
  const missionsWon = Object.values(profile.game?.missions || {}).filter((m) => m?.won).length;
  const masteredCount = Object.values(profile.mastery || {}).filter((m) => m?.passed).length;
  const badgesCount = (profile.badges || []).length + (profile.game?.badges || []).length;
  const check = sanitizeRankingEntry({
    pilotId: profile.pilotId,
    name: profile.name,
    avatar: profile.avatar,
    depth: profile.depth,
    xp: profile.xp || 0,
    stars: profile.stars || 0,
    masteredCount,
    missionsWon,
    badgesCount,
    updatedAt: profile.updatedAt || new Date().toISOString(),
  });
  return check.ok ? check.entry : null;
}

export function saveHallOfFameRows(rows, customStorage) {
  const store = resolveStorage(customStorage);
  const sorted = sortRankingRows(Array.isArray(rows) ? rows : []).slice(0, RANKING_LIMITS.MAX_LOCAL_ROWS);
  if (store) {
    try {
      store.setItem(HOF_KEY, JSON.stringify(sorted));
    } catch {
      // Ignore storage quota errors.
    }
  }
  return sorted;
}

export function loadHallOfFame(customStorage) {
  const store = resolveStorage(customStorage);
  if (!store) return [];
  try {
    const raw = store.getItem(HOF_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? sortRankingRows(rows) : [];
  } catch {
    return [];
  }
}

export function syncHallOfFame(profile, customStorage) {
  const store = resolveStorage(customStorage);
  if (!store) return [];
  const entry = buildRankingEntry(profile);
  const existing = loadHallOfFame(store);
  if (!entry) return existing;
  const merged = mergeRankingEntry(existing, entry, RANKING_LIMITS.MAX_LOCAL_ROWS);
  return saveHallOfFameRows(merged.rows, store);
}

export function forgetProfile(currentName, customStorage, currentPilotId = "") {
  const store = resolveStorage(customStorage);
  if (store) {
    try {
      store.removeItem(STORAGE_KEY);
      const clean = currentName ? currentName.trim().toLowerCase() : "";
      const remaining = loadHallOfFame(store).filter((r) => {
        if (currentPilotId && r.pilotId && r.pilotId === currentPilotId) return false;
        if (!currentPilotId && clean && String(r.name || "").trim().toLowerCase() === clean) return false;
        return true;
      });
      store.setItem(HOF_KEY, JSON.stringify(remaining));
    } catch {
      // Ignore storage errors.
    }
  }
  return createInitialProfile();
}
