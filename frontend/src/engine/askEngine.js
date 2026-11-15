import { GLOSSARY } from "../content/glossary.js";
import { tVar } from "../content/i18n.js";
import { PRESET_DEFINITIONS } from "./presets.js";
import { computeTrend, fmtP } from "./trend.js";

const CACHE_BASE = "/cache";
const MIN_YEAR = 1984;
const MAX_YEAR = 2025;
const DEFAULT_FIRE_RADIUS_KM = 150;

const cacheMemo = new Map();

const KNOWN_CITIES = [
  { keys: ["sao paulo"], name: "Sao Paulo-SP", lat: -23.5505, lon: -46.6333 },
  { keys: ["brasilia", "df"], name: "Brasilia-DF", lat: -15.7939, lon: -47.8828 },
  { keys: ["rio de janeiro"], name: "Rio de Janeiro-RJ", lat: -22.9068, lon: -43.1729 },
  { keys: ["belem"], name: "Belem-PA", lat: -1.4558, lon: -48.4902 },
  { keys: ["salvador"], name: "Salvador-BA", lat: -12.9714, lon: -38.5014 },
  { keys: ["recife"], name: "Recife-PE", lat: -8.0476, lon: -34.877 },
  { keys: ["fortaleza"], name: "Fortaleza-CE", lat: -3.7319, lon: -38.5267 },
  { keys: ["curitiba"], name: "Curitiba-PR", lat: -25.4284, lon: -49.2733 },
  { keys: ["porto alegre"], name: "Porto Alegre-RS", lat: -30.0346, lon: -51.2177 },
  { keys: ["belo horizonte"], name: "Belo Horizonte-MG", lat: -19.9167, lon: -43.9345 },
  { keys: ["cuiaba"], name: "Cuiaba-MT", lat: -15.6014, lon: -56.0979 },
  { keys: ["tokyo", "toquio"], name: "Tokyo, JP", lat: 35.6762, lon: 139.6503 },
  { keys: ["phoenix"], name: "Phoenix, AZ", lat: 33.4484, lon: -112.074 },
  { keys: ["los angeles"], name: "Los Angeles, CA", lat: 34.0522, lon: -118.2437 },
  { keys: ["madrid"], name: "Madrid, ES", lat: 40.4168, lon: -3.7038 },
];

const REGION_META = {
  campinas: { id: "campinas", name: "Campinas-SP", lat: -22.9, lon: -47.06 },
  petrolina: { id: "petrolina", name: "Petrolina-PE", lat: -9.39, lon: -40.5 },
  manaus: { id: "manaus", name: "Manaus-AM", lat: -3.1, lon: -60.02 },
};

const VARIABLE_ALIASES = [
  { id: "CLOUD_ATTEN_PCT", terms: ["cloud_atten", "cloud atten", "atenuacao", "cobertura de nuvens", "cloud cover", "nebulosidade", "nuvens", "nuvem", "clouds", "cloud"] },
  { id: "CLRSKY_SFC_SW_DWN", terms: ["clrsky", "clear sky", "clear-sky", "ceu limpo", "aerosol", "aerossol", "aerossóis", "fumaca", "smoke", "poluicao"] },
  { id: "ALLSKY_SFC_SW_DWN", terms: ["allsky", "all-sky", "irradian", "radiacao solar", "solar radiation", "radiacao", "insolac", "brightening", "dimming", "fotovoltaic", "photovoltaic", "solar"] },
  { id: "PRECTOTCORR", terms: ["prectot", "precipit", "rainfall", "chuva", "chuvas", "chov", "seca", "drought", "estiagem", "rain"] },
  { id: "RH2M", terms: ["rh2m", "umidade", "humidity", "humid", "relative humidity"] },
  { id: "WS2M", terms: ["ws2m", "wind speed", "velocidade do vento", "vento", "ventos", "wind", "eolic", "rajada", "wind ramp"] },
  { id: "T2M", terms: ["t2m", "temperatura", "temperature", "warm", "aquec", "calor", "heat", "hot", "quente", "frio", "cold", "temp"] },
];

const MONTH_ALIASES = [
  { num: 1, terms: ["january", "janeiro", "jan"] },
  { num: 2, terms: ["february", "fevereiro", "fev", "feb"] },
  { num: 3, terms: ["march", "marco", "mar"] },
  { num: 4, terms: ["april", "abril", "abr", "apr"] },
  { num: 5, terms: ["may", "maio"] },
  { num: 6, terms: ["june", "junho", "jun"] },
  { num: 7, terms: ["july", "julho", "jul"] },
  { num: 8, terms: ["august", "agosto", "ago", "aug"] },
  { num: 9, terms: ["september", "setembro", "set", "sep", "sept"] },
  { num: 10, terms: ["october", "outubro", "out", "oct"] },
  { num: 11, terms: ["november", "novembro", "nov"] },
  { num: 12, terms: ["december", "dezembro", "dez", "dec"] },
];

const GLOSSARY_ALIASES = {
  "theil-sen": ["theil-sen", "theil sen", "sen slope", "sen-slope", "inclinacao de sen"],
  "mann-kendall": ["mann-kendall", "mann kendall", "seasonal mann", "mk test", "teste de mann"],
  "p-value": ["p-value", "p value", "valor-p", "valor p", "significancia estatistica"],
  "duck-curve": ["duck curve", "curva do pato", "duck-curve"],
  cmr: ["common metadata repository", "cmr mcp", "cmr"],
  tau: ["kendall tau", "kendall's tau", "tau de kendall"],
  mpto: ["mpto", "multi-physics", "multiphysics"],
  soc_bio: ["soc_bio", "soc bio", "reserva biologica", "biological circularity"],
  k_reg: ["k_reg", "condutividade do regolito", "regolith conductivity"],
  cloud_atten: ["cloud_atten", "atenuacao por nuvens", "cloud attenuation"],
  impulse_inversion: ["impulse_inversion", "impulse inversion", "inversao por impulso"],
  wheel_slip: ["wheel_slip", "wheel slip", "escorregamento"],
  frame_delta: ["frame_delta", "frame delta"],
  sentinel_value: ["sentinel_value", "sentinel value", "valor sentinela", "-999"],
};

const UNIT_MAP = {
  T2M: "°C",
  PRECTOTCORR: "mm/day",
  ALLSKY_SFC_SW_DWN: "kWh/m²/day",
  CLRSKY_SFC_SW_DWN: "kWh/m²/day",
  CLOUD_ATTEN_PCT: "%",
  RH2M: "%",
  WS2M: "m/s",
};

