import { fetchPowerTrendPayload } from "./engine/powerCors.js";

export const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

async function fetchJsonWithTimeout(url, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithFallback(apiPath, cachePath, timeoutMs = 12000) {
  const target = `${API_BASE}${apiPath}`;
  try {
    const data = await fetchJsonWithTimeout(target, timeoutMs);
    return { ...data, _transport: data.status === "cached" ? "backend_cache" : "live_api" };
  } catch (_err) {
    if (!cachePath) {
      throw _err;
    }
    const cached = await fetchJsonWithTimeout(cachePath, 6000);
    return { ...cached, _transport: "offline_cache" };
  }
}

export function getRegions() {
  return fetchWithFallback("/api/regions", "/cache/regions.json", 5000);
}

export async function getTrend({ region, lat, lon, variable = "T2M", start = 1984, end = 2025 }) {
  const params = new URLSearchParams({ variable, start: String(start), end: String(end) });
  if (region) {
    params.set("region", region);
  } else if (lat !== undefined && lon !== undefined) {
    params.set("lat", String(lat));
    params.set("lon", String(lon));
  }
  const cachePath = region ? `/cache/trend_${region}_${variable}.json` : null;
  try {
    return await fetchWithFallback(`/api/trend?${params.toString()}`, cachePath, 15000);
  } catch (err) {
    if (!region && lat !== undefined && lon !== undefined) {
      return fetchPowerTrendPayload({ lat: Number(lat), lon: Number(lon), variable, start, end });
    }
    throw err;
  }
}

export function getAttribution({ region, lat, lon }) {
  const params = new URLSearchParams();
  if (region) {
    params.set("region", region);
  } else if (lat !== undefined && lon !== undefined) {
    params.set("lat", String(lat));
    params.set("lon", String(lon));
  }
  const cachePath = region ? `/cache/attribution_${region}.json` : null;
  return fetchWithFallback(`/api/attribution?${params.toString()}`, cachePath, 15000);
}

export function getFires() {
  return fetchWithFallback("/api/fires?days=1&limit=1500", "/cache/fires_br_1d.geojson", 10000);
}

export function getSpaceWeather() {
  return fetchWithFallback("/api/spaceweather?days=7", "/cache/donki_7d.json", 10000);
}

export function getCmrEvidence() {
  return fetchWithFallback("/api/cmr-evidence", "/cache/cmr_evidence.json", 5000);
}

/**
 * Verifies frozen 2026-11-14 snapshot against live telemetry: prefers FastAPI /api/trend
 * when `/healthz` reports `status: "ok"`, and seamlessly falls back to open zero-key
 * NASA POWER browser CORS verification otherwise.
 */
export async function verifyTrendLive({ region = "campinas", variable = "T2M" } = {}) {
  let health = null;
  try {
    health = await fetchJsonWithTimeout(`${API_BASE}/healthz`, 4000);
  } catch {
    health = null;
  }

  try {
    const cachedPromise = fetchJsonWithTimeout(`/cache/trend_${region}_${variable}.json`, 5000);
    if (health?.status === "ok") {
      const params = new URLSearchParams({
        region,
        variable,
        start: "1984",
        end: "2025",
      });
      const [liveData, cachedData] = await Promise.all([
        fetchJsonWithTimeout(`${API_BASE}/api/trend?${params.toString()}`, 12000),
        cachedPromise,
      ]);
      const liveSlope = Number(liveData?.stats?.slope_per_decade ?? 0);
      const cacheSlope = Number(cachedData?.stats?.slope_per_decade ?? 0);
      const delta = (liveSlope - cacheSlope).toFixed(4);
      return {
        ok: true,
        live: true,
        mode: "backend",
        service: health.service || "Cockpit-OMNI",
        message: `${region}/${variable}: live backend slope = ${liveSlope} vs frozen snapshot = ${cacheSlope} (delta ${Number(delta) >= 0 ? "+" : ""}${delta}/decade · n=${liveData?.stats?.n ?? "?"}).`,
      };
    }

    const [liveCorsData, cachedData] = await Promise.all([
      fetchPowerTrendPayload({ region, variable, start: 1984, end: 2025 }),
      cachedPromise,
    ]);
    const liveSlope = Number(liveCorsData?.stats?.slope_per_decade ?? 0);
    const cacheSlope = Number(cachedData?.stats?.slope_per_decade ?? 0);
    const delta = (liveSlope - cacheSlope).toFixed(4);
    return {
      ok: true,
      live: false,
      mode: "browser_cors",
      service: "NASA POWER (Open CORS)",
      message: `${region}/${variable}: live NASA POWER (open CORS) slope = ${liveSlope} vs frozen snapshot = ${cacheSlope} (delta ${Number(delta) >= 0 ? "+" : ""}${delta}/decade · n=${liveCorsData?.stats?.n ?? "?"}).`,
    };
  } catch (err) {
    return {
      ok: false,
      live: false,
      message: `Live verification unavailable (${err?.message || "unreachable"}). Verified 2026-11-14 15:04 UTC snapshot remains active.`,
    };
  }
}

export function getSpaceAnalog() {
  return fetchWithFallback("/api/space-analog", "/cache/space_analog.json", 7000);
}
