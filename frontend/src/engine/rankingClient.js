import {
  buildRankingEntry,
  loadHallOfFame,
  saveHallOfFameRows,
} from "../academy/storage.js";
import { mergeRankingLists, sortRankingRows } from "./rankingModel.js";

export const DEFAULT_GLOBAL_RANKING_URL = "https://www.curveofduck.xyz/api/ranking";

export function resolveRankingEndpoint({ envUrl, loc } = {}) {
  const configured = String(
    envUrl !== undefined ? envUrl : import.meta.env?.VITE_RANKING_API_URL || ""
  ).trim();
  if (configured) return configured.replace(/\/$/, "");

  const targetLoc = loc !== undefined ? loc : typeof window !== "undefined" ? window.location : null;
  const host = String(targetLoc?.hostname || "").toLowerCase();
  if (host.endsWith("curveofduck.xyz") || host.endsWith(".vercel.app")) {
    return "/api/ranking";
  }
  return DEFAULT_GLOBAL_RANKING_URL;
}

async function fetchJsonSafely(url, options = {}, timeoutMs = 4500, fetchImpl = globalThis.fetch) {
  if (typeof fetchImpl !== "function") {
    throw new Error("fetch unavailable");
  }
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { ...options, signal: ac.signal });
    const ct = res.headers?.get?.("content-type") || "";
    if (!ct.includes("application/json")) {
      throw new Error(`Unexpected content-type: ${ct || "none"}`);
    }
    const data = await res.json();
    return { ok: res.ok, status: res.status, data };
  } finally {
    clearTimeout(timer);
  }
}

export async function fetchGlobalRanking({
  localRows,
  endpoint,
  timeoutMs = 4500,
  fetchImpl = globalThis.fetch,
  store,
} = {}) {
  const local = Array.isArray(localRows) ? localRows : loadHallOfFame(store);
  const target = endpoint || resolveRankingEndpoint();

  try {
    const { ok, data } = await fetchJsonSafely(target, { method: "GET" }, timeoutMs, fetchImpl);
    if (!ok) {
      return {
        connected: false,
        configured: false,
        mode: "local_only",
        storage: "browser_local",
        rows: sortRankingRows(local),
        syncedAt: null,
      };
    }

    if (data?.status === "unconfigured") {
      return {
        connected: true,
        configured: false,
        mode: "local_only",
        storage: "unconfigured",
        rows: sortRankingRows(local),
        syncedAt: null,
      };
    }

    if (data?.status === "ok" && Array.isArray(data.rows)) {
      const merged = mergeRankingLists(data.rows, local);
      saveHallOfFameRows(merged, store);
      return {
        connected: true,
        configured: true,
        mode: "global_live",
        storage: data.storage || "remote",
        rows: merged,
        syncedAt: data.syncedAt || new Date().toISOString(),
      };
    }
  } catch {
    // Graceful silent fallback when offline or remote endpoint is unavailable
  }

  return {
    connected: false,
    configured: false,
    mode: "local_only",
    storage: "browser_local",
    rows: sortRankingRows(local),
    syncedAt: null,
  };
}

export async function submitGlobalRanking(
  profile,
  { localRows, endpoint, timeoutMs = 4500, fetchImpl = globalThis.fetch, store } = {}
) {
  const local = Array.isArray(localRows) ? localRows : loadHallOfFame(store);
  const entry = buildRankingEntry(profile);
  if (!entry) {
    return {
      skipped: true,
      connected: false,
      persisted: false,
      mode: "local_only",
      storage: "browser_local",
      rows: sortRankingRows(local),
      syncedAt: null,
    };
  }

  const target = endpoint || resolveRankingEndpoint();
  try {
    const { ok, data } = await fetchJsonSafely(
      target,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      },
      timeoutMs,
      fetchImpl
    );

    if (ok && data?.status === "ok" && data?.persisted && Array.isArray(data.rows)) {
      const merged = mergeRankingLists(data.rows, local);
      saveHallOfFameRows(merged, store);
      return {
        skipped: false,
        connected: true,
        configured: true,
        persisted: true,
        mode: "global_live",
        storage: data.storage || "remote",
        rows: merged,
        syncedAt: data.syncedAt || new Date().toISOString(),
      };
    }

    if (ok && data?.status === "unconfigured") {
      return {
        skipped: false,
        connected: true,
        configured: false,
        persisted: false,
        mode: "local_only",
        storage: "unconfigured",
        rows: sortRankingRows(local),
        syncedAt: null,
      };
    }
  } catch {
    // Offline fallback stays silent so gameplay and UX never stall
  }

  return {
    skipped: false,
    connected: false,
    configured: false,
    persisted: false,
    mode: "local_only",
    storage: "browser_local",
    rows: sortRankingRows(local),
    syncedAt: null,
  };
}