/** Normalize text by stripping diacritics, lowercasing, and collapsing whitespace. */
export function normalizeText(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hasWord(norm, term) {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|[^a-z0-9_])${escaped}(?:$|[^a-z0-9_])`).test(norm);
}

function matchesAny(norm, terms) {
  return terms.some((t) => (t.includes(" ") || t.length >= 6 ? norm.includes(t) : hasWord(norm, t)));
}

/** Detect response language ('pt' or 'en') from raw query, falling back to UI language. */
export function detectLanguage(question, fallbackLang = "en") {
  const raw = String(question || "");
  const hasPtChars = /[áàâãéêíóôõúçÁÀÂÃÉÊÍÓÔÕÚÇ]/.test(raw);
  const norm = normalizeText(raw);
  const ptWords = [
    "qual", "quais", "como", "quanto", "porque", "por que", "chuva", "calor", "vento", "seca",
    "queimada", "queimadas", "incendio", "nuvem", "nuvens", "espacial", "explica", "significa",
    "ultimos", "maior", "menor", "media", "comparar", "regiao", "regioes", "bioma", "biomas",
    "pato", "curva", "energia", "lua", "marte", "dados", "baixar", "o que e", "perto",
    "temperatura", "resumo", "panorama", "focos", "fogo", "anos", "mes", "sol", "aquecimento",
  ];
  const enWords = [
    "what", "which", "how", "why", "warm", "warming", "rain", "wind", "cloud", "clouds", "fires",
    "space", "trend", "highest", "lowest", "hottest", "driest", "wettest", "average", "explain",
    "between", "last", "meaning", "near", "within", "search", "brightening", "dimming", "biome", "biomes",
  ];
  const ptHits = (hasPtChars ? 2 : 0) + ptWords.filter((w) => matchesAny(norm, [w])).length;
  const enHits = enWords.filter((w) => matchesAny(norm, [w])).length;
  if (ptHits > enHits) return "pt";
  if (enHits > ptHits) return "en";
  return fallbackLang === "pt" ? "pt" : "en";
}

/** Extract explicit lat/lon decimal/signed pair or known reference city coordinates. */
function extractCustomCoords(norm) {
  const labeled = norm.match(
    /lat(?:itude)?\s*[:=]?\s*(-?\d{1,2}(?:\.\d+)?)[,\s;/]+lon(?:gitude)?\s*[:=]?\s*(-?\d{1,3}(?:\.\d+)?)/,
  );
  if (labeled) {
    const lat = Number(labeled[1]);
    const lon = Number(labeled[2]);
    if (isValidLatLon(lat, lon)) return { lat, lon, source: "coords" };
  }

  // Pair like "-23.55, -46.63" or "28.61 -77.20": require decimal or negative sign to avoid years/radius.
  const pairRegex = /(?:^|[\s(])(-?\d{1,2}\.\d+|-\d{1,2})[\s,;]+(-?\d{1,3}\.\d+|-\d{1,3})(?=$|[\s).,;?!])/g;
  for (const m of norm.matchAll(pairRegex)) {
    const lat = Number(m[1]);
    const lon = Number(m[2]);
    if (isValidLatLon(lat, lon)) return { lat, lon, source: "coords" };
  }

  for (const city of KNOWN_CITIES) {
    if (matchesAny(norm, city.keys)) {
      return { lat: city.lat, lon: city.lon, label: city.name, source: "city" };
    }
  }
  return null;
}

function isValidLatLon(lat, lon) {
  return Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
}

function extractYearControls(norm) {
  let yearRange = null;
  const rangeMatch = norm.match(/\b(19[89]\d|20[0-2]\d)\s*(?:-|a|to|ate|and|e)\s*(19[89]\d|20[0-2]\d)\b/);
  if (rangeMatch) {
    const a = clampYear(Number(rangeMatch[1]));
    const b = clampYear(Number(rangeMatch[2]));
    yearRange = a <= b ? [a, b] : [b, a];
  }

  const lastYears = norm.match(/(?:last|ultim[oa]s?|past)\s+(\d{1,2})\s+(?:years?|anos?)/);
  if (!yearRange && lastYears) {
    const span = Math.max(2, Math.min(42, Number(lastYears[1])));
    yearRange = [Math.max(MIN_YEAR, MAX_YEAR - span + 1), MAX_YEAR];
  }

  const sinceMatch = norm.match(/(?:since|desde|a partir de)\s+(19[89]\d|20[0-2]\d)\b/);
  if (!yearRange && sinceMatch) {
    yearRange = [clampYear(Number(sinceMatch[1])), MAX_YEAR];
  }

  let monthFilter = null;
  for (const m of MONTH_ALIASES) {
    if (matchesAny(norm, m.terms)) {
      monthFilter = m.num;
      break;
    }
  }

  let singleYear = null;
  const ymMatch = norm.match(/\b(19[89]\d|20[0-2]\d)[-/](0?[1-9]|1[0-2])\b/);
  if (ymMatch) {
    singleYear = Number(ymMatch[1]);
    monthFilter = Number(ymMatch[2]);
  } else if (!yearRange) {
    const yr = norm.match(/(?:^|\s)(?:in|em|de|year|ano|for)\s+(19[89]\d|20[0-2]\d)\b/);
    if (yr) singleYear = clampYear(Number(yr[1]));
  }

  return { yearRange, monthFilter, singleYear };
}

function clampYear(y) {
  return Math.max(MIN_YEAR, Math.min(MAX_YEAR, y));
}

function extractRegion(norm) {
  if (matchesAny(norm, ["campinas", "mata atlantica", "atlantic forest", "sudeste", "southeast"])) return "campinas";
  if (matchesAny(norm, ["petrolina", "caatinga", "semiarido", "semiarid", "nordeste", "northeast", "sao francisco"])) return "petrolina";
  if (matchesAny(norm, ["manaus", "amazonia", "amazon", "amazonas", "rainforest"])) return "manaus";
  return null;
}

function extractVariable(norm) {
  for (const entry of VARIABLE_ALIASES) {
    if (matchesAny(norm, entry.terms)) return entry.id;
  }
  return null;
}

/** Parse a user question into structured ecosystem entities and flags. */
export function parseQuestion(question, { context = {}, lang = "en" } = {}) {
  const norm = normalizeText(question);
  const resolvedLang = detectLanguage(question, lang);
  const customCoords = extractCustomCoords(norm);
  const explicitRegion = extractRegion(norm);
  const compareAll =
    !customCoords &&
    matchesAny(norm, [
      "compare", "comparar", "comparacao", "all 3", "all three", "tres regioes", "3 regioes",
      "3 biomes", "3 biomas", "todas regioes", "todas as regioes", "which region", "which biome",
      "qual regiao", "qual bioma", "mais aqueceu", "warmest", "fastest", "ranking",
    ]);

  const matchedPresetByCoord =
    customCoords &&
    Object.values(REGION_META).find(
      (r) => Math.abs(r.lat - customCoords.lat) < 0.05 && Math.abs(r.lon - customCoords.lon) < 0.05,
    );

  const regionId =
    explicitRegion ||
    matchedPresetByCoord?.id ||
    (context.region && REGION_META[context.region] ? context.region : "campinas");

  const explicitVar = extractVariable(norm);
  const variableId = explicitVar || context.variable || "T2M";
  const { yearRange, monthFilter, singleYear } = extractYearControls(norm);

  const radiusMatch = norm.match(/(\d+(?:\.\d+)?)\s*km\b/);
  const radiusKm = radiusMatch ? Math.max(5, Math.min(3000, Number(radiusMatch[1]))) : DEFAULT_FIRE_RADIUS_KM;

  const trendRateNoun = matchesAny(norm, [
    "trend", "tendencia", "warming", "aquecimento", "cooling", "resfriamento",
    "slope", "inclinacao", "rate", "taxa", "change", "mudanca", "queda", "drop",
  ]);
  let extremum = null;
  if (matchesAny(norm, ["max", "maximo", "maxima", "hottest", "wettest", "peak", "record", "recorde", "mais quente", "mais chuvoso"])) {
    extremum = "max";
  } else if (matchesAny(norm, ["min", "minimo", "minima", "coldest", "coolest", "driest", "mais frio", "mais seco", "mais seca"])) {
    extremum = "min";
  } else if (!trendRateNoun && matchesAny(norm, ["highest", "warmest", "maior"])) {
    extremum = "max";
  } else if (!trendRateNoun && matchesAny(norm, ["lowest", "menor"])) {
    extremum = "min";
  } else if (matchesAny(norm, ["mean", "average", "media", "climatology", "climatologia"])) {
    extremum = "mean";
  }

  return {
    raw: String(question || "").trim(),
    norm,
    resolvedLang,
    explicitRegion,
    regionId,
    customCoords: matchedPresetByCoord ? null : customCoords,
    compareAll,
    explicitVar,
    variableId,
    yearRange,
    monthFilter,
    singleYear,
    radiusKm,
    extremum,
  };
}

/** Great-circle Haversine distance in kilometers. */
export function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function defaultLoadJson(filename) {
  if (cacheMemo.has(filename)) return cacheMemo.get(filename);
  const res = await fetch(`${CACHE_BASE}/${filename}`);
  if (!res.ok) throw new Error(`Failed loading cache ${filename} (${res.status})`);
  const data = await res.json();
  cacheMemo.set(filename, data);
  return data;
}

function defaultFetch(url, options) {
  return fetch(url, options);
}

function getVarMeta(variableId, lang) {
  const info = tVar(variableId, lang) || {};
  return {
    id: variableId,
    label: info.name || info.label || variableId,
    unit: info.unitPlain || info.unit || UNIT_MAP[variableId] || "",
  };
}

function formatGlossaryEntry(key, lang) {
  const raw = GLOSSARY[key];
  if (!raw) return null;
  const item = raw[lang] || raw.en || raw;
  if (typeof item === "string") return { title: key, body: item };
  const title = item.title || item.term || item.name || key;
  const parts = [item.short || item.summary, item.detail || item.explanation || item.body, item.formula].filter(Boolean);
  return { title, body: parts.join(" ") };
}

function isDefinitionQuestion(norm) {
  return (
    norm.startsWith("what is ") ||
    norm.startsWith("what are ") ||
    norm.startsWith("define ") ||
    norm.startsWith("explain ") ||
    norm.startsWith("o que e ") ||
    norm.startsWith("o que sao ") ||
    norm.startsWith("explique ") ||
    norm.startsWith("explica ") ||
    norm.includes("significa") ||
    norm.includes("meaning of")
  );
}

function findGlossaryMatch(norm) {
  for (const [key, terms] of Object.entries(GLOSSARY_ALIASES)) {
    if (matchesAny(norm, terms)) return key;
  }
  return null;
}

function extractCmrKeyword(raw, norm) {
  const cleaned = norm
    .replace(/\b(search|find|query|look up|buscar|busque|pesquisar|procure|catalog|catalogo|collections|colecoes|earthdata|cmr|nasa|for|por|para|no|na|em|sobre|of|about|the|are|is)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!cleaned || cleaned.length < 3) return null;
  if (matchesAny(cleaned, ["nisar", "ecostress", "viirs", "ceres", "roadmap", "plotted", "plotados"])) return null;
  return raw.length > 0 ? cleaned : null;
}

function summarizeSeriesStats(series, yearRange, monthFilter) {
  const filtered = series.filter((pt) => {
    const yr = Number(pt.t.slice(0, 4));
    const mo = Number(pt.t.slice(5, 7));
    if (yearRange && (yr < yearRange[0] || yr > yearRange[1])) return false;
    if (monthFilter && mo !== monthFilter) return false;
    return Number.isFinite(pt.v);
  });

  if (filtered.length === 0) return null;

  let minPt = filtered[0];
  let maxPt = filtered[0];
  let sum = 0;
  for (const pt of filtered) {
    sum += pt.v;
    if (pt.v < minPt.v) minPt = pt;
    if (pt.v > maxPt.v) maxPt = pt;
  }
  const mean = sum / filtered.length;
  const computed = filtered.length >= 24 ? computeTrend(filtered) : null;
  return { filtered, minPt, maxPt, mean, computed };
}

function buildMonthLabel(num, lang) {
  const namesEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const namesPt = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
  const idx = (num - 1 + 12) % 12;
  return (lang === "pt" ? namesPt : namesEn)[idx];
}

function formatTrendVerdict(stats, varInfo, regionLabel, lang, { yearRange, monthFilter, isSliced } = {}) {
  const unit = varInfo.unit || UNIT_MAP[varInfo.id] || "";
  const scopePt = [
    yearRange ? `${yearRange[0]}-${yearRange[1]}` : `${stats.start?.slice(0, 4) || "1984"}-${stats.end?.slice(0, 4) || "2025"}`,
    monthFilter ? `apenas ${buildMonthLabel(monthFilter, "pt")}` : null,
  ].filter(Boolean).join(" · ");
  const scopeEn = [
    yearRange ? `${yearRange[0]}-${yearRange[1]}` : `${stats.start?.slice(0, 4) || "1984"}-${stats.end?.slice(0, 4) || "2025"}`,
    monthFilter ? `${buildMonthLabel(monthFilter, "en")} only` : null,
  ].filter(Boolean).join(" · ");

  const ci = Array.isArray(stats.ci_95_per_decade)
    ? ` [${stats.ci_95_per_decade[0].toFixed(2)}, ${stats.ci_95_per_decade[1].toFixed(2)}]`
    : "";
  const sign = stats.slope_per_decade > 0 ? "+" : "";
  const dirLabel = stats.significant_5pct
    ? lang === "pt"
      ? stats.slope_per_decade >= 0 ? "tendencia significativa de alta" : "tendencia significativa de queda"
      : stats.slope_per_decade >= 0 ? "significant upward trend" : "significant downward trend"
    : lang === "pt"
      ? "sem tendencia estatisticamente significativa (hipotese nula mantida)"
      : "no statistically significant trend (null hypothesis holds)";

  if (lang === "pt") {
    return `${regionLabel} — ${varInfo.label} (${scopePt}${isSliced ? ", recalculado no navegador" : ""}): ${dirLabel}. Slope Theil-Sen: ${sign}${stats.slope_per_decade.toFixed(3)} ${unit}/decada (IC 95%${ci}), mudanca total ${stats.total_change >= 0 ? "+" : ""}${stats.total_change.toFixed(2)} ${unit}, Kendall tau=${stats.tau.toFixed(3)}, p=${fmtP(stats.p_value)} (n=${stats.n} meses).`;
  }
  return `${regionLabel} — ${varInfo.label} (${scopeEn}${isSliced ? ", recomputed in browser" : ""}): ${dirLabel}. Theil-Sen slope: ${sign}${stats.slope_per_decade.toFixed(3)} ${unit}/decade (95% CI${ci}), total shift ${stats.total_change >= 0 ? "+" : ""}${stats.total_change.toFixed(2)} ${unit}, Kendall tau=${stats.tau.toFixed(3)}, p=${fmtP(stats.p_value)} (n=${stats.n} months).`;
}

function buildOutOfScopeAnswer(parsed) {
  const { norm, resolvedLang: l } = parsed;
  const subHourlyWind =
    matchesAny(norm, ["hourly", "por hora", "minuto", "minute", "5 min", "10 min", "duck curve forecast", "prever rampa", "amanha", "tomorrow", "next week", "proxima semana"]);
  const privateGrid =
    matchesAny(norm, ["ons dispatch", "scada", "substation", "subestacao", "bitcoin", "stock", "receita de", "futebol", "placar", "api key", "groq", "openai"]);

  if (subHourlyWind) {
    return {
      answer: l === "pt"
        ? "Limite honesto do ecossistema: as series NASA POWER integradas no Cockpit possuem resolucao MENSAL (1984-2025). Para velocidade do vento WS2M (m/s), nao ha tendencia secular significativa e medias mensais nao capturam rampas eolicas ou nuvens em minutos/horas. Para despacho sub-horario da Curva do Pato, e preciso integrar dados de estacoes em superficie ou modelos NWP horarios."
        : "Honest dataset boundary: NASA POWER series integrated in Cockpit use MONTHLY resolution (1984-2025). Monthly WS2M wind shows no significant long-term trend and cannot resolve sub-hourly wind ramps or minute-scale Duck Curve dispatch; that requires surface anemometer or hourly NWP telemetry.",
      sourceBadge: l === "pt" ? "Limite Cientifico Verificado" : "Verified Boundary",
      action: { route: "/cockpit", tab: "trend", region: parsed.regionId, variable: "WS2M" },
      resolvedLang: l,
      detectedTopic: "boundary",
    };
  }

  if (privateGrid) {
    return {
      answer: l === "pt"
        ? "Isso fica fora do escopo aberto deste ecossistema NASA: o Cockpit-OMNI usa apenas dados cientificos abertos da NASA (POWER, FIRMS, DONKI, Earthdata CMR, DSN, OSDR e CelesTrak) sem chaves privadas ou telemetria fechada de concessionarias/mercado. Posso responder sobre tendencias climaticas (1984-2025 ou lat/lon customizado), queimadas FIRMS, alertas solares DONKI, catalogo CMR ou microrredes espaciais MPTO."
        : "That falls outside this open NASA ecosystem: Cockpit-OMNI operates strictly on open NASA science telemetry (POWER, FIRMS, DONKI, Earthdata CMR, DSN, OSDR, and CelesTrak) with zero private keys or closed utility telemetry. Ask me about climate trends (1984-2025 or any lat,lon), FIRMS fires, DONKI solar alerts, CMR datasets, or MPTO space analogs.",
      sourceBadge: l === "pt" ? "Escopo Aberto NASA" : "Open NASA Scope",
      action: null,
      resolvedLang: l,
      detectedTopic: "out_of_scope",
    };
  }
  return null;
}

async function handleGlossary(parsed, { onlyExplicitDefinition = false } = {}) {
  const { norm, resolvedLang: l } = parsed;
  const key = findGlossaryMatch(norm);
  if (!key) return null;

  const blockedByAction = matchesAny(norm, [
    "frontier", "fronteiras", "frontiers", "7", "dsn", "osdr", "celestrak",
    "search", "buscar", "pesquisar", "procure", "nisar", "ecostress", "plotted", "collection", "colec",
  ]);
  if (blockedByAction) return null;

  if (onlyExplicitDefinition && !isDefinitionQuestion(norm) && key !== "duck-curve") {
    return null;
  }

  // Let climate/space handlers add live numbers if user asked about metrics + data, unless explicit definition prompt
  if (key === "duck-curve" || isDefinitionQuestion(norm) || !parsed.explicitRegion) {
    const entry = formatGlossaryEntry(key, l);
    if (!entry) return null;
    const isSpaceTerm = ["mpto", "soc_bio", "k_reg", "impulse_inversion", "wheel_slip", "frame_delta"].includes(key);
    return {
      answer: `${entry.title}: ${entry.body}`,
      sourceBadge: l === "pt" ? "Glossario Cientifico" : "Scientific Glossary",
      action: isSpaceTerm
        ? { route: "/cockpit", tab: "space" }
        : { route: "/cockpit", tab: "trend", region: parsed.regionId, variable: parsed.variableId },
      resolvedLang: l,
      detectedTopic: `glossary:${key}`,
    };
  }
  return null;
}

async function handleDonki(parsed, loadJson) {
  const { norm, resolvedLang: l } = parsed;
  const isDonki = matchesAny(norm, [
    "donki", "solar", "flare", "flares", "cme", "coronal", "geomagnetic", "geomagnetica",
    "tempestade solar", "space weather", "clima espacial", "rbe", "radiation belt", "mancha solar",
  ]) && !matchesAny(norm, ["irradian", "allsky", "clrsky", "solar radiation", "radiacao solar", "fotovoltaic", "photovoltaic", "kwh"]);

  if (!isDonki) return null;

  const data = await loadJson("donki_7d.json");
  const events = Array.isArray(data.events) ? data.events : [];
  const counts = {};
  for (const ev of events) {
    counts[ev.type] = (counts[ev.type] || 0) + 1;
  }
  const breakdown = Object.entries(counts).map(([k, v]) => `${k}: ${v}`).join(", ");
  const latest = events[0];
  const latestLine = latest
    ? `${latest.type} (${latest.time}) — ${String(latest.summary || "").slice(0, 140).trim()}...`
    : "-";

  const answer = l === "pt"
    ? `NASA DONKI (janela de ${data.window_days || 7} dias: ${data.start_date} a ${data.end_date}): ${data.count} alertas registrados (${breakdown || "sem tipos"}). Mais recente: ${latestLine} Monitoramento relevante para correntes geomagneticamente induzidas (GIC) em linhas de transmissao e protecao de satelites.`
    : `NASA DONKI (${data.window_days || 7}-day window: ${data.start_date} to ${data.end_date}): ${data.count} events recorded (${breakdown || "none"}). Latest: ${latestLine} Tracked for grid GIC resilience and orbital hardware safety.`;

  return {
    answer,
    sourceBadge: "NASA DONKI (Cache 7d)",
    action: { route: "/cockpit", tab: "space" },
    resolvedLang: l,
    detectedTopic: "donki",
  };
}

async function handleCmr(parsed, loadJson, fetchLive, timeoutMs) {
  const { raw, norm, resolvedLang: l } = parsed;
  const isCmr = matchesAny(norm, [
    "cmr", "earthdata", "nisar", "ecostress", "granule", "granulos", "catalog", "catalogo",
    "collections", "colecoes", "colecao", "roadmap", "plotted", "plotado", "smap", "landsat", "sentinel",
  ]);
  if (!isCmr) return null;

  const evidence = await loadJson("cmr_evidence.json");
  const keyword = extractCmrKeyword(raw, norm);

  if (keyword && !matchesAny(norm, ["nisar", "ecostress"])) {
    try {
      const url = `https://cmr.earthdata.nasa.gov/search/collections.json?keyword=${encodeURIComponent(keyword)}&page_size=4`;
      const res = await fetchWithTimeout(fetchLive, url, timeoutMs);
      if (res.ok) {
        const json = await res.json();
        const entries = json?.feed?.entry || [];
        if (entries.length > 0) {
          const formatted = entries
            .map((e) => `• ${e.short_name || e.id} (${e.id}, ${e.data_center || "NASA"}): ${e.title}`)
            .join("\n");
          return {
            answer: l === "pt"
              ? `Busca aberta ao vivo no NASA Earthdata CMR para "${keyword}" (${entries.length} principais colecoes sem precisar de chave):\n${formatted}`
              : `Live open NASA Earthdata CMR catalog search for "${keyword}" (${entries.length} top collections, zero API key):\n${formatted}`,
            sourceBadge: "NASA Earthdata CMR (Live Open API)",
            action: { route: "/cockpit", tab: "sources", region: parsed.regionId, variable: parsed.variableId },
            resolvedLang: l,
            detectedTopic: "cmr_live",
          };
        }
      }
    } catch {
      // Fall through cleanly to local verified CMR evidence snapshot
    }
  }

  const queries = evidence.queries || {};
  const list = Object.entries(queries)
    .map(([role, item]) => `• ${role}: ${item.short_name} (${item.concept_id})`)
    .join("\n");

  const answer = l === "pt"
    ? `Evidencias verificadas no NASA Earthdata CMR (${evidence.verified_at_utc?.slice(0, 10) || "snapshot"}):\n${list}\nNota: NISAR (${queries.geothermal_nisar?.short_name || "NISAR_L2_GUNW_PROVISIONAL_V1"}) e ECOSTRESS (${queries.geothermal_ecostress?.short_name || "ECO_L2T_LSTE"}) sao colecoes catalogadas como roadmap pos-MVP (granulos SAR multi-GB e autenticacao Earthdata) — nunca plotadas de forma ficticia nos graficos.`
    : `Verified NASA Earthdata CMR collections (${evidence.verified_at_utc?.slice(0, 10) || "snapshot"}):\n${list}\nNote: NISAR (${queries.geothermal_nisar?.short_name || "NISAR_L2_GUNW_PROVISIONAL_V1"}) and ECOSTRESS (${queries.geothermal_ecostress?.short_name || "ECO_L2T_LSTE"}) are cited honestly as post-MVP roadmap vectors (multi-GB SAR granules & Earthdata auth) and are never fabricated in charts.`;

  return {
    answer,
    sourceBadge: "NASA Earthdata CMR Snapshot",
    action: { route: "/cockpit", tab: "sources", region: parsed.regionId, variable: parsed.variableId },
    resolvedLang: l,
    detectedTopic: "cmr_evidence",
  };
}

