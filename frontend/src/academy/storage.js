/**
 * Browser-local profile, 3-layer DeepTutor-inspired learner memory, and
 * device-only Hall of Fame storage (zero server login, zero tracking).
 */

import { computeEarnedBadges, computeGameBadges } from "./xp.js";

export const STORAGE_KEY = "cockpit-omni/detective/v1";
export const HOF_KEY = "cockpit-omni/hall-of-fame/v1";

/**
 * Validates and normalizes the pilot/trainee display name required before launching missions
 * and issuing the final 3D Field & Science certificate.
 */
export function validatePilotName(rawName) {
  const cleanName = String(rawName ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, 32);

  if (!cleanName) {
    return {
      valid: false,
      cleanName: "",
      code: "EMPTY",
      messageEn: "Enter your name to register your training record and unlock Launch.",
      messagePt: "Informe seu nome para registrar o treinamento e liberar o início.",
    };
  }
  if (cleanName.length < 2) {
    return {
      valid: false,
      cleanName,
      code: "TOO_SHORT",
      messageEn: "Pilot name must be at least 2 characters long.",
      messagePt: "O nome deve ter pelo menos 2 caracteres.",
    };
  }
  if (!/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(cleanName)) {
    return {
      valid: false,
      cleanName,
      code: "NO_LETTERS",
      messageEn: "Include at least one letter so your certificate can be issued cleanly.",
      messagePt: "Inclua ao menos uma letra para a emissão do certificado.",
    };
  }
  return {
    valid: true,
    cleanName,
    code: "OK",
    messageEn: `Verified trainee: ${cleanName} (Certificate & Ranking linked)`,
    messagePt: `Piloto verificado: ${cleanName} (Vinculado ao Certificado e Ranking)`,
  };
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
      mastery: parsed.mastery && typeof parsed.mastery === "object" ? parsed.mastery : {},
      events: Array.isArray(parsed.events) ? parsed.events.slice(-20) : [],
      game: mergedGame,
    };
    merged.badges = computeEarnedBadges(merged.mastery);
    merged.summary = buildMemorySummary(merged);
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

export function loadHallOfFame(customStorage) {
  const store = resolveStorage(customStorage);
  if (!store) return [];
  try {
    const raw = store.getItem(HOF_KEY);
    const rows = raw ? JSON.parse(raw) : [];
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export function syncHallOfFame(profile, customStorage) {
  const store = resolveStorage(customStorage);
  if (!store || !profile?.name?.trim()) return loadHallOfFame(store);
  const cleanName = profile.name.trim();
  const rows = loadHallOfFame(store).filter(
    (r) => r.name.toLowerCase() !== cleanName.toLowerCase()
  );
  if (profile.xp > 0 || (profile.badges || []).length > 0) {
    rows.push({
      name: cleanName,
      avatar: profile.avatar,
      depth: profile.depth,
      xp: profile.xp || 0,
      stars: profile.stars || 0,
      masteredCount: Object.values(profile.mastery || {}).filter((m) => m?.passed).length,
      badgesCount: (profile.badges || []).length,
      updatedAt: profile.updatedAt || new Date().toISOString(),
    });
  }
  rows.sort((a, b) => b.xp - a.xp || b.stars - a.stars || b.masteredCount - a.masteredCount);
  const trimmed = rows.slice(0, 25);
  try {
    store.setItem(HOF_KEY, JSON.stringify(trimmed));
  } catch {
    // Ignore storage quota errors.
  }
  return trimmed;
}

export function forgetProfile(currentName, customStorage) {
  const store = resolveStorage(customStorage);
  if (store) {
    try {
      store.removeItem(STORAGE_KEY);
      if (currentName && currentName.trim()) {
        const clean = currentName.trim().toLowerCase();
        const remaining = loadHallOfFame(store).filter((r) => r.name.toLowerCase() !== clean);
        store.setItem(HOF_KEY, JSON.stringify(remaining));
      }
    } catch {
      // Ignore storage errors.
    }
  }
  return createInitialProfile();
}
