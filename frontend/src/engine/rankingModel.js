/**
 * Pure ranking validation, sanitization, and monotonic high-score merge logic.
 * Shared across the React browser client (local cache fallback) and Vercel
 * serverless endpoint (`frontend/api/ranking.js`) so anti-tamper rules never drift.
 */

export const RANKING_LIMITS = {
  MAX_ROWS: 100,
  MAX_LOCAL_ROWS: 100,
  MAX_XP: 100000,
  MAX_STARS: 150,
  MAX_MASTERED: 5,
  MAX_MISSIONS_WON: 5,
  MAX_BADGES: 12,
  VALID_DEPTHS: ["explorer", "analyst", "specialist"],
  VALID_AVATARS: [
    "campinas-analyst",
    "caatinga-fox",
    "amazon-otter",
    "ceres-eye",
    "viirs-spotter",
    "tau-detective",
  ],
};

/**
 * Validates and normalizes the pilot/trainee display name required before launching
 * missions and publishing to the Hall of Fame / final 3D certificate.
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

export function normalizePilotId(rawId, fallbackName = "") {
  const cleaned = String(rawId || "").trim();
  if (/^[a-zA-Z0-9_-]{8,64}$/.test(cleaned)) {
    return cleaned;
  }
  const slug = String(fallbackName || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug ? `legacy:${slug}` : "";
}

function clampInt(val, max) {
  const n = Math.floor(Number(val));
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(max, n);
}

function parseIsoDate(rawDate) {
  if (!rawDate) return new Date().toISOString();
  const ms = Date.parse(rawDate);
  if (!Number.isFinite(ms)) return new Date().toISOString();
  return new Date(Math.min(ms, Date.now() + 60_000)).toISOString();
}

export function sanitizeRankingEntry(raw) {
  if (!raw || typeof raw !== "object") {
    return { ok: false, reason: "INVALID_PAYLOAD" };
  }

  const nameCheck = validatePilotName(raw.name);
  if (!nameCheck.valid) {
    return { ok: false, reason: `NAME_${nameCheck.code}` };
  }

  const rawXp = Number(raw.xp ?? 0);
  const rawStars = Number(raw.stars ?? 0);
  const rawMastered = Number(raw.masteredCount ?? 0);
  const rawMissionsWon = Number(raw.missionsWon ?? 0);
  if (!Number.isFinite(rawXp) || rawXp < 0 || rawXp > RANKING_LIMITS.MAX_XP) {
    return { ok: false, reason: "XP_OUT_OF_BOUNDS" };
  }
  if (!Number.isFinite(rawStars) || rawStars < 0 || rawStars > RANKING_LIMITS.MAX_STARS) {
    return { ok: false, reason: "STARS_OUT_OF_BOUNDS" };
  }
  if (!Number.isFinite(rawMastered) || rawMastered < 0 || rawMastered > RANKING_LIMITS.MAX_MASTERED) {
    return { ok: false, reason: "MASTERED_OUT_OF_BOUNDS" };
  }
  if (!Number.isFinite(rawMissionsWon) || rawMissionsWon < 0 || rawMissionsWon > RANKING_LIMITS.MAX_MISSIONS_WON) {
    return { ok: false, reason: "MISSIONS_OUT_OF_BOUNDS" };
  }

  const pilotId = normalizePilotId(raw.pilotId, nameCheck.cleanName);
  const depth = RANKING_LIMITS.VALID_DEPTHS.includes(raw.depth) ? raw.depth : "explorer";
  const avatar = RANKING_LIMITS.VALID_AVATARS.includes(raw.avatar)
    ? raw.avatar
    : "campinas-analyst";

  const entry = {
    pilotId,
    name: nameCheck.cleanName,
    avatar,
    depth,
    xp: Math.floor(rawXp),
    stars: Math.floor(rawStars),
    masteredCount: clampInt(rawMastered, RANKING_LIMITS.MAX_MASTERED),
    missionsWon: clampInt(rawMissionsWon, RANKING_LIMITS.MAX_MISSIONS_WON),
    badgesCount: clampInt(raw.badgesCount ?? 0, RANKING_LIMITS.MAX_BADGES),
    updatedAt: parseIsoDate(raw.updatedAt),
  };

  if (entry.xp <= 0 && entry.stars <= 0 && entry.masteredCount <= 0 && entry.missionsWon <= 0 && entry.badgesCount <= 0) {
    return { ok: false, reason: "NO_PROGRESS_YET" };
  }

  return { ok: true, entry };
}

export function sortRankingRows(rows = []) {
  return [...rows].sort((a, b) => {
    if ((b.xp || 0) !== (a.xp || 0)) return (b.xp || 0) - (a.xp || 0);
    if ((b.stars || 0) !== (a.stars || 0)) return (b.stars || 0) - (a.stars || 0);
    if ((b.masteredCount || 0) !== (a.masteredCount || 0)) {
      return (b.masteredCount || 0) - (a.masteredCount || 0);
    }
    if ((b.missionsWon || 0) !== (a.missionsWon || 0)) {
      return (b.missionsWon || 0) - (a.missionsWon || 0);
    }
    return Date.parse(b.updatedAt || 0) - Date.parse(a.updatedAt || 0);
  });
}

function findMatchingRowIndex(rows, incoming) {
  if (incoming.pilotId && !incoming.pilotId.startsWith("legacy:")) {
    const byId = rows.findIndex((r) => normalizePilotId(r.pilotId, r.name) === incoming.pilotId);
    if (byId >= 0) return byId;
    // Upgrade legacy row only if same lowercase name had no real UUID
    return rows.findIndex((r) => {
      const pid = normalizePilotId(r.pilotId, r.name);
      return pid.startsWith("legacy:") && String(r.name || "").trim().toLowerCase() === incoming.name.toLowerCase();
    });
  }
  return rows.findIndex(
    (r) => String(r.name || "").trim().toLowerCase() === incoming.name.toLowerCase()
  );
}

export function mergeRankingEntry(existingRows = [], incomingRaw, maxRows = RANKING_LIMITS.MAX_ROWS) {
  const checked = sanitizeRankingEntry(incomingRaw);
  if (!checked.ok) {
    return { ok: false, reason: checked.reason, rows: sortRankingRows(existingRows).slice(0, maxRows) };
  }

  const next = checked.entry;
  const normalizedList = [];
  for (const row of Array.isArray(existingRows) ? existingRows : []) {
    const cleanRow = sanitizeRankingEntry(row);
    if (cleanRow.ok) normalizedList.push(cleanRow.entry);
  }

  const matchIdx = findMatchingRowIndex(normalizedList, next);
  let finalEntry = next;
  if (matchIdx >= 0) {
    const prev = normalizedList[matchIdx];
    finalEntry = {
      pilotId: !next.pilotId.startsWith("legacy:") ? next.pilotId : prev.pilotId,
      name: next.name,
      avatar: next.avatar,
      depth: next.depth,
      xp: Math.max(prev.xp || 0, next.xp),
      stars: Math.max(prev.stars || 0, next.stars),
      masteredCount: Math.max(prev.masteredCount || 0, next.masteredCount),
      missionsWon: Math.max(prev.missionsWon || 0, next.missionsWon),
      badgesCount: Math.max(prev.badgesCount || 0, next.badgesCount),
      updatedAt:
        Date.parse(next.updatedAt) >= Date.parse(prev.updatedAt || 0)
          ? next.updatedAt
          : prev.updatedAt,
    };
    normalizedList[matchIdx] = finalEntry;
  } else {
    normalizedList.push(finalEntry);
  }

  const rows = sortRankingRows(normalizedList).slice(0, maxRows);
  return { ok: true, entry: finalEntry, rows };
}

export function mergeRankingLists(primaryRows = [], secondaryRows = [], maxRows = RANKING_LIMITS.MAX_ROWS) {
  let acc = [];
  for (const row of Array.isArray(primaryRows) ? primaryRows : []) {
    const res = mergeRankingEntry(acc, row, maxRows * 2);
    if (res.ok) acc = res.rows;
  }
  for (const row of Array.isArray(secondaryRows) ? secondaryRows : []) {
    const res = mergeRankingEntry(acc, row, maxRows * 2);
    if (res.ok) acc = res.rows;
  }
  return sortRankingRows(acc).slice(0, maxRows);
}