async function handleSpaceAnalog(parsed, loadJson) {
  const { norm, resolvedLang: l } = parsed;
  const isSpace = matchesAny(norm, [
    "mpto", "dsn", "deep space", "goldstone", "canberra", "dss", "jwst", "kplo", "nhpc",
    "osdr", "osd-615", "arabidopsis", "veggie", "celestrak", "iss", "zarya", "eclipse",
    "lunar", "lua", "moon", "crater", "cratera", "mars", "marte", "meda", "perseverance",
    "horizons", "rover", "rovers", "regolith", "regolito", "stirling", "isru", "radiator", "radiador",
    "space analog", "analogo espacial", "frontiers", "fronteiras",
  ]);
  if (!isSpace) return null;

  const sa = await loadJson("space_analog.json");
  const parts = [];

  if (matchesAny(norm, ["dsn", "deep space", "goldstone", "canberra", "dss", "jwst", "kplo", "nhpc", "antenna", "antena"])) {
    const active = (sa.dsn?.sample_active || [])
      .filter((d) => Array.isArray(d.targets) && d.targets.length > 0)
      .map((d) => `${d.name}->${d.targets.join("/")}${d.down_band ? ` (${d.down_band})` : ""}`)
      .slice(0, 5)
      .join(", ");
    parts.push(
      l === "pt"
        ? `DSN Now: ${sa.dsn?.stations_count} complexos (${(sa.dsn?.stations || []).join(", ")}), ${sa.dsn?.active_dishes_count}/${sa.dsn?.total_dishes} antenas ativas (amostra: ${active}).`
        : `DSN Now: ${sa.dsn?.stations_count} complexes (${(sa.dsn?.stations || []).join(", ")}), ${sa.dsn?.active_dishes_count}/${sa.dsn?.total_dishes} active dishes (sample: ${active}).`,
    );
  }

  if (matchesAny(norm, ["osdr", "osd-615", "arabidopsis", "veggie", "soc_bio", "biolog", "plant"])) {
    parts.push(
      l === "pt"
        ? `NASA OSDR ${sa.osdr?.study_id}: ${sa.osdr?.title}. Papel no MPTO: ${sa.osdr?.biological_role}`
        : `NASA OSDR ${sa.osdr?.study_id}: ${sa.osdr?.title}. Role in MPTO: ${sa.osdr?.biological_role}`,
    );
  }

  if (matchesAny(norm, ["celestrak", "iss", "zarya", "orbit", "orbita", "eclipse", "norad"])) {
    const c = sa.celestrak;
    parts.push(
      l === "pt"
        ? `CelesTrak (${c?.objects_count} estacoes): ${c?.object_name}, inclinacao ${c?.inclination_deg}°, periodo orbital ${c?.orbital_period_min} min com ~${c?.approx_eclipse_min} min de eclipse (${c?.approx_eclipse_pct}% da orbita).`
        : `CelesTrak (${c?.objects_count} stations): ${c?.object_name}, inclination ${c?.inclination_deg}°, orbital period ${c?.orbital_period_min} min with ~${c?.approx_eclipse_min} min eclipse (${c?.approx_eclipse_pct}% per orbit).`,
    );
  }

  if (matchesAny(norm, ["meda", "mars", "marte", "perseverance", "horizons"])) {
    const clients = (sa.existing_clients || []).map((c) => c.label).join("; ");
    parts.push(
      l === "pt"
        ? `Clientes planetarios configurados: ${clients}.`
        : `Configured planetary telemetry clients: ${clients}.`,
    );
  }

  if (parts.length === 0 || matchesAny(norm, ["mpto", "frontier", "fronteira", "regolith", "regolito", "lunar", "lua", "moon", "crater", "rover", "radiator", "stirling", "isru"])) {
    const frontiers = sa.mpto_frontiers || [];
    const lines = frontiers.map((f) =>
      `${f.id}. ${l === "pt" ? f.title_pt : f.title_en}: ${l === "pt" ? f.detail_pt : f.detail_en}`,
    );
    parts.push(
      (l === "pt"
        ? `Analogo Espacial MPTO (7 fronteiras de microrrede lunar/marciana, snapshot ${sa.fetched_at_utc?.slice(0, 10)}):\n`
        : `Space Analog MPTO (7 lunar/Martian microgrid frontiers, snapshot ${sa.fetched_at_utc?.slice(0, 10)}):\n`) +
        lines.join("\n"),
    );
  }

  return {
    answer: parts.join("\n\n"),
    sourceBadge: "NASA Space Analog (DSN · OSDR · CelesTrak · MPTO)",
    action: { route: "/cockpit", tab: "space" },
    resolvedLang: l,
    detectedTopic: "space_analog",
  };
}

