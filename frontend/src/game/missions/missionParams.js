/**
 * Audited repository parameters & parametric telemetry curve generator for
 * Curve of Duck: Rover Pilot 3D (M1–M5 + Mission Lab).
 *
 * Every parameter here mirrors scripts/bake_game_data.py -> mission_params.json.
 * During active play, the HUD marks generated/compressed curves explicitly as
 * PARAMETRIC PHYSICAL MODEL (MPTO); in post-mission Debrief, player decisions are
 * compared against both the Optimal Oracle and the actual frozen NASA snapshot.
 */

import { mulberry32 } from "../sim/planetaryPhysics.js";

export const AUDITED_PARAMS = {
  power_ne_hourly: {
    file: "data/power_ne_hourly.csv",
    peakDay: "2026-01-05",
    swMax: 1007.85,
    swMeanDaylight: 454.43,
    swP90Daylight: 792.85,
    t2mMin: 24.18,
    t2mMax: 38.32,
    // Peak day 2026-01-05 hourly ALLSKY_SFC_SW_DWN (05:00..19:00 UTC/local slice)
    peakDaylightHours: [
      9.25, 121.85, 287.2, 516.78, 693.17, 905.0, 1007.85, 983.85, 842.17, 720.1, 502.38, 261.52,
      41.45, 0.0,
    ],
  },
  meda_sol40_wind: {
    file: "data/meda_sol40_wind.csv",
    rowsCount: 19100,
    validCount: 18233,
    sentinelCount: 867,
    sentinelRate: 0.0454,
    sentinelValue: 999999999.0,
    min: 0.0,
    p50: 2.11,
    p90: 3.22,
    p99: 4.11,
    max: 5.36,
    mean: 1.97,
    std: 1.006,
  },
  meda_sol1100_rad: {
    file: "data/meda_sol1100_rad.csv",
    rowsCount: 58517,
    stillCount: 56917,
    movingCount: 1600,
    rdsTop1Max: 0.0008291,
  },
  trends: {
    campinas_WS2M: { tau: -0.021, pValue: 0.489, slope: -0.0042, significant: false },
    petrolina_WS2M: { tau: -0.042, pValue: 0.1734, slope: -0.0138, significant: false },
    campinas_ALLSKY: {
      tau: 0.103,
      pValue: 0.0008616,
      originalP: 0.1968,
      slope: 0.1621,
      significant: true,
    },
    campinas_CLRSKY: {
      tau: 0.322,
      pValue: 0.0,
      originalP: 0.14,
      slope: 0.1897,
      significant: true,
    },
    campinas_CLOUD: { tau: 0.002, pValue: 0.9476, slope: 0.0378, significant: false },
    manaus_CLOUD: { tau: -0.172, pValue: 3.015e-8, slope: -0.8552, significant: true },
    manaus_CLRSKY: { tau: 0.009, pValue: 0.7686, slope: 0.0289, significant: false },
  },
  space: {
    donkiCount: 8,
    donkiWindow: ["2026-11-07", "2026-11-14"],
    osdrStudy: "OSD-615",
    celestrakEclipsePct: 35,
    radiatorCeilingPct: 82,
    albedoIrGainPct: 13,
  },
};

export const MISSION_ORDER = ["M1", "M2", "M3", "M4", "M5"];

