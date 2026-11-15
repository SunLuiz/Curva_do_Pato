/**
 * Client-side mirror of backend/app/presets.py so Action Presets,
 * traffic-light severities (green | amber | red), and bilingual plain-language
 * insights run in <5 ms even without a backend connection.
 */

import { tVar } from "../content/i18n.js";

const SEVERITY_RANK = { green: 0, amber: 1, red: 2 };

export const PRESET_DEFINITIONS = [
  {
    id: "calor",
    variables: ["T2M", "ALLSKY_SFC_SW_DWN", "RH2M"],
    primaryVariable: "T2M",
    iconKey: "sun",
    en: {
      title: "Prepare for Heatwaves",
      question: "Is it getting warmer where I live?",
      explanation:
        "Shows surface temperature, solar energy reaching the ground, and air humidity — the three drivers of a heatwave.",
      actions: {
        red: "Red alert: Multi-decade warming is strongly confirmed here. Prioritize urban tree shade, hydration points, and afternoon heat protocols.",
        amber: "Amber watch: Moderate warming detected. Track dry-season heat peaks closely.",
        green: "Green stable: No critical long-term heat escalation found in baseline records.",
      },
    },
    pt: {
      title: "Preparar para onda de calor",
      question: "Está ficando mais quente na minha região?",
      explanation:
        "Mostra a temperatura, a energia do sol e a umidade — os 3 fatores de uma onda de calor.",
      actions: {
        red: "Nível vermelho: Aquecimento histórico forte confirmado. Priorize pontos de hidratação, sombra urbana e proteção térmica à tarde.",
        amber: "Nível atenção: Aquecimento moderado detectado. Acompanhe picos de calor na estação seca.",
        green: "Nível estável: Nenhuma escalada crítica de calor confirmada no histórico.",
      },
    },
  },
  {
    id: "seca",
    variables: ["PRECTOTCORR", "RH2M", "CLOUD_ATTEN_PCT"],
    primaryVariable: "PRECTOTCORR",
    iconKey: "droplets",
    en: {
      title: "Why Is It Drying?",
      question: "Are rainfall and humidity falling together?",
      explanation:
        "Compares rainfall, relative humidity, and cloud cover so you can separate real drought from clear-sky shifts.",
      actions: {
        red: "Red alert: Statistically significant drop in rain and/or humidity confirmed. Prioritize water storage resilience and soil conservation.",
        amber: "Amber watch: Partial drying or thinner cloud cover observed across the 42-year record.",
        green: "Green stable: Precipitation and humidity remain statistically stationary.",
      },
    },
    pt: {
      title: "Por que está secando?",
      question: "A chuva e a umidade do ar estão caindo juntas?",
      explanation:
        "Cruza chuva, umidade do ar e cobertura de nuvens para explicar a estiagem sem jargão.",
      actions: {
        red: "Nível vermelho: Queda estatisticamente confirmada em chuva e umidade. Reforce gestão de reservatórios e economia de água.",
        amber: "Nível atenção: Secagem parcial ou redução de nuvens observada na série de 42 anos.",
        green: "Nível estável: Chuva e umidade seguem sem queda crítica comprovada.",
      },
    },
  },
  {
    id: "fogo",
    variables: ["CLRSKY_SFC_SW_DWN", "RH2M", "T2M"],
    primaryVariable: "CLRSKY_SFC_SW_DWN",
    usesFires: true,
    iconKey: "flame",
    en: {
      title: "Do Wildfires Reach Me?",
      question: "Are active fires nearby or changing clear-sky haze?",
      explanation:
        "Combines 24h NASA satellite fire detections (<150 km radius) with clear-sky sunlight and dry-air conditions.",
      actions: {
        red: "Red alert: Active fire hotspots detected within 150 km alongside drying air. Follow civil-defense smoke advisories.",
        amber: "Amber watch: Zero hotspots inside 150 km in this snapshot, though national fires and long-term clear-sky/dry shifts persist.",
        green: "Green stable: No nearby active hotspots and stable clear-sky transparency.",
      },
    },
    pt: {
      title: "As queimadas me atingem?",
      question: "Há focos de fogo perto ou mudança de fumaça no céu?",
      explanation:
        "Junta focos NASA das últimas 24h (raio de 150 km) com transparência do céu sem nuvens e umidade do ar.",
      actions: {
        red: "Nível vermelho: Focos ativos detectados a menos de 150 km com ar seco. Siga boletins de qualidade do ar.",
        amber: "Nível atenção: Nenhum foco a menos de 150 km neste recorte, mas há focos no país e mudança histórica de céu limpo/ar seco.",
        green: "Nível estável: Sem focos próximos e céu claro estável.",
      },
    },
  },
  {
    id: "clima_espacial",
    variables: ["ALLSKY_SFC_SW_DWN", "WS2M"],
    primaryVariable: "ALLSKY_SFC_SW_DWN",
    usesSpaceWeather: true,
    iconKey: "sparkles",
    en: {
      title: "Solar Storm Today?",
      question: "Are solar flares or CMEs active right now?",
      explanation:
        "Reads 7-day NASA DONKI space weather notifications alongside surface solar availability and declared wind limits.",
      actions: {
        red: "Red alert: High count of solar/geomagnetic notifications in the last 7 days — monitor HF radio, GNSS accuracy, and power grid alerts.",
        amber: "Amber watch: Routine solar notifications present in NASA DONKI 7-day window; surface weather trends remain bounded by monthly resolution.",
        green: "Green stable: Quiet solar weather window; remember monthly 2m wind (WS2M) shows no trend and never forecasts hourly wind gusts.",
      },
    },
    pt: {
      title: "Tempestade solar hoje?",
      question: "O Sol está agitado e isso afeta energia ou redes hoje?",
      explanation:
        "Verifica notificações solares da NASA (DONKI, 7 dias) junto à energia solar local e limites do vento a 2m.",
      actions: {
        red: "Nível vermelho: Muitos alertas solares/geomagnéticos nos últimos 7 dias — acompanhe GPS, rádio HF e redes elétricas.",
        amber: "Nível atenção: Notificações solares moderadas na janela de 7 dias do DONKI; sistema elétrico sob monitoramento normal.",
        green: "Nível estável: Janela espacial tranquila; vento mensal a 2m não tem tendência para prever rajadas horárias.",
      },
    },
  },
  {
    id: "cidadao",
    variables: ["T2M", "PRECTOTCORR", "ALLSKY_SFC_SW_DWN", "RH2M", "WS2M"],
    primaryVariable: "T2M",
    iconKey: "compass",
    en: {
      title: "How Is My City's Climate?",
      question: "Give me the big-picture health check in plain language.",
      explanation:
        "Audits temperature, rain, sunlight, humidity, and wind side-by-side and summarizes everything in a single traffic light.",
      actions: {
        red: "Red summary: At least one 42-year climate variable shows strong deterioration here — review the red card below first.",
        amber: "Amber summary: Moderate long-term shifts are verified in radiation or moisture.",
        green: "Green summary: No severe multi-decade shift flagged across tested indicators.",
      },
    },
    pt: {
      title: "Como está o clima da minha cidade?",
      question: "Resumo completo em linguagem simples, estilo semáforo.",
      explanation:
        "Avalia temperatura, chuva, sol, umidade e vento lado a lado e entrega o diagnóstico direto.",
      actions: {
        red: "Resumo vermelho: Pelo menos um indicador de 42 anos mostra piora acentuada — comece pelo cartão vermelho abaixo.",
        amber: "Resumo atenção: Mudanças moderadas de longo prazo confirmadas em radiação ou umidade.",
        green: "Resumo estável: Nenhum desvio severo identificado nos indicadores avaliados.",
      },
    },
  },
];

