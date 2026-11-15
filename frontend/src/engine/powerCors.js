import { computeTrend } from "./trend.js";
import { tVar } from "../content/i18n.js";

export const POWER_MONTHLY_API = "https://power.larc.nasa.gov/api/temporal/monthly/point";

export const PRESET_COORDS = {
  campinas: {
    id: "campinas",
    name: "Campinas-SP",
    lat: -22.9,
    lon: -47.06,
    biome: "Atlantic Forest / Cerrado Transition",
    context: "Southeast Brazil Industrial & Agribusiness Hub",
  },
  petrolina: {
    id: "petrolina",
    name: "Petrolina-PE",
    lat: -9.39,
    lon: -40.5,
    biome: "Caatinga Semi-Arid",
    context: "Northeast Brazil Solar Generation & Irrigated Agriculture",
  },
  manaus: {
    id: "manaus",
    name: "Manaus-AM",
    lat: -3.1,
    lon: -60.02,
    biome: "Central Amazon Tropical Rainforest",
    context: "Amazon River Basin Climate & Fire Aerosol Monitoring",
  },
};

/**
 * Parse a NASA POWER monthly parameter dictionary into chronological { t, v } rows,
 * dropping annual summary keys (YYYY13) and fill sentinels (<= -900).
 */
export function parsePowerMonthlySeries(paramBag = {}, variable = "T2M") {
  const series = [];
  if (variable === "CLOUD_ATTEN_PCT") {
    const allMap = paramBag.ALLSKY_SFC_SW_DWN || {};
    const clrMap = paramBag.CLRSKY_SFC_SW_DWN || {};
    for (const key of Object.keys(allMap).sort()) {
      if (key.endsWith("13")) continue;
      const a = Number(allMap[key]);
      const c = Number(clrMap[key]);
      if (a <= -900 || c <= -900 || !Number.isFinite(a) || !Number.isFinite(c) || c <= 0) {
        continue;
      }
      series.push({
        t: `${key.slice(0, 4)}-${key.slice(4, 6)}`,
        v: Number(((1 - a / c) * 100).toFixed(4)),
      });
    }
    return series;
  }

  const map = paramBag[variable] || {};
  for (const key of Object.keys(map).sort()) {
    if (key.endsWith("13")) continue;
    const v = Number(map[key]);
    if (v <= -900 || !Number.isFinite(v)) continue;
    series.push({
      t: `${key.slice(0, 4)}-${key.slice(4, 6)}`,
      v: Number(v.toFixed(4)),
    });
  }
  return series;
}

/**
 * Fetch open zero-key NASA POWER monthly series directly from browser CORS endpoint.
 */
export async function fetchPowerMonthlySeries({
  lat,
  lon,
  variable = "T2M",
  start = 1984,
  end = 2025,
  fetchImpl = globalThis.fetch,
  timeoutMs = 15000,
}) {
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
    throw new Error("Invalid coordinates: latitude must be [-90, 90] and longitude [-180, 180].");
  }
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch API unavailable in this environment.");
  }

  const queryParams =
    variable === "CLOUD_ATTEN_PCT" ? "ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN" : variable;
  const url =
    `${POWER_MONTHLY_API}?parameters=${encodeURIComponent(queryParams)}` +
    `&community=AG&longitude=${Number(lon).toFixed(4)}&latitude=${Number(lat).toFixed(4)}` +
    `&start=${Number(start)}&end=${Number(end)}&format=JSON`;

  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), timeoutMs);
  try {
    const res = await fetchImpl(url, { signal: ac.signal });
    if (!res.ok) {
      throw new Error(`NASA POWER HTTP ${res.status}`);
    }
    const payload = await res.json();
    const paramBag = payload?.properties?.parameter || {};
    return parsePowerMonthlySeries(paramBag, variable);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch live NASA POWER data via open CORS and compute full TrendPage-compatible payload.
 */
export async function fetchPowerTrendPayload({
  region,
  lat,
  lon,
  variable = "T2M",
  start = 1984,
  end = 2025,
  fetchImpl = globalThis.fetch,
  timeoutMs = 15000,
}) {
  const preset = region ? PRESET_COORDS[String(region).toLowerCase()] : null;
  const targetLat = preset ? preset.lat : Number(lat);
  const targetLon = preset ? preset.lon : Number(lon);
  const regionInfo = preset || {
    id: `custom_${targetLat.toFixed(2)}_${targetLon.toFixed(2)}`,
    name: `Custom (${targetLat.toFixed(2)}, ${targetLon.toFixed(2)})`,
    lat: Number(targetLat.toFixed(4)),
    lon: Number(targetLon.toFixed(4)),
    biome: "Custom Coordinates",
    context: "Live zero-key NASA POWER browser CORS query",
  };

  const rawSeries = await fetchPowerMonthlySeries({
    lat: targetLat,
    lon: targetLon,
    variable,
    start,
    end,
    fetchImpl,
    timeoutMs,
  });

  const computed = computeTrend(rawSeries, { minObs: 24 });
  const meta = tVar(variable, "en");

  return {
    region: regionInfo,
    variable,
    label: meta.name || variable,
    unit: meta.unitPlain || "",
    source: "NASA POWER (MERRA-2 / CERES · Open CORS)",
    source_url: "https://power.larc.nasa.gov/",
    stats: computed.stats,
    series: computed.series,
    _transport: "live_cors",
  };
}