export const MISSION_DEFS = {
  M1: {
    id: "M1",
    badgeId: "field-duck-tamer",
    defaultPlanet: "earth_ne",
    durationTicks: 54,
    tickDurationSec: 1.0,
    startPos: { x: -4, z: 6, heading: 0 },
    primaryUnit: "W/m²",
    secondaryUnit: "% T⁴",
    sourceCite: "NASA POWER (power_ne_hourly.csv · 2026-01-05) + MPTO T⁴ Radiator",
    en: {
      title: "M1 · The Duck Belly & T⁴ Radiator",
      subtitle: "Solar surplus vs. afternoon ramp",
      badge: "Level 1 · Descriptive Curve",
      briefing:
        "From 05:00 to 18:00, solar irradiance surges to 1,007.85 W/m² while typical midday load dips (Duck Curve belly). When radiator load exceeds 82%, dock at the BESS Station [5] or fold wings [1] / shelter in shade. When the afternoon neck drops, reopen wings [1] on the East Ridge.",
      objectiveShort: "Survive midday surplus (dock BESS [5] or fold [1]), then harvest the 16h ramp.",
      takeaway:
        "Curtailment happens when midday solar peaks exceed local demand and thermal rejection (T⁴ ceiling 82%). Dispatching BESS storage turns wasted surplus into evening survival.",
      depthHint: {
        explorer: "Watch the rising orange solar curve cross the dashed threshold line.",
        analyst: "Notice the net-load gap (solar minus illustrative demand) peaking around 11:00–13:00.",
        specialist: "Balance Beer-Lambert PV input against radiative T⁴ ceiling (82%) before the 16:00 ramp.",
      },
    },
    pt: {
      title: "M1 · A Barriga do Pato e o Radiador T⁴",
      subtitle: "Excesso solar vs. rampa vespertina",
      badge: "Nível 1 · Leitura da Curva",
      briefing:
        "Das 05h às 18h, a irradiância sobe até 1.007,85 W/m² enquanto a carga típica cai ao meio-dia (barriga da Curva do Pato). Acima de 82% no radiador T⁴, acople na Estação BESS [5] ou feche as asas [1] / use a sombra. Na queda da tarde, suba na Crista Leste e reabra [1].",
      objectiveShort: "Escoe o pico ao meio-dia (BESS [5] ou feche [1]) e recupere na rampa das 16h.",
      takeaway:
        "Curtailment ocorre quando o pico solar ultrapassa a demanda local e o limite térmico T⁴ (82%). Armazenar na bateria térmica evita queimar o inversor e garante a rampa noturna.",
      depthHint: {
        explorer: "Observe a curva solar subir acima da linha pontilhada de limite.",
        analyst: "Repare no vão entre geração solar e demanda ilustrativa entre 11h e 13h.",
        specialist: "Equilibre a geração PV com a saturação do radiador T⁴ (82%) antes da rampa das 16h.",
      },
    },
  },

  M2: {
    id: "M2",
    badgeId: "martian-wind-shelter",
    defaultPlanet: "mars_jezero",
    durationTicks: 54,
    tickDurationSec: 1.0,
    startPos: { x: 4, z: -12, heading: 0.4 },
    primaryUnit: "m/s",
    secondaryUnit: "P90 band",
    sourceCite: "PDS Mars 2020 MEDA Sol 40 (19,100 rows, max 5.36 m/s) vs. WS2M null (p=0.489)",
    en: {
      title: "M2 · Gust Hunter & The Honest Null",
      subtitle: "Monthly wind is flat (p=0.489) — seconds-scale gusts are not",
      badge: "Level 2 · Uncertainty & Thresholds",
      briefing:
        "Monthly WS2M shows no multi-decade trend (p = 0.489). Yet at 2 Hz in Jezero, MEDA gusts climb past P99 (4.11 -> 5.36 m/s). First tilt wings [3] during moderate wind (2.2–3.5 m/s) for natural wind-cleaning; when the P90 band crosses 3.8 m/s, shelter behind Rock/Crater, fold [1] and lower mast [2]!",
      objectiveShort: "Clean dust with [3] in gentle breeze, then Shelter + Fold [1] + Lower [2] before gust!",
      takeaway:
        "Monthly averages hide sub-minute extremes. Acting on the upper dispersion band (P90) before structural damage hits saves the wings without sacrificing earlier cleaning gain.",
      depthHint: {
        explorer: "Watch the wind curve climb. When the alert flashes, race behind the rock and press [1] and [2].",
        analyst: "Don't wait for the median to cross red — act as soon as the shaded P90 uncertainty band touches 3.8 m/s.",
        specialist: "Combine Sol 40 rolling dispersion with wind-cleaning window (2.2–3.5 m/s) before aerodynamic drag spikes.",
      },
    },
    pt: {
      title: "M2 · Caçador de Rajadas e o Nulo Honesto",
      subtitle: "Vento mensal é nulo (p=0,489) — rajadas em segundos não",
      badge: "Nível 2 · Incerteza & Abrigo",
      briefing:
        "O vento mensal WS2M não tem tendência (p = 0,489). Porém a 2 Hz em Jezero, rajadas MEDA sobem além do P99 (4,11 -> 5,36 m/s). Primeiro incline [3] na brisa (2,2–3,5 m/s) para limpeza eólica; quando a banda P90 cruzar 3,8 m/s, abrigue-se na Rocha/Cratera, feche [1] e abaixe [2]!",
      objectiveShort: "Limpe poeira com [3] na brisa e depois Abrigo + Fechar [1] + Abaixar [2] antes do pico!",
      takeaway:
        "Médias mensais escondem extremos de segundos. Decidir pelo limite superior da faixa P90 protege a estrutura sem perder a janela anterior de limpeza natural pelo vento.",
      depthHint: {
        explorer: "Acompanhe a curva de vento subir. No alerta, corra atrás da rocha e aperte [1] e [2].",
        analyst: "Não espere o ponto central cruzar o vermelho — aja quando a sombra P90 tocar 3,8 m/s.",
        specialist: "Explore a janela de limpeza eólica (2,2–3,5 m/s) usando a dispersão empírica do Sol 40.",
      },
    },
  },

  M3: {
    id: "M3",
    badgeId: "optic-sanitizer",
    defaultPlanet: "mars_jezero",
    durationTicks: 56,
    tickDurationSec: 1.0,
    startPos: { x: -20, z: 16, heading: 0.7 },
    primaryUnit: "|I_t - I_t-1|",
    secondaryUnit: "tau",
    sourceCite: "MEDA Sol 1100 RDS (58,517 rows, ROVER_STILL) + Sol 40 Sentinels (867 flags 999999999.0)",
    en: {
      title: "M3 · Blind Vision (t-1 -> t) & 999999999.0",
      subtitle: "Impulse-calibrated Crater Alpha (>40% slip · 1.8x Wh/km) & sensor dropouts",
      badge: "Level 3 · Data Quality & Geotechnical Fusion",
      briefing:
        "Guide Rover-01 to the EDL Landing Beacon [5] across Sector 4. Fake sensor spikes (999999999.0) will flash red — purge them with [4] without panicking! When real Beer-Lambert opacity tau surges (>1.6) and |I_t - I_t-1| climbs, HALT briefly (ROVER_STILL=1) to lock landmarks, bypass unconsolidated Alpha Crater sand (>40% wheel slip, 1.8x Wh/km energy drain) via the Green Basalt Plateau, and dock at the Beacon.",
      objectiveShort: "Sanitize 999999999.0 [4], bypass Alpha Crater (1.8x Wh/km), halt in dust, dock Beacon [5].",
      takeaway:
        "Sentinel flags (999999999.0) are not physical storms, while orbital thermal inertia calibrated by Act 1's 64 m impulse test proves Position Alpha has >40% wheel slip (1 km geometric = 1.8 km energy distance).",
      depthHint: {
        explorer: "Press [4] whenever the red 999999999.0 glitch appears. Avoid the red Alpha Crater sand trap!",
        analyst: "Watch |I_t - I_t-1| vs tau: motion increases frame delta, and Alpha Crater drains 1.8x Wh/km.",
        specialist: "Fuse Beer-Lambert tau, 4.5% sentinel rejection, and Grok Cratera thermal-inertia routing.",
      },
    },
    pt: {
      title: "M3 · Visão Cega (t-1 -> t) & Sentinelas 999999999.0",
      subtitle: "Cratera Alpha calibrada por impulso (>40% slip · 1,8x Wh/km) e falhas do sensor",
      badge: "Nível 3 · Qualidade de Dados & Fusão Geotécnica",
      briefing:
        "Guie o Rover-01 até o Farol EDL [5] no Setor 4. Picos falsos (999999999.0) vão piscar — filtre com [4] sem abortar! Quando a opacidade real Beer-Lambert tau subir (>1,6) e |I_t - I_t-1| disparar, PARE brevemente (ROVER_STILL=1) para travar os marcos externos, contorne a areia não consolidada da Cratera Alpha (>40% patinagem, 1,8x Wh/km) pelo Platô de Basalto Verde e acople no Farol.",
      objectiveShort: "Filtre erros 999999999.0 [4], contorne Cratera Alpha (1,8x Wh/km), pare na poeira e acople [5].",
      takeaway:
        "Sentinelas (999999999.0) são falhas de telemetria; já a inércia térmica orbital calibrada pelo empuxo a 64 m prova que a Cratera Alpha gera >40% de patinagem (1 km geométrico = 1,8 km em Wh/km).",
      depthHint: {
        explorer: "Aperte [4] quando aparecer o erro 999999999.0. Não entre na areia fofa da Cratera Alpha!",
        analyst: "Compare |I_t - I_t-1| com tau e evite o dreno energético de 1,8x Wh/km na Cratera Alpha.",
        specialist: "Una rejeição de 4,5% de sentinelas, derivada t-1 -> t e auditoria geotécnica Grok Cratera.",
      },
    },
  },

  M4: {
    id: "M4",
    badgeId: "causal-detective-3d",
    defaultPlanet: "earth_se",
    durationTicks: 60,
    tickDurationSec: 1.0,
    startPos: { x: -20, z: 18, heading: 0.2 },
    primaryUnit: "MJ/m²/d",
    secondaryUnit: "Cloud %",
    sourceCite: "NASA POWER 42-yr (Campinas ALLSKY p=0.00086, CLRSKY tau=+0.322, CLOUD p=0.948 vs. Manaus)",
    en: {
      title: "M4 · Two Smokes: Campinas vs. Manaus (42 yrs)",
      subtitle: "Seasonal Mann-Kendall & falsification in 3D time travel",
      badge: "Level 4 · Trend & Causal Attribution",
      briefing:
        "Travel across 42 years (1984–2025). Visit the 3 decade masts and raise mast [2] to stratify months with Seasonal Mann-Kendall — watch the seasonal noise flatten into the true Theil-Sen rise (p=0.00086)! Then inspect the dual curves (CLRSKY vs CLOUD) and dock [5] at the TRUE physical driver for Campinas.",
      objectiveShort: "Sample 3 decade masts [2], then dock [5] at the Aerosol/Clear-Sky driver (not Clouds!).",
      takeaway:
        "In Campinas, Cloud Attenuation is null (p=0.948) while Clear-Sky rises (+0.190 MJ/m²/day/dec, p<1e-16) — proving aerosol/haze drift, the exact opposite of cloud-driven Manaus (-0.855 %/dec).",
      depthHint: {
        explorer: "Drive to all 3 glowing decade poles and press [2]. Then pick the matching explanation station!",
        analyst: "Compare the two curves after sampling: flat Cloud % (p=0.948) rules out clouds as the Campinas driver.",
        specialist: "Execute full falsification: Seasonal MK rescues p=0.197 -> p=0.00086, then isolate CLRSKY vs CLOUD.",
      },
    },
    pt: {
      title: "M4 · O Enigma das Duas Fumaças: Campinas vs. Manaus",
      subtitle: "Mann-Kendall Sazonal e falsificação causal em 42 anos",
      badge: "Nível 4 · Tendência & Atribuição",
      briefing:
        "Percorra 42 anos (1984–2025). Visite as 3 estações de década e erga o mastro [2] para aplicar o Mann-Kendall Sazonal — veja o zigue-zague revelar a subida real (p=0,00086)! Depois compare as duas curvas (Céu Limpo vs Nuvens) e acople [5] no vetor físico VERDADEIRO de Campinas.",
      objectiveShort: "Colete as 3 décadas [2] e acople [5] no vetor Aerossol/Céu Limpo (não em Nuvens!).",
      takeaway:
        "Em Campinas, a cobertura de nuvens é nula (p=0,948) enquanto o céu limpo sobe (+0,190 MJ/m²/dia/déc, p<1e-16) — provando efeito de aerossóis, o oposto de Manaus (-0,855 %/déc em nuvens).",
      depthHint: {
        explorer: "Visite os 3 postes de década apertando [2] e escolha a estação correta no norte do mapa.",
        analyst: "Após coletar, observe que a curva de nuvens é reta (p=0,948), descartando nuvens como causa.",
        specialist: "Falsificação completa: bloco sazonal resgata p=0,197 -> p=0,00086 e isola CLRSKY de CLOUD.",
      },
    },
  },

  M5: {
    id: "M5",
    badgeId: "mpto-commander",
    defaultPlanet: "moon_artemis",
    durationTicks: 62,
    tickDurationSec: 1.0,
    startPos: { x: -4, z: 18, heading: -0.3 },
    primaryUnit: "Solar %",
    secondaryUnit: "DONKI Flux",
    sourceCite: "NASA DONKI 7d (8 alerts: CME/RBE) + OSDR OSD-615 (SoC_bio) + CelesTrak 35% Eclipse",
    en: {
      title: "M5 · Conjugated Storm: DONKI + MPTO Survival",
      subtitle: "Anticipatory dispatch across energy, SoC_bio & lava tube shelter",
      badge: "Level 5 · Master Multi-Physics",
      briefing:
        "Three curves converge: solar flux plunges toward a 35% eclipse window while NASA DONKI CME/RBE alerts climb toward impact and Greenhouse SoC_bio drains. (1) Harvest +13% IR Albedo on the Sunlit Crater Rim (open [1] + tilt [3]); (2) Dock at OSD-615 Greenhouse [5] to secure SoC_bio; (3) Fold [1], lower [2], and enter the Lava Tube before CME impact!",
      objectiveShort: "Rim IR harvest -> Greenhouse [5] SoC_bio -> Fold [1] + Lower [2] inside Lava Tube!",
      takeaway:
        "MPTO solves multi-hazard survival by dispatching ahead of actuator lead time: harvesting crater IR albedo first, stabilizing biological circularity (OSD-615), and sheltering before space-weather onset.",
      depthHint: {
        explorer: "Follow the 3 beacons in order: Crater Rim -> Greenhouse [5] -> Lava Tube ([1] + [2]).",
        analyst: "Don't wait for the red DONKI spike to leave the rim — leave by t=34s so you dock Greenhouse and shelter in time.",
        specialist: "Optimize full 4-layer MPTO coupling: crater albedo (+13%), biological floor SoC_bio, and DONKI CME shelter.",
      },
    },
    pt: {
      title: "M5 · Tempestade Conjugada: DONKI + Sobrevivência MPTO",
      subtitle: "Despacho antecipado entre energia, SoC_bio e tubo de lava",
      badge: "Nível 5 · Orquestração Multifísica",
      briefing:
        "Três vetores convergem: o sol cai rumo ao eclipse (35%) enquanto alertas DONKI (CME/RBE) sobem e a estufa SoC_bio perde reserva. (1) Colete +13% de Albedo IR na Borda da Cratera (abra [1] + incline [3]); (2) Acople na Estufa OSD-615 [5] para proteger SoC_bio; (3) Feche [1], abaixe [2] e entre no Tubo de Lava antes do impacto!",
      objectiveShort: "Borda IR -> Estufa [5] (SoC_bio) -> Fechar [1] + Abaixar [2] dentro do Tubo de Lava!",
      takeaway:
        "O MPTO antecipa o despacho antes da latência dos atuadores: capta albedo IR antes do eclipse, protege o piso biológico (OSD-615) e recolhe o rover no tubo subterrâneo antes da tempestade solar.",
      depthHint: {
        explorer: "Siga os 3 marcos na sequência: Borda Iluminada -> Estufa [5] -> Tubo de Lava ([1] + [2]).",
        analyst: "Saia da borda antes de t=34s para ter tempo de acoplar na estufa e alcançar o tubo de lava.",
        specialist: "Orquestre as 4 camadas MPTO: ganho IR de cratera (+13%), piso SoC_bio e proteção contra eventos DONKI.",
      },
    },
  },
};