export function scoreVariableSeverity(variable, stats = {}) {
  const sig = Boolean(stats.significant_5pct);
  const slope = Number(stats.slope_per_decade || 0);
  if (!sig) return "green";
  if (variable === "T2M") {
    if (slope >= 0.35) return "red";
    if (slope >= 0.18) return "amber";
    return "green";
  }
  if (variable === "PRECTOTCORR") {
    if (slope <= -0.25) return "red";
    if (slope < 0) return "amber";
    return "green";
  }
  if (variable === "RH2M") {
    if (slope <= -1.2) return "red";
    if (slope < 0) return "amber";
    return "green";
  }
  if (variable === "ALLSKY_SFC_SW_DWN" || variable === "CLRSKY_SFC_SW_DWN") {
    return Math.abs(slope) >= 0.15 ? "amber" : "green";
  }
  if (variable === "CLOUD_ATTEN_PCT") {
    return Math.abs(slope) >= 0.5 ? "amber" : "green";
  }
  return "green";
}

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const r1 = toRad(lat1);
  const r2 = toRad(lat2);
  const dLon = toRad(lon2 - lon1);
  const cos = Math.max(-1, Math.min(1, Math.sin(r1) * Math.sin(r2) + Math.cos(r1) * Math.cos(r2) * Math.cos(dLon)));
  return 6371 * Math.acos(cos);
}