async function handleFirms(parsed, loadJson) {
  const { norm, resolvedLang: l, radiusKm, customCoords, regionId } = parsed;
  const isFire = matchesAny(norm, [
    "fire", "fires", "firms", "fogo", "queimada", "queimadas", "incendio", "incendios",
    "frp", "hotspot", "hotspots", "focos", "foco", "viirs",
  ]);
  if (!isFire) return null;

  const geo = await loadJson("fires_br_1d.geojson");
  const features = Array.isArray(geo.features) ? geo.features : [];

  const target = customCoords
    ? { label: customCoords.label || `${customCoords.lat.toFixed(2)}, ${customCoords.lon.toFixed(2)}`, lat: customCoords.lat, lon: customCoords.lon }
    : REGION_META[regionId];

  const statsForPoint = (lat, lon) => {
    let nearby = 0;
    let nearestDist = Infinity;
    let maxFrp = 0;
    for (const f of features) {
      const coords = f?.geometry?.coordinates;
      if (!Array.isArray(coords) || coords.length < 2) continue;
      const dist = haversineKm(lat, lon, coords[1], coords[0]);
      const frp = Number(f?.properties?.frp) || 0;
      if (frp > maxFrp) maxFrp = frp;
      if (dist <= radiusKm) nearby += 1;
      if (dist < nearestDist) nearestDist = dist;
    }
    return { nearby, nearestDist, maxFrp };
  };

  if (parsed.compareAll) {
    const rows = Object.values(REGION_META).map((r) => {
      const s = statsForPoint(r.lat, r.lon);
      return `• ${r.name}: ${s.nearby} (${l === "pt" ? "mais proximo" : "nearest"} ${s.nearestDist.toFixed(1)} km)`;
    });
    return {
      answer: l === "pt"
        ? `NASA FIRMS (${geo.dataset || "viirs_noaa21"}, 24h Brasil): ${geo.count} deteccoes totais (amostra de ${geo.returned_features} no mapa, FRP medio ${geo.mean_frp_mw} MW). Contagem em raio de ${radiusKm} km:\n${rows.join("\n")}`
        : `NASA FIRMS (${geo.dataset || "viirs_noaa21"}, 24h Brazil): ${geo.count} total detections (${geo.returned_features} plotted sample, mean FRP ${geo.mean_frp_mw} MW). Detections within ${radiusKm} km:\n${rows.join("\n")}`,
      sourceBadge: `NASA FIRMS 24h (${geo.cmr_concept_id || "VIIRS"})`,
      action: { route: "/cockpit", tab: "live", region: regionId },
      resolvedLang: l,
      detectedTopic: "firms_compare",
    };
  }

  const res = statsForPoint(target.lat, target.lon);
  const answer = l === "pt"
    ? `NASA FIRMS (${geo.dataset || "viirs_noaa21"}, 24h): ${geo.count} focos no Brasil (amostra de ${geo.returned_features} pontos, FRP medio ${geo.mean_frp_mw} MW, pico na amostra ${res.maxFrp.toFixed(1)} MW). Em um raio de ${radiusKm} km de ${target.label}: ${res.nearby} focos detectados (mais proximo a ${res.nearestDist.toFixed(1)} km).`
    : `NASA FIRMS (${geo.dataset || "viirs_noaa21"}, 24h): ${geo.count} Brazil detections (${geo.returned_features} in GeoJSON sample, mean FRP ${geo.mean_frp_mw} MW, sample peak ${res.maxFrp.toFixed(1)} MW). Within ${radiusKm} km of ${target.label}: ${res.nearby} hotspots detected (closest ${res.nearestDist.toFixed(1)} km away).`;

  return {
    answer,
    sourceBadge: `NASA FIRMS 24h (${geo.cmr_concept_id || "VIIRS"})`,
    action: { route: "/cockpit", tab: "live", region: regionId },
    resolvedLang: l,
    detectedTopic: "firms",
  };
}