const SEVERITY_SCALE = {
  P50: 0.85,
  P90: 1.0,
  P99: 1.22,
};

/**
 * Generates deterministic, playable mission telemetry parameterized by AUDITED_PARAMS.
 */
export function generateMissionTelemetry(missionId, options = {}) {
  const {
    severity = "P90",
    dropoutRate = null,
    seed = 2026,
  } = options;

  const def = MISSION_DEFS[missionId] || MISSION_DEFS.M2;
  const n = def.durationTicks;
  const rng = mulberry32(seed + missionId.charCodeAt(1) * 97);
  const scale = SEVERITY_SCALE[severity] || 1.0;

  const points = [];

  if (missionId === "M1") {
    // Interpolate real 2026-01-05 peak daylight curve from power_ne_hourly.csv across n ticks
    const rawDay = AUDITED_PARAMS.power_ne_hourly.peakDaylightHours;
    for (let i = 0; i < n; i += 1) {
      const f = (i / (n - 1)) * (rawDay.length - 1);
      const lo = Math.floor(f);
      const hi = Math.min(rawDay.length - 1, lo + 1);
      const frac = f - lo;
      const baseSw = rawDay[lo] + (rawDay[hi] - rawDay[lo]) * frac;
      const sw = Math.max(0, Math.round(baseSw * scale * (0.97 + rng() * 0.06)));
      // Illustrative duck-curve residential demand (W/m² equivalent load baseline)
      const hour = 5 + (i / (n - 1)) * 13.5;
      const demandEq = Math.round(
        480 - 190 * Math.exp(-((hour - 12.2) ** 2) / 5.5) + 330 * Math.exp(-((hour - 17.8) ** 2) / 3.2)
      );
      const hourStr = `${String(Math.floor(hour)).padStart(2, "0")}:${hour % 1 >= 0.5 ? "30" : "00"}`;
      const spread = 55 * scale;
      points.push({
        t: i,
        label: hourStr,
        primaryVal: sw,
        secondaryVal: demandEq,
        threshold: 760,
        uncertaintyLo: Math.max(0, Math.round(sw - spread)),
        uncertaintyHi: Math.round(sw + spread),
        tau: 0.22 + (hour > 16 ? 0.15 : 0),
        windMs: 3.1 + Math.sin(i * 0.25) * 0.8,
        sentinel: false,
        phaseTag: i >= 16 && i <= 34 ? "surplus" : i >= 38 ? "duck_neck" : "morning",
      });
    }
    return points;
  }

  if (missionId === "M2") {
    // MEDA Sol 40 parameterized wind (mean 1.97, std 1.006, p90 3.22, p99 4.11, max 5.36)
    // Plus 4.54% sentinel rate unless overridden
    const sRate = dropoutRate !== null ? dropoutRate : AUDITED_PARAMS.meda_sol40_wind.sentinelRate;
    let wind = 2.05;
    for (let i = 0; i < n; i += 1) {
      // Phase 1 (t 6..20): clean wind-cleaning breeze ~2.5-3.2 m/s
      // Phase 2 (t 25..44): gust front rising toward P99/max (4.2 - 5.4 m/s * scale)
      const gustEnvelope =
        i >= 25 && i <= 44
          ? Math.sin(((i - 25) / 19) * Math.PI) * 3.1 * scale
          : i >= 7 && i <= 21
          ? 0.75 * Math.sin(((i - 7) / 14) * Math.PI)
          : 0;
      const ar = 0.65 * (wind - 2.0) + (rng() - 0.5) * 0.55;
      wind = Math.max(0.4, Number((2.05 + ar * 0.45 + gustEnvelope).toFixed(2)));
      const unc = Number((0.42 + (i >= 24 && i <= 45 ? 0.52 : 0.12) * scale).toFixed(2));
      const isSentinel = rng() < sRate && i > 4 && i < n - 3;
      points.push({
        t: i,
        label: `S40+${i}s`,
        primaryVal: wind,
        secondaryVal: Number((wind + unc).toFixed(2)),
        threshold: 3.8,
        uncertaintyLo: Math.max(0, Number((wind - unc * 0.8).toFixed(2))),
        uncertaintyHi: Number((wind + unc).toFixed(2)),
        tau: 0.55 + Math.max(0, wind - 2.5) * 0.35,
        windMs: wind,
        sentinel: isSentinel,
        phaseTag: i >= 26 && i <= 43 ? "gust_danger" : i >= 7 && i <= 21 ? "wind_clean" : "calm",
      });
    }
    return points;
  }

  if (missionId === "M3") {
    // MEDA Sol 1100 RDS opacity tau + sentinel 999999999.0 spikes + dust devil plume
    const sRate = dropoutRate !== null ? dropoutRate : 0.08;
    for (let i = 0; i < n; i += 1) {
      const dustPlume =
        (i >= 18 && i <= 27 ? Math.sin(((i - 18) / 9) * Math.PI) * 1.65 : 0) +
        (i >= 35 && i <= 46 ? Math.sin(((i - 35) / 11) * Math.PI) * 2.05 : 0);
      const tau = Number((0.55 + dustPlume * scale + rng() * 0.18).toFixed(2));
      const isSentinel = (i === 6 || i === 15 || i === 30 || rng() < sRate * 0.4) && i > 3 && i < n - 4;
      const baseDelta = Number(Math.min(0.95, 0.08 + dustPlume * 0.34 + rng() * 0.06).toFixed(3));
      points.push({
        t: i,
        label: `Sol1100+${i}`,
        primaryVal: baseDelta,
        secondaryVal: tau,
        threshold: 0.48,
        uncertaintyLo: Math.max(0, Number((baseDelta - 0.08).toFixed(3))),
        uncertaintyHi: Number(Math.min(1, baseDelta + 0.1).toFixed(3)),
        tau,
        windMs: 2.3 + dustPlume * 1.1,
        sentinel: isSentinel,
        phaseTag: tau >= 1.55 ? "dust_plume" : "nav",
      });
    }
    return points;
  }

  if (missionId === "M4") {
    // 42-year Campinas ALLSKY/CLRSKY rise (+0.162 / +0.190 MJ/m2/day/dec) vs flat CLOUD_ATTEN_PCT
    // Overlaid with dramatic seasonal summer/winter oscillation so Seasonal MK reveal matters!
    for (let i = 0; i < n; i += 1) {
      const year = Math.round(1984 + (i / (n - 1)) * 41);
      const decades = (year - 1984) / 10;
      const seasonalWave = Math.sin(i * 1.15) * 3.1; // Large seasonal swing that fools naive test (p=0.197)
      const allSky = Number((18.2 + decades * 0.1621 * scale + seasonalWave + (rng() - 0.5) * 0.4).toFixed(2));
      const clrSky = Number((23.1 + decades * 0.1897 * scale + seasonalWave * 0.65).toFixed(2));
      const cloudPct = Number((21.0 + Math.sin(i * 1.15) * 3.8 + decades * 0.0378 + (rng() - 0.5) * 0.8).toFixed(2));
      points.push({
        t: i,
        label: String(year),
        primaryVal: allSky,
        secondaryVal: cloudPct,
        clrSkyVal: clrSky,
        deseasonalizedTrend: Number((18.2 + decades * 0.1621 * scale).toFixed(2)),
        threshold: 18.7,
        uncertaintyLo: Number((allSky - 0.8).toFixed(2)),
        uncertaintyHi: Number((allSky + 0.8).toFixed(2)),
        tau: 0.25 + decades * 0.05,
        windMs: 2.4 + Math.sin(i * 0.5) * 0.6,
        sentinel: false,
        phaseTag: i >= 38 ? "attribution" : "sampling",
      });
    }
    return points;
  }

  // M5: Conjugated Space Storm (DONKI RBE/CME + Eclipse Solar Drop)
  for (let i = 0; i < n; i += 1) {
    // Solar irradiance high at start (crater rim harvest), drops steeply at t=30..50 (35% orbital/eclipse window)
    const solarPct =
      i < 28
        ? Math.round(92 - i * 0.3 + rng() * 4)
        : i < 46
        ? Math.round(Math.max(8, 84 - ((i - 28) / 18) * 76))
        : Math.round(12 + (i - 46) * 2.5);
    // DONKI CME/RBE flux builds sharply from t=32 -> t=56
    const donkiFlux =
      i < 26
        ? Math.round(18 + rng() * 8)
        : Math.min(100, Math.round((18 + ((i - 26) / 22) * 78) * scale + rng() * 5));
    points.push({
      t: i,
      label: `T+${i}m`,
      primaryVal: solarPct,
      secondaryVal: donkiFlux,
      threshold: 68, // DONKI storm shelter threshold
      uncertaintyLo: Math.max(0, donkiFlux - 9),
      uncertaintyHi: Math.min(100, donkiFlux + 9),
      tau: 0.25 + (donkiFlux > 68 ? 0.85 : 0.1),
      windMs: 1.5,
      sentinel: false,
      phaseTag: donkiFlux >= 68 ? "cme_impact" : i < 28 ? "rim_harvest" : "greenhouse_dispatch",
    });
  }
  return points;
}