export function humanTrendSentence(variable, regionName, stats = {}, lang = "en") {
  const l = lang === "pt" ? "pt" : "en";
  const hm = tVar(variable, l);
  const sig = Boolean(stats.significant_5pct);
  const slope = Number(stats.slope_per_decade || 0);
  const total = Number(stats.total_change || 0);
  const p = stats.p_value;

  if (!sig) {
    if (l === "pt") {
      return `Em ${regionName}, ${hm.name.toLowerCase()} não mostrou tendência comprovada em 42 anos (p = ${p ?? "n/a"}).`;
    }
    return `In ${regionName}, ${hm.name.toLowerCase()} shows no statistically proven 42-year trend (p = ${p ?? "n/a"}).`;
  }

  const signSlope = slope > 0 ? "+" : "";
  const signTotal = total > 0 ? "+" : "";
  if (l === "pt") {
    const dir = slope > 0 ? "subiu" : "caiu";
    return `Em ${regionName}, ${hm.name.toLowerCase()} ${dir} ${signSlope}${slope.toFixed(2)} ${hm.unitPlain}/década (${signTotal}${total.toFixed(2)} ${hm.unitPlain} no total de 1984 a 2025).`;
  }
  const dir = slope > 0 ? "rose" : "dropped";
  return `In ${regionName}, ${hm.name.toLowerCase()} ${dir} ${signSlope}${slope.toFixed(2)} ${hm.unitPlain}/decade (${signTotal}${total.toFixed(2)} ${hm.unitPlain} total from 1984 to 2025).`;
}

export function listClientPresets(lang = "en") {
  const l = lang === "pt" ? "pt" : "en";
  return PRESET_DEFINITIONS.map((p) => ({
    id: p.id,
    variables: p.variables,
    primaryVariable: p.primaryVariable,
    iconKey: p.iconKey,
    ...p[l],
  }));
}

export function evaluateClientInsight({
  presetId,
  regionInfo,
  trendPayloads = {},
  fires = null,
  spaceWeather = null,
  lang = "en",
}) {
  const l = lang === "pt" ? "pt" : "en";
  const preset = PRESET_DEFINITIONS.find((p) => p.id === presetId) || PRESET_DEFINITIONS[0];
  const copy = preset[l];
  const regName = regionInfo?.name || "Region";
  let worst = "green";
  const indicators = [];

  for (const v of preset.variables) {
    const st = trendPayloads[v]?.stats;
    if (!st) continue;
    const sev = scoreVariableSeverity(v, st);
    if (SEVERITY_RANK[sev] > SEVERITY_RANK[worst]) worst = sev;
    const hm = tVar(v, l);
    indicators.push({
      variable: v,
      humanName: hm.name,
      unitPlain: hm.unitPlain,
      why: hm.why,
      severity: sev,
      significant: Boolean(st.significant_5pct),
      slopePerDecade: st.slope_per_decade,
      totalChange: st.total_change,
      pValue: st.p_value,
      sentence: humanTrendSentence(v, regName, st, l),
    });
  }

  const extras = {};
  if (preset.usesFires && fires) {
    const features = fires.features || [];
    let nearby = 0;
    if (regionInfo?.lat != null && regionInfo?.lon != null) {
      for (const ft of features) {
        const coords = ft?.geometry?.coordinates;
        if (Array.isArray(coords) && coords.length >= 2) {
          if (haversineKm(regionInfo.lat, regionInfo.lon, coords[1], coords[0]) <= 150) {
            nearby += 1;
          }
        }
      }
    }
    const brazil24h = Number(fires.count || features.length || 0);
    extras.fires = { brazil24h, nearby150km: nearby, meanFrpMw: fires.mean_frp_mw };
    if (nearby >= 5) worst = "red";
    else if (brazil24h > 0 && worst === "green") worst = "amber";
  }

  if (preset.usesSpaceWeather && spaceWeather) {
    const items = spaceWeather.notifications || spaceWeather.items || [];
    const alerts7d = Number(spaceWeather.count || items.length || 0);
    extras.spaceWeather = { alerts7d };
    if (alerts7d >= 12) worst = "red";
    else if (alerts7d >= 1 && worst === "green") worst = "amber";
  }

  const primary = indicators.find((i) => i.variable === preset.primaryVariable) || indicators[0];
  let headline = primary?.sentence || copy.explanation;
  if (preset.usesFires && extras.fires) {
    const f = extras.fires;
    headline =
      l === "pt"
        ? `${f.nearby150km} focos ativos a menos de 150 km de ${regName} (${f.brazil24h.toLocaleString("pt-BR")} no Brasil). ${primary?.sentence || ""}`.trim()
        : `${f.nearby150km} active fire hotspots within 150 km of ${regName} (${f.brazil24h.toLocaleString("en-US")} across Brazil). ${primary?.sentence || ""}`.trim();
  } else if (preset.usesSpaceWeather && extras.spaceWeather) {
    const sw = extras.spaceWeather;
    headline =
      l === "pt"
        ? `${sw.alerts7d} alertas solares/geomagnéticos do NASA DONKI nos últimos 7 dias. ${primary?.sentence || ""}`.trim()
        : `${sw.alerts7d} NASA DONKI solar/geomagnetic alerts recorded over 7 days. ${primary?.sentence || ""}`.trim();
  }

  return {
    presetId: preset.id,
    lang: l,
    title: copy.title,
    question: copy.question,
    explanation: copy.explanation,
    severity: worst,
    headline,
    action: copy.actions[worst],
    indicators,
    extras,
  };
}
