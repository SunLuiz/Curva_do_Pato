/**
 * Bilingual English ("en") and Brazilian Portuguese ("pt") dictionary
 * for Cockpit-OMNI UI chrome, layperson variable names, and space analog telemetry.
 * Default app language is "en" for global accessibility.
 */

export const VARIABLE_HUMAN = {
  T2M: {
    en: {
      name: "Surface Air Temperature",
      unitPlain: "°C",
      why: "Air temperature 2 meters above ground",
    },
    pt: {
      name: "Temperatura do ar (superfície)",
      unitPlain: "°C",
      why: "Temperatura do ar a 2 metros do solo",
    },
  },
  PRECTOTCORR: {
    en: {
      name: "Rainfall",
      unitPlain: "mm/day",
      why: "Daily average precipitation across the month",
    },
    pt: {
      name: "Chuva",
      unitPlain: "mm/dia",
      why: "Média diária de chuva ao longo do mês",
    },
  },
  ALLSKY_SFC_SW_DWN: {
    en: {
      name: "Sunlight Reaching Ground",
      unitPlain: "MJ/m²/day",
      why: "Total solar energy passing through clouds to the surface",
    },
    pt: {
      name: "Energia do sol no solo",
      unitPlain: "MJ/m²/dia",
      why: "Radiação solar total considerando nuvens e atmosfera",
    },
  },
  CLRSKY_SFC_SW_DWN: {
    en: {
      name: "Clear-Sky Sunlight (No Clouds)",
      unitPlain: "MJ/m²/day",
      why: "Solar energy under cloudless skies — isolates smoke and haze",
    },
    pt: {
      name: "Luz solar sem nuvens",
      unitPlain: "MJ/m²/dia",
      why: "Energia solar com céu limpo — revela fumaça e aerossóis",
    },
  },
  CLOUD_ATTEN_PCT: {
    en: {
      name: "Sun Blocked by Clouds",
      unitPlain: "%",
      why: "Fraction of sunlight intercepted by cloud cover",
    },
    pt: {
      name: "Sol bloqueado por nuvens",
      unitPlain: "%",
      why: "Percentual da luz solar barrada pela cobertura de nuvens",
    },
  },
  RH2M: {
    en: {
      name: "Air Humidity",
      unitPlain: "%",
      why: "Moisture near ground level — low humidity amplifies fire & heat stress",
    },
    pt: {
      name: "Umidade do ar",
      unitPlain: "%",
      why: "Umidade a 2m — ar seco agrava calor extremo e risco de fogo",
    },
  },
  WS2M: {
    en: {
      name: "Surface Wind Speed (2m)",
      unitPlain: "m/s",
      why: "Monthly ground-level wind — cannot predict hourly turbine gusts",
    },
    pt: {
      name: "Vento próximo ao solo (2m)",
      unitPlain: "m/s",
      why: "Média mensal a 2m — não serve para prever rajadas horárias",
    },
  },
};

export function tVar(variableId, lang = "en") {
  const l = lang === "pt" ? "pt" : "en";
  const entry = VARIABLE_HUMAN[variableId];
  if (!entry) {
    return { name: variableId, unitPlain: "", why: "" };
  }
  return entry[l];
}

export const UI_TEXT = {
  en: {
    navStory: "Story",
    navAcademy: "Academy",
    navCockpit: "Cockpit",
    navGame: "3D Game",
    brandSub: "Duck-Curve Solar & Climate · NASA Space Apps 2026",
    askFloating: "Ask OMNI",
    bannerFrozenPrefix: "Showing frozen snapshot (2026-11-14 15:04 UTC) —",
    bannerLive: "Connected to live NASA POWER / FIRMS / DONKI telemetry",
    bannerSimpleHint: "No backend server detected; local browser statistics active.",
    tabTrend: "Trends & Action Presets",
    tabAttribution: "Attribution",
    tabSources: "Sources & Method",
    tabLive: "Live NASA (FIRMS / DONKI)",
    tabSpace: "Space Analog (MPTO)",
    modeSimple: "Simple language",
    modeTechnical: "Technical view",
    presetEyebrow: "Choose what you want to answer",
    presetTitle: "Quick Action Presets",
    severityLabels: {
      red: "RED ALERT",
      amber: "AMBER WATCH",
      green: "GREEN STABLE",
    },
    indicatorsLabel: "Supporting indicators (click any to inspect chart):",
    regionLabel: "Monitoring region",
    variableLabel: "Variable",
    askTitle: "Ask OMNI — Open Natural Language",
    askPlaceholder:
      "Ask anything about the NASA ecosystem — e.g.\n• \"Compare T2M warming across all 3 biomes\"\n• \"Why did Manaus change: clouds or fires?\" · \"-23.55, -46.63\" · \"CMR soil moisture\" · \"MPTO\"",
    askSend: "Ask",
    askThinking: "Querying open NASA telemetry...",
    askFallbackBadge: "100% Open · Zero Keys",
  },
  pt: {
    navStory: "História",
    navAcademy: "Academy",
    navCockpit: "Cockpit",
    navGame: "Jogo 3D",
    brandSub: "Curva do Pato · Energia & Clima NASA 2026",
    askFloating: "Perguntar ao OMNI",
    bannerFrozenPrefix: "Exibindo snapshot congelado (2026-11-14 15:04 UTC) —",
    bannerLive: "Conectado à telemetria ao vivo NASA POWER / FIRMS / DONKI",
    bannerSimpleHint: "Sem servidor ativo; motor estatístico local no navegador ativo.",
    tabTrend: "Tendências & Presets",
    tabAttribution: "Atribuição",
    tabSources: "Fontes & Método",
    tabLive: "NASA Ao Vivo (FIRMS / DONKI)",
    tabSpace: "Análogo Espacial (MPTO)",
    modeSimple: "Linguagem simples",
    modeTechnical: "Modo técnico",
    presetEyebrow: "Escolha a pergunta prática",
    presetTitle: "Presets de Ação Rápida",
    severityLabels: {
      red: "ALERTA VERMELHO",
      amber: "ATENÇÃO (ÂMBAR)",
      green: "ESTÁVEL (VERDE)",
    },
    indicatorsLabel: "Indicadores de apoio (clique em qualquer cartão para ver o gráfico):",
    regionLabel: "Região monitorada",
    variableLabel: "Variável",
    askTitle: "Pergunte ao OMNI — Linguagem Natural",
    askPlaceholder:
      "Pergunte em linguagem natural sobre o ecossistema NASA — ex.:\n• \"Qual bioma aqueceu mais em T2M?\"\n• \"Por que Manaus mudou: nuvens ou queimadas?\" · \"-23.55, -46.63\" · \"Focos FIRMS\" · \"MPTO\"",
    askSend: "Perguntar",
    askThinking: "Consultando telemetria aberta da NASA...",
    askFallbackBadge: "100% Aberto · Sem Chaves",
  },
};
