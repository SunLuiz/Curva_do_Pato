const API_BASE = (import.meta.env.VITE_API_BASE || "").replace(/\/$/, "");

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

export function getTrend({ region, lat, lon, variable = "T2M", start = 1984, end = 2025 }) {
  const params = new URLSearchParams({ variable, start: String(start), end: String(end) });
  if (region) {
    params.set("region", region);
  } else if (lat !== undefined && lon !== undefined) {
    params.set("lat", String(lat));
    params.set("lon", String(lon));
  }
  const cachePath = region ? `/cache/trend_${region}_${variable}.json` : null;
  return fetchWithFallback(`/api/trend?${params.toString()}`, cachePath, 15000);
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