async function handleAttribution(parsed, loadJson) {
  const { norm, resolvedLang: l, regionId } = parsed;
  const isFireCountQuery = matchesAny(norm, ["how many", "quantos", "quais focos", "within", "raio", "dentro de", "perto de", "near"]);
  const isAttr = !isFireCountQuery && matchesAny(norm, [
    "why", "por que", "porque", "atribuicao", "attribution", "driver", "drivers", "causa", "fator",
    "cloud vs", "clouds or", "smoke", "nuvens ou", "brilho", "brightening", "dimming", "aerosol", "aerossol",
    "vectors", "vetores", "multisource", "multifonte",
  ]);
  if (!isAttr) return null;

  const attr = await loadJson(`attribution_${regionId}.json`);
  const regionName = attr.region?.name || REGION_META[regionId]?.name || regionId;
  const ht = attr.headline_temperature;
  const hydro = (attr.vectors || []).find((v) => v.id === "hydrometeorological");
  const fire = (attr.vectors || []).find((v) => v.id === "fire_aerosol");
  const helio = (attr.vectors || []).find((v) => v.id === "heliophysical");

  const hd = hydro?.details || {};
  const fd = fire?.details || {};

  const answer = l === "pt"
    ? `Atribuicao Multifonte — ${regionName} (${attr.period || "1984-2025"}):\n• Temperatura T2M: +${ht?.slope_per_decade?.toFixed(3)} °C/decada (${ht?.total_change >= 0 ? "+" : ""}${ht?.total_change?.toFixed(2)} °C total, p=${fmtP(ht?.p_value)}).\n• Hidrometeorologia & Nuvens: Chuva ${hd.precip_slope_per_decade?.toFixed(3)} mm/dia/dec (p=${fmtP(hd.precip_p_value)}), Atenuacao por Nuvens ${hd.cloud_attenuation_slope_per_decade?.toFixed(3)} %/dec (p=${fmtP(hd.cloud_attenuation_p_value)}), Irradiancia All-Sky ${hd.allsky_slope_per_decade >= 0 ? "+" : ""}${hd.allsky_slope_per_decade?.toFixed(3)} kWh/m²/dia/dec.\n• Fogo & Aerossol (Clear-Sky): Clear-Sky SW slope ${fd.clrsky_slope_per_decade >= 0 ? "+" : ""}${fd.clrsky_slope_per_decade?.toFixed(3)} (p=${fmtP(fd.clrsky_p_value)}, significativo=${fd.clrsky_significant ? "sim" : "nao"}); ${fd.nearby_24h_detections ?? "-"} focos em 150 km (${fd.brazil_24h_detections} no BR).\n• Clima Espacial (DONKI 7d): ${helio?.value || "-"}.\nVeredito: ${hydro?.interpretation || ""} ${fire?.interpretation || ""}`.trim()
    : `Multi-Vector Attribution — ${regionName} (${attr.period || "1984-2025"}):\n• Temperature T2M: +${ht?.slope_per_decade?.toFixed(3)} °C/decade (${ht?.total_change >= 0 ? "+" : ""}${ht?.total_change?.toFixed(2)} °C total, p=${fmtP(ht?.p_value)}).\n• Hydrometeorology & Clouds: Precip ${hd.precip_slope_per_decade?.toFixed(3)} mm/day/dec (p=${fmtP(hd.precip_p_value)}), Cloud Attenuation ${hd.cloud_attenuation_slope_per_decade?.toFixed(3)} %/dec (p=${fmtP(hd.cloud_attenuation_p_value)}), All-Sky SW ${hd.allsky_slope_per_decade >= 0 ? "+" : ""}${hd.allsky_slope_per_decade?.toFixed(3)} kWh/m²/day/dec.\n• Fire & Aerosol (Clear-Sky): Clear-Sky SW slope ${fd.clrsky_slope_per_decade >= 0 ? "+" : ""}${fd.clrsky_slope_per_decade?.toFixed(3)} (p=${fmtP(fd.clrsky_p_value)}, significant=${fd.clrsky_significant ? "yes" : "no"}); ${fd.nearby_24h_detections ?? "-"} fires within 150 km (${fd.brazil_24h_detections} in BR).\n• Space Weather (DONKI 7d): ${helio?.value || "-"}.\nVerdict: ${hydro?.interpretation || ""} ${fire?.interpretation || ""}`.trim();

  return {
    answer,
    sourceBadge: "Multi-Vector Attribution Engine",
    action: { route: "/cockpit", tab: "attribution", region: regionId, variable: parsed.variableId },
    resolvedLang: l,
    detectedTopic: "attribution",
  };
}

async function handleWorkbench(parsed, loadJson) {
  const { norm, resolvedLang: l } = parsed;
  const isWorkbench = matchesAny(norm, [
    "csv", "export", "exportar", "download", "baixar", "raw data", "dados brutos",
    "open source", "codigo aberto", "offline", "api key", "sem chave", "slider", "sliders",
    "manifest", "sources", "fontes", "preset", "presets",
  ]);
  if (!isWorkbench) return null;

  const manifest = await loadJson("manifest.json");
  const presetNames = Object.keys(PRESET_DEFINITIONS || {}).join(", ");
  const answer = l === "pt"
    ? `Arquitetura 100% Aberta do Cockpit-OMNI: cada grafico tem a aba "Raw data" (tabela paginada de 100 linhas) com exportacao instantanea em CSV e JSON offline. Voce pode filtrar qualquer intervalo de anos (1984-2025) ou mes no Cockpit (ou perguntar direto aqui, ex. "Campinas T2M 2000-2025") e o motor cliente Seasonal Mann-Kendall + Theil-Sen recalcula sem chaves de backend. Presets disponiveis: ${presetNames}. Snapshot congelado em ${manifest.frozen_at_utc}.`
    : `100% Open Cockpit-OMNI Workbench: every chart includes a 100-row paginated "Raw data" tab with instant offline CSV and JSON export. Adjust year sliders or calendar months in Cockpit (or ask directly here, e.g. "Campinas T2M 2000-2025") and our zero-key client-side Seasonal Mann-Kendall + Theil-Sen engine recomputes on the fly. Presets: ${presetNames}. Cache frozen at ${manifest.frozen_at_utc}.`;

  return {
    answer,
    sourceBadge: "Open Client Engine · MIT",
    action: { route: "/cockpit", tab: "sources", region: parsed.regionId, variable: parsed.variableId },
    resolvedLang: l,
    detectedTopic: "workbench",
  };
}

async function fetchWithTimeout(fetchImpl, url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetchImpl(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function handleCustomCoordsPower(parsed, fetchLive, timeoutMs) {
  const { customCoords, variableId, yearRange, monthFilter, singleYear, extremum, resolvedLang: l } = parsed;
  if (!customCoords) return null;

  const varInfo = getVarMeta(variableId, l);
  const label = customCoords.label
    ? `${customCoords.label} (${customCoords.lat.toFixed(2)}, ${customCoords.lon.toFixed(2)})`
    : `${customCoords.lat.toFixed(2)}, ${customCoords.lon.toFixed(2)}`;

  const queryParams =
    variableId === "CLOUD_ATTEN_PCT" ? "ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN" : variableId;
  const url =
    `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${encodeURIComponent(queryParams)}` +
    `&community=AG&longitude=${customCoords.lon.toFixed(4)}&latitude=${customCoords.lat.toFixed(4)}` +
    `&start=${MIN_YEAR}&end=${MAX_YEAR}&format=JSON`;

  try {
    const res = await fetchWithTimeout(fetchLive, url, timeoutMs);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const payload = await res.json();
    const paramBag = payload?.properties?.parameter || {};

    let series = [];
    if (variableId === "CLOUD_ATTEN_PCT") {
      const allMap = paramBag.ALLSKY_SFC_SW_DWN || {};
      const clrMap = paramBag.CLRSKY_SFC_SW_DWN || {};
      for (const key of Object.keys(allMap).sort()) {
        if (key.endsWith("13")) continue;
        const a = Number(allMap[key]);
        const c = Number(clrMap[key]);
        if (a <= -900 || c <= -900 || c <= 0) continue;
        series.push({ t: `${key.slice(0, 4)}-${key.slice(4, 6)}`, v: (1 - a / c) * 100 });
      }
    } else {
      const map = paramBag[variableId] || {};
      for (const key of Object.keys(map).sort()) {
        if (key.endsWith("13")) continue;
        const v = Number(map[key]);
        if (v <= -900 || !Number.isFinite(v)) continue;
        series.push({ t: `${key.slice(0, 4)}-${key.slice(4, 6)}`, v });
      }
    }

    const answer = formatSeriesAnswer({
      series,
      fallbackStats: null,
      varInfo: { ...varInfo, id: variableId },
      regionLabel: label,
      lang: l,
      yearRange,
      monthFilter,
      singleYear,
      extremum,
      forceLiveLabel: true,
    });

    return {
      answer,
      sourceBadge: "NASA POWER Live API (Zero-Key CORS)",
      action: null,
      resolvedLang: l,
      detectedTopic: "custom_coords_live",
    };
  } catch {
    return {
      answer: l === "pt"
        ? `Nao foi possivel consultar a API aberta NASA POWER ao vivo para ${label} neste momento (offline ou timeout). Os biomas pre-carregados offline sao Campinas-SP (-22.90, -47.06), Petrolina-PE (-9.39, -40.50) e Manaus-AM (-3.10, -60.02).`
        : `Could not reach the open NASA POWER API for ${label} right now (offline or timeout). Cached offline biomes available anytime are Campinas-SP (-22.90, -47.06), Petrolina-PE (-9.39, -40.50), and Manaus-AM (-3.10, -60.02).`,
      sourceBadge: l === "pt" ? "NASA POWER Indisponivel" : "NASA POWER Unreachable",
      action: { route: "/cockpit", tab: "trend", region: parsed.regionId, variable: variableId },
      resolvedLang: l,
      detectedTopic: "custom_coords_offline",
    };
  }
}

function formatSeriesAnswer({
  series,
  fallbackStats,
  varInfo,
  regionLabel,
  lang,
  yearRange,
  monthFilter,
  singleYear,
  extremum,
  forceLiveLabel = false,
}) {
  const unit = varInfo.unit || UNIT_MAP[varInfo.id] || "";
  if (!Array.isArray(series) || series.length === 0) {
    return lang === "pt"
      ? `Sem observacoes validas para ${varInfo.label} em ${regionLabel}.`
      : `No valid observations found for ${varInfo.label} at ${regionLabel}.`;
  }

  if (singleYear) {
    const rows = series.filter((pt) => {
      if (Number(pt.t.slice(0, 4)) !== singleYear) return false;
      return monthFilter ? Number(pt.t.slice(5, 7)) === monthFilter : true;
    });
    if (rows.length === 0) {
      return lang === "pt"
        ? `Sem dados para ${singleYear} em ${regionLabel}.`
        : `No observations available for ${singleYear} at ${regionLabel}.`;
    }
    if (rows.length === 1) {
      const r = rows[0];
      return lang === "pt"
        ? `${regionLabel} — ${varInfo.label} em ${r.t}: ${r.v.toFixed(2)} ${unit}${r.sen != null ? ` (linha Theil-Sen esperada: ${r.sen.toFixed(2)} ${unit})` : ""}.`
        : `${regionLabel} — ${varInfo.label} in ${r.t}: ${r.v.toFixed(2)} ${unit}${r.sen != null ? ` (Theil-Sen baseline: ${r.sen.toFixed(2)} ${unit})` : ""}.`;
    }
    const yrSummary = summarizeSeriesStats(rows, null, null);
    return lang === "pt"
      ? `${regionLabel} — ${varInfo.label} em ${singleYear} (${rows.length} meses): media ${yrSummary.mean.toFixed(2)} ${unit}, minima ${yrSummary.minPt.v.toFixed(2)} ${unit} (${yrSummary.minPt.t}), maxima ${yrSummary.maxPt.v.toFixed(2)} ${unit} (${yrSummary.maxPt.t}).`
      : `${regionLabel} — ${varInfo.label} in ${singleYear} (${rows.length} months): mean ${yrSummary.mean.toFixed(2)} ${unit}, min ${yrSummary.minPt.v.toFixed(2)} ${unit} (${yrSummary.minPt.t}), max ${yrSummary.maxPt.v.toFixed(2)} ${unit} (${yrSummary.maxPt.t}).`;
  }

  const summary = summarizeSeriesStats(series, yearRange, monthFilter);
  if (!summary) {
    return lang === "pt"
      ? `Nenhuma observacao encontrada para o filtro selecionado em ${regionLabel}.`
      : `No observations matched the requested slice for ${regionLabel}.`;
  }

  if (extremum) {
    const scope = yearRange ? `${yearRange[0]}-${yearRange[1]}` : "1984-2025";
    return lang === "pt"
      ? `${regionLabel} — ${varInfo.label} (${scope}, n=${summary.filtered.length} meses): maxima ${summary.maxPt.v.toFixed(2)} ${unit} (${summary.maxPt.t}), minima ${summary.minPt.v.toFixed(2)} ${unit} (${summary.minPt.t}), media ${summary.mean.toFixed(2)} ${unit}.`
      : `${regionLabel} — ${varInfo.label} (${scope}, n=${summary.filtered.length} months): max ${summary.maxPt.v.toFixed(2)} ${unit} (${summary.maxPt.t}), min ${summary.minPt.v.toFixed(2)} ${unit} (${summary.minPt.t}), mean ${summary.mean.toFixed(2)} ${unit}.`;
  }

  const isSliced = Boolean(yearRange || monthFilter || forceLiveLabel);
  if (!isSliced && fallbackStats?.status === "ok") {
    return formatTrendVerdict(fallbackStats, varInfo, regionLabel, lang, { yearRange, monthFilter, isSliced: false });
  }

  if (summary.computed?.stats?.status === "ok") {
    return formatTrendVerdict(summary.computed.stats, varInfo, regionLabel, lang, { yearRange, monthFilter, isSliced: true });
  }

  return lang === "pt"
    ? `${regionLabel} — ${varInfo.label} (n=${summary.filtered.length} meses): janela menor que 24 meses nao permite teste Seasonal Mann-Kendall completo. Media no trecho: ${summary.mean.toFixed(2)} ${unit} (min ${summary.minPt.v.toFixed(2)} em ${summary.minPt.t}, max ${summary.maxPt.v.toFixed(2)} em ${summary.maxPt.t}).`
    : `${regionLabel} — ${varInfo.label} (n=${summary.filtered.length} months): windows shorter than 24 months are below Seasonal Mann-Kendall's minimum sample size. Slice mean: ${summary.mean.toFixed(2)} ${unit} (min ${summary.minPt.v.toFixed(2)} in ${summary.minPt.t}, max ${summary.maxPt.v.toFixed(2)} in ${summary.maxPt.t}).`;
}

async function handleCompareRegions(parsed, loadJson) {
  const { variableId, yearRange, monthFilter, extremum, resolvedLang: l } = parsed;
  const varInfo = getVarMeta(variableId, l);
  const unit = varInfo.unit;
  const isSliced = Boolean(yearRange || monthFilter);

  const rows = [];
  for (const r of Object.values(REGION_META)) {
    const data = await loadJson(`trend_${r.id}_${variableId}.json`);
    const summary = summarizeSeriesStats(data.series || [], yearRange, monthFilter);
    const stats = isSliced ? summary?.computed?.stats : data.stats;
    rows.push({ region: r, stats, summary });
  }

  if (extremum && !rows.some((x) => !x.summary)) {
    rows.sort((a, b) => (extremum === "min" ? a.summary.minPt.v - b.summary.minPt.v : b.summary.maxPt.v - a.summary.maxPt.v));
    const lines = rows.map(
      ({ region, summary }) =>
        `• ${region.name}: max ${summary.maxPt.v.toFixed(2)} ${unit} (${summary.maxPt.t}), min ${summary.minPt.v.toFixed(2)} ${unit} (${summary.minPt.t}), ${l === "pt" ? "media" : "mean"} ${summary.mean.toFixed(2)} ${unit}`,
    );
    return {
      answer: `${l === "pt" ? "Comparacao nos 3 biomas" : "Comparison across all 3 biomes"} — ${varInfo.label}:\n${lines.join("\n")}`,
      sourceBadge: "NASA POWER · 3 Biomes",
      action: { route: "/cockpit", tab: "trend", region: rows[0].region.id, variable: variableId },
      resolvedLang: l,
      detectedTopic: "compare_extremum",
    };
  }

  rows.sort((a, b) => (b.stats?.slope_per_decade ?? 0) - (a.stats?.slope_per_decade ?? 0));
  const lines = rows.map(({ region, stats }) => {
    if (!stats || stats.status !== "ok") return `• ${region.name}: N/A`;
    const sign = stats.slope_per_decade > 0 ? "+" : "";
    const sig = stats.significant_5pct ? (l === "pt" ? "sig." : "sig.") : (l === "pt" ? "nao sig." : "not sig.");
    return `• ${region.name}: ${sign}${stats.slope_per_decade.toFixed(3)} ${unit}/dec (${l === "pt" ? "total" : "total"} ${stats.total_change >= 0 ? "+" : ""}${stats.total_change.toFixed(2)} ${unit}, p=${fmtP(stats.p_value)}, ${sig})`;
  });

  const periodLabel = yearRange ? `${yearRange[0]}-${yearRange[1]}` : "1984-2025";
  return {
    answer: `${l === "pt" ? `Ranking nos 3 biomas (${periodLabel})` : `3-Biome Ranking (${periodLabel})`} — ${varInfo.label}:\n${lines.join("\n")}`,
    sourceBadge: isSliced ? "JS Theil-Sen · 3 Biomes" : "NASA POWER · 3 Biomes",
    action: { route: "/cockpit", tab: "trend", region: rows[0].region.id, variable: variableId },
    resolvedLang: l,
    detectedTopic: "compare_trend",
  };
}

async function handleRegionOverview(parsed, loadJson) {
  const { norm, explicitRegion, explicitVar, resolvedLang: l } = parsed;
  const isOverview =
    explicitRegion &&
    !explicitVar &&
    !parsed.yearRange &&
    !parsed.singleYear &&
    !parsed.extremum &&
    matchesAny(norm, ["summary", "resumo", "overview", "panorama", "tell me about", "como esta", "o que acontece"]);

  if (!isOverview) return null;

  const region = REGION_META[explicitRegion];
  const [t2m, precip, cloud] = await Promise.all([
    loadJson(`trend_${explicitRegion}_T2M.json`),
    loadJson(`trend_${explicitRegion}_PRECTOTCORR.json`),
    loadJson(`trend_${explicitRegion}_CLOUD_ATTEN_PCT.json`),
  ]);

  const answer = l === "pt"
    ? `Panorama NASA POWER — ${region.name} (1984-2025):\n• Temperatura T2M: +${t2m.stats.slope_per_decade.toFixed(3)} °C/dec (+${t2m.stats.total_change.toFixed(2)} °C total, p=${fmtP(t2m.stats.p_value)}).\n• Precipitacao PRECTOTCORR: ${precip.stats.slope_per_decade.toFixed(3)} mm/dia/dec (p=${fmtP(precip.stats.p_value)}, ${precip.stats.significant_5pct ? "significativa" : "nao significativa"}).\n• Atenuacao por Nuvens: ${cloud.stats.slope_per_decade.toFixed(3)} %/dec (p=${fmtP(cloud.stats.p_value)}).`
    : `NASA POWER Overview — ${region.name} (1984-2025):\n• Temperature T2M: +${t2m.stats.slope_per_decade.toFixed(3)} °C/dec (+${t2m.stats.total_change.toFixed(2)} °C total, p=${fmtP(t2m.stats.p_value)}).\n• Precipitation PRECTOTCORR: ${precip.stats.slope_per_decade.toFixed(3)} mm/day/dec (p=${fmtP(precip.stats.p_value)}, ${precip.stats.significant_5pct ? "significant" : "not significant"}).\n• Cloud Attenuation: ${cloud.stats.slope_per_decade.toFixed(3)} %/dec (p=${fmtP(cloud.stats.p_value)}).`;

  return {
    answer,
    sourceBadge: "NASA POWER Cached Overview",
    action: { route: "/cockpit", tab: "trend", region: explicitRegion, variable: "T2M" },
    resolvedLang: l,
    detectedTopic: "region_overview",
  };
}

function handleAgents(parsed) {
  const { norm, resolvedLang: l } = parsed;
  const isAgentQuery = matchesAny(norm, [
    "agent", "agents", "agente", "agentes", "multiagent", "multiagente", "orquestracao", "orchestrator",
    "hebe", "sol invicta", "bios guardian", "storm watcher", "prudence", "auditor estatistico",
    "statistical auditor", "gemini vision", "grok cratera",
  ]);
  if (!isAgentQuery) return null;

  const answer = l === "pt"
    ? "Orquestracao Multiagente OMNI (7 Agentes Fisicos + Auditor Estatistico + VCE/FPGA):\n1. Hebe Radiance (#1 T^4 radiador): aplica curtailment acima de 82% para proteger o BAE RAD750 + VCE FPGA.\n2. Gemini Vision (#2 Optica t-1->t): usa Navcam CMV20000 20MP (binning 4x4) + filtro LoG + MEDA RDS para isolar Beer-Lambert tau e purgar sentinelas 999999999.0 ([4]).\n3. Sol Invicta (#3 Regolito ~50x k & Albedo IR +10-15%): acopla bateria termica BESS ([5]) e borda iluminada de cratera.\n4. Bios Guardian (#4 SoC_bio OSDR OSD-615): veta drenagem abaixo do piso biologico em eclipses de 35% (CelesTrak).\n5. Grok Cratera (#5 Geotecnia 64m): usa estereo SAD 1/16 px (DEM 10cm), Odometria Visual Harris+RANSAC 6-DoF e algoritmo ACE Rocker-Bogie para vetar areia solta (>40% slip, 1,8x Wh/km).\n6. Storm Watcher (#6 Lead-time 30-60 min): cruza rajadas MEDA 2Hz + DONKI 7d RBE/CME contra SEUs na RAM ECC.\n7. Prudence (#7 P10-P95): impoe margens conservadoras de dispersao de tau e Cp.\nAuditor Estatistico (veto nao-LLM): valida tau/p-valor em trend.js e impede confundir WS2M nulo (p=0,489) ou roadmap NISAR/ECOSTRESS com dados ativos."
    : "OMNI Multi-Agent Orchestration (7 Physical Agents + Statistical Auditor + VCE/FPGA):\n1. Hebe Radiance (#1 T^4 radiator): curtails compute >=82% to protect BAE RAD750 + VCE FPGA.\n2. Gemini Vision (#2 Optical t-1->t): binds Navcam CMV20000 20MP (4x4 bin) + FPGA LoG + MEDA RDS for Beer-Lambert tau and 999999999.0 sentinel purge ([4]).\n3. Sol Invicta (#3 Regolith ~50x k & +10-15% Crater IR): manages BESS thermal buffer ([5]) and rim irradiance gain.\n4. Bios Guardian (#4 SoC_bio OSDR OSD-615): vetoes chemical drain below biological floor during 35% CelesTrak eclipses.\n5. Grok Cratera (#5 64m Geotechnics): runs 1/16-px SAD stereo (10cm DEM), Harris+RANSAC 6-DoF Visual Odometry & ACE Rocker-Bogie routing to veto >40% slip (1.8x Wh/km).\n6. Storm Watcher (#6 30-60 min lead-time): fuses MEDA 2Hz gusts + DONKI 7d alerts against ECC DRAM SEUs.\n7. Prudence (#7 P10-P95 uncertainty): enforces conservative dust Cp and tau margins.\nStatistical Auditor (non-LLM veto): enforces trend.js + 111 verified assertions, keeping WS2M monthly null (p=0.489) and NISAR/ECOSTRESS roadmap honest.";

  return {
    answer,
    sourceBadge: l === "pt" ? "Orquestracao 7 Agentes + Auditor" : "7-Agent Orchestration + Auditor",
    action: { route: "/cockpit", tab: "space" },
    resolvedLang: l,
    detectedTopic: "multiagent",
  };
}

function handleRoverHardware(parsed) {
  const { norm, resolvedLang: l } = parsed;
  const isHw = matchesAny(norm, [
    "rad750", "vce", "fpga", "virtex", "cmv20000", "mastcam", "perseverance", "curiosity",
    "rosalind", "exomars", "hpsc", "pic64", "risc-v", "riscv", "sad", "binning", "odometria",
    "odometry", "ransac", "rocker-bogie", "cahvor", "vxworks", "hardware", "processador", "processor",
  ]);
  if (!isHw) return null;

  const answer = l === "pt"
    ? "Arquitetura Real de Computacao & Visao dos Rovers:\n• Perseverance (Mars 2020): CPU Dual BAE RAD750 (PowerPC 133-200 MHz, 256MB ECC DRAM, 2GB Flash, VxWorks) + coprocessador VCE com FPGA Xilinx Virtex-5QV (placa CVAC).\n• Pipeline VCE (Thinking-While-Driving <1s): Navcams CMOS CMV20000 20MP Global Shutter -> binning 4x4 (1280x960) -> retificacao epipolar CAHVOR -> filtro LoG -> Estereo SAD com interpolacao 1/16 pixel (base B=42,4 cm) + Odometria Visual (Harris + RANSAC 6-DoF) + algoritmo ACE para suspensao Rocker-Bogie (DEM 10x10 cm).\n• Curiosity (MSL): Dual RAD750 sem VCE, Navcams CCD mono 1MP, estereo em CPU.\n• Proxima geracao: ExoMars Rosalind Franklin (LEON2/3-FT SPARC V8) e NASA PIC64-HPSC (RISC-V octa-core 64-bit, 100x o RAD750)."
    : "Real Rover Compute & Vision Architecture:\n• Perseverance (Mars 2020): Dual BAE RAD750 CPU (133-200 MHz PowerPC, 256MB ECC DRAM, 2GB Flash, VxWorks) + VCE coprocessor with Xilinx Virtex-5QV FPGA (CVAC board).\n• Hardware VCE Pipeline (<1s Thinking-While-Driving): CMV20000 20MP Global Shutter Navcams -> 4x4 binning (1280x960) -> CAHVOR rectification -> LoG filter -> SAD Stereo at 1/16 px (B=42.4 cm baseline) + Visual Odometry (Harris + RANSAC 6-DoF) + ACE Rocker-Bogie clearance planning on 10x10 cm DEMs.\n• Curiosity (MSL): Dual RAD750 without VCE, 1MP monochrome CCD Navcams.\n• Next-Gen: ExoMars Rosalind Franklin (LEON2/3-FT SPARC V8) and NASA PIC64-HPSC (octa-core 64-bit RISC-V, ~100x RAD750 throughput).";

  return {
    answer,
    sourceBadge: "Mars Rover Compute & VCE FPGA Architecture",
    action: { route: "/cockpit", tab: "space" },
    resolvedLang: l,
    detectedTopic: "rover_hardware",
  };
}

/**
 * Answer any natural-language question about the managed NASA ecosystem using open client-side
 * computations over cached JSON telemetry and zero-key CORS NASA APIs.
 */
export async function answerEcosystemQuestion(
  question,
  { context = {}, lang = "en", loadJson = defaultLoadJson, fetchLive = defaultFetch, timeoutMs = 4500 } = {},
) {
  const trimmed = String(question || "").trim();
  const parsed = parseQuestion(trimmed, { context, lang });
  const l = parsed.resolvedLang;

  if (!trimmed) {
    return {
      answer: l === "pt"
        ? "Digite qualquer pergunta sobre o ecossistema NASA: tendencias climaticas (1984-2025 ou lat, lon), atribuicao nuvens vs aerossol, focos FIRMS, clima espacial DONKI, catalogo CMR ou fronteiras espaciais MPTO."
        : "Type any natural-language question about the NASA ecosystem: climate trends (1984-2025 or lat, lon), clouds vs aerosol attribution, FIRMS fires, DONKI space weather, CMR catalog, or MPTO space frontiers.",
      sourceBadge: "OMNI Open Engine",
      action: null,
      resolvedLang: l,
      detectedTopic: "empty",
    };
  }

  // 1. Honest scientific / scope guardrails
  const boundary = buildOutOfScopeAnswer(parsed);
  if (boundary) return boundary;

  // 2. Domain handlers in priority order
  const explicitGlossaryHit = await handleGlossary(parsed, { onlyExplicitDefinition: true });
  if (explicitGlossaryHit) return explicitGlossaryHit;

  const agentsHit = handleAgents(parsed);
  if (agentsHit) return agentsHit;

  const hwHit = handleRoverHardware(parsed);
  if (hwHit) return hwHit;

  const donkiHit = await handleDonki(parsed, loadJson);
  if (donkiHit) return donkiHit;

  const cmrHit = await handleCmr(parsed, loadJson, fetchLive, timeoutMs);
  if (cmrHit) return cmrHit;

  const spaceHit = await handleSpaceAnalog(parsed, loadJson);
  if (spaceHit) return spaceHit;

  const attrHit = await handleAttribution(parsed, loadJson);
  if (attrHit) return attrHit;

  const firmsHit = await handleFirms(parsed, loadJson);
  if (firmsHit) return firmsHit;

  const workbenchHit = await handleWorkbench(parsed, loadJson);
  if (workbenchHit) return workbenchHit;

  const fallbackGlossaryHit = await handleGlossary(parsed);
  if (fallbackGlossaryHit) return fallbackGlossaryHit;

  // 3. Live open zero-key NASA POWER fetch for custom (lat, lon) or non-preset city
  const customHit = await handleCustomCoordsPower(parsed, fetchLive, timeoutMs);
  if (customHit) return customHit;

  // 4. Multi-region ranking / comparison
  if (parsed.compareAll) {
    return handleCompareRegions(parsed, loadJson);
  }

  // 5. Region overview if region named without explicit variable/time query
  const overviewHit = await handleRegionOverview(parsed, loadJson);
  if (overviewHit) return overviewHit;

  // 6. Standard or sliced/extremum NASA POWER trend on the target preset region + variable
  const hasAnyDomainHint = Boolean(
    parsed.explicitRegion ||
    parsed.explicitVar ||
    parsed.yearRange ||
    parsed.monthFilter ||
    parsed.singleYear ||
    parsed.extremum ||
    matchesAny(parsed.norm, ["trend", "tendencia", "serie", "series", "climate", "clima", "stat", "tau", "slope"]),
  );

  if (!hasAnyDomainHint) {
    return {
      answer: l === "pt"
        ? "Nao identifiquei um modulo NASA nessa pergunta. Voce pode perguntar sobre: (1) temperatura/chuva/sol/vento em Campinas, Petrolina, Manaus ou qualquer coordenada \"lat, lon\"; (2) nuvens vs queimadas (atribuicao); (3) focos FIRMS 24h por raio em km; (4) alertas solares DONKI; (5) catalogo aberto Earthdata CMR (NISAR, ECOSTRESS ou busca por termo); (6) analogo espacial MPTO / DSN / OSDR / CelesTrak."
        : "I couldn't map that to a managed NASA dataset. Try asking about: (1) temperature, rain, solar, humidity, or wind in Campinas, Petrolina, Manaus, or any \"lat, lon\"; (2) clouds vs fire aerosol attribution; (3) FIRMS 24h fires within X km; (4) DONKI solar alerts; (5) Earthdata CMR (NISAR, ECOSTRESS, or open keyword search); (6) Space Analog MPTO / DSN / OSDR / CelesTrak.",
      sourceBadge: l === "pt" ? "Guia de Escopo Aberto" : "Open Scope Guide",
      action: null,
      resolvedLang: l,
      detectedTopic: "unmatched",
    };
  }

  const data = await loadJson(`trend_${parsed.regionId}_${parsed.variableId}.json`);
  const regionLabel = REGION_META[parsed.regionId]?.name || parsed.regionId;
  const varInfo = getVarMeta(parsed.variableId, l);
  let answer = formatSeriesAnswer({
    series: data.series || [],
    fallbackStats: data.stats,
    varInfo,
    regionLabel,
    lang: l,
    yearRange: parsed.yearRange,
    monthFilter: parsed.monthFilter,
    singleYear: parsed.singleYear,
    extremum: parsed.extremum,
  });

  if (parsed.variableId === "WS2M" && !parsed.extremum && !parsed.singleYear) {
    answer += l === "pt"
      ? " Nota da Curva do Pato: WS2M mensal apenas descarta tendencia secular de vento; rampas horarias exigem telemetria sub-horaria."
      : " Duck Curve note: monthly WS2M rules out multi-decade wind drift; hourly ramps still require sub-hourly station/NWP telemetry.";
  }

  const isSliced = Boolean(parsed.yearRange || parsed.monthFilter || parsed.extremum || parsed.singleYear);
  return {
    answer,
    sourceBadge: isSliced ? "NASA POWER · JS Browser Compute" : "NASA POWER · Verified Cache",
    action: { route: "/cockpit", tab: "trend", region: parsed.regionId, variable: parsed.variableId },
    resolvedLang: l,
    detectedTopic: "climate_trend",
  };
}
