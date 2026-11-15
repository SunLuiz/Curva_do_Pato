// Single source of truth for the 7-slide Story carousel, Present mode, and generated Pitch Deck.
// IMPORTANT: Every slide's `curvePoints` MUST contain exactly 8 [x, y] pairs in a 1200x600
// coordinate space so the background SVG path interpolates smoothly without NaN or jumps.

const SLIDE_DEFS = [
  {
    id: "cover",
    tone: "--biome-se",
    bgTint: "#F4F7F3",
    evidence: false,
    deck: true,
    curvePoints: [
      [0, 440],
      [170, 390],
      [340, 455],
      [510, 360],
      [680, 415],
      [850, 310],
      [1020, 345],
      [1200, 230],
    ],
    en: {
      kicker: "1 / 7 · Team Curva do Pato · NASA Space Apps Challenge 2026",
      title: "Learn to tell climate change from climate noise.",
      body: "Everyone sees jagged weather charts; few can tell real multi-decade drift from seasonal swings. Cockpit-OMNI turns 42 years of NASA observations into audited, plain-language answers.",
      highlights: [
        { label: "Challenge", value: "#2 — Be An Earth System Trend Detective!" },
        { label: "Time Span", value: "1984–2025 (504 monthly NASA POWER points per series)" },
        { label: "Location & Access", value: "Campinas, SP · Zero-Login · Instant Browser Fallback" },
      ],
    },
    pt: {
      kicker: "1 / 7 · Equipe Curva do Pato · NASA Space Apps Challenge 2026",
      title: "Aprenda a separar mudança climática de ruído sazonal.",
      body: "Todo mundo vê gráficos cheios de altos e baixos, mas quase ninguém consegue distinguir o ciclo natural de verão/inverno da tendência real de 42 anos. O Cockpit-OMNI traduz dados abertos da NASA em respostas auditáveis.",
      highlights: [
        { label: "Desafio NASA", value: "#2 — Be An Earth System Trend Detective!" },
        { label: "Série Histórica", value: "1984–2025 (504 observações mensais NASA POWER)" },
        { label: "Acesso Aberto", value: "Campinas-SP · Sem login · Funciona até offline" },
      ],
    },
  },
  {
    id: "system",
    tone: "--biome-n",
    bgTint: "#F2F6F8",
    evidence: false,
    deck: true,
    curvePoints: [
      [0, 420],
      [170, 355],
      [340, 390],
      [510, 310],
      [680, 345],
      [850, 265],
      [1020, 295],
      [1200, 215],
    ],
    en: {
      kicker: "2 / 7 · Architecture, Mission & Five Values",
      title: "Three focused menus. Five non-negotiable rules of scientific honesty.",
      body: "Story introduces the mission, Academy trains hypothesis testing, and Cockpit exposes raw NASA telemetry. Every chart obeys Seasonal Mann-Kendall (period = 12) + Theil-Sen with explicit live vs. frozen disclosure.",
      highlights: [
        { label: "Proof before story", value: "No trend claim without tau, p-value, and 95% confidence band." },
        { label: "Publish when wrong", value: "Null results (wind WS2M) stay visible instead of hidden hype." },
        { label: "Not a black box", value: "Deterministic falsification workbench with full CSV/JSON export." },
      ],
    },
    pt: {
      kicker: "2 / 7 · Missão, Arquitetura e 5 Valores",
      title: "Três menus diretos. Cinco regras inegociáveis de honestidade científica.",
      body: "Story apresenta o propósito, Academy treina hipóteses sem login e o Cockpit abre a telemetria bruta da NASA. Todo cálculo passa por Mann-Kendall Sazonal (período = 12) + Theil-Sen com status ao vivo ou congelado explícito.",
      highlights: [
        { label: "Prova antes da narrativa", value: "Nenhuma tendência aparece sem tau, p-valor e IC 95%." },
        { label: "Publicar quando dá nulo", value: "Vento WS2M sem tendência fica exposto, sem forçar manchete." },
        { label: "Sem caixa-preta", value: "Bancada de falseamento estatístico com CSV e JSON abertos." },
      ],
    },
  },
  {
    id: "trends_human",
    tone: "--biome-se",
    bgTint: "#F2F7F3",
    evidence: false,
    deck: true,
    curvePoints: [
      [0, 480],
      [170, 450],
      [340, 415],
      [510, 375],
      [680, 330],
      [850, 280],
      [1020, 220],
      [1200, 155],
    ],
    en: {
      kicker: "3 / 7 · Trends in Human Language (1984–2025)",
      title: "Forty-two years of NASA measurements translated into a citizen traffic light.",
      body: "Instead of expecting citizens to decode p < 1e-16, we convert audited Theil-Sen slopes across three Brazilian biomes into Red / Amber / Green briefings backed by verifiable numbers.",
      highlights: [
        { label: "Campinas-SP (Atlantic)", value: "+0.409 °C/dec · 95% CI [+0.333, +0.489] · +1.718 °C total" },
        { label: "Petrolina & Manaus", value: "+0.301 °C/dec (+1.265 °C) · Manaus +0.307 °C/dec (+1.287 °C)" },
        { label: "Declared Null (WS2M)", value: "Surface wind p = 0.489 / 0.173 / 0.451 -> Green stable, no hourly claim." },
      ],
    },
    pt: {
      kicker: "3 / 7 · Tendências em Linguagem Humana (1984–2025)",
      title: "Quarenta e dois anos da NASA traduzidos para um semáforo cidadão.",
      body: "Em vez de exigir leitura de p < 1e-16, traduzimos as inclinações de Theil-Sen em três biomas brasileiros para níveis Vermelho, Atenção e Verde, mantendo o dado auditável a um clique.",
      highlights: [
        { label: "Campinas-SP (Mata Atlântica)", value: "+0.409 °C/déc · IC 95% [+0.333, +0.489] · +1.718 °C total" },
        { label: "Petrolina & Manaus", value: "+0.301 °C/déc (+1.265 °C) · Manaus +0.307 °C/déc (+1.287 °C)" },
        { label: "Nulo Honesto (WS2M)", value: "Vento mensal p = 0.489 / 0.173 / 0.451 -> Estável, sem previsão horária." },
      ],
    },
  },
  {
    id: "attribution",
    tone: "--biome-ne",
    bgTint: "#FAF4EA",
    evidence: false,
    deck: true,
    curvePoints: [
      [0, 360],
      [170, 310],
      [340, 260],
      [510, 330],
      [680, 390],
      [850, 240],
      [1020, 190],
      [1200, 280],
    ],
    en: {
      kicker: "4 / 7 · Attribution + Earthdata CMR MCP",
      title: "One statistical engine. Opposite physical drivers.",
      body: "Surface sunlight can rise because clouds vanished OR because dry-sky haze changed. Comparing All-Sky vs. Clear-Sky radiation alongside Earthdata CMR metadata separates the cause cleanly.",
      highlights: [
        { label: "Manaus & Petrolina", value: "Cloud attenuation falls (-0.855 & -0.965 %/dec), Clear-Sky null -> Cloud-driven." },
        { label: "Campinas-SP", value: "Clouds null (p = 0.948), Clear-Sky rises (+0.190 MJ/m2/day/dec) -> Aerosol/haze." },
        { label: "CMR Provenance", value: "Verified C3264430167-LANCEMODIS (VIIRS) & NISAR_L2_GUNW_PROVISIONAL_V1." },
      ],
    },
    pt: {
      kicker: "4 / 7 · Atribuição Física + Earthdata CMR MCP",
      title: "Um único motor estatístico. Causas físicas opostas.",
      body: "Mais sol no solo pode significar menos nuvens OU mudança na transparência atmosférica. Cruzar radiação total versus céu limpo e catálogos NASA CMR separa os dois mecanismos sem achismo.",
      highlights: [
        { label: "Manaus & Petrolina", value: "Nuvens caem (-0.855 e -0.965 %/déc), céu claro nulo -> Efeito de nuvens." },
        { label: "Campinas-SP", value: "Nuvens estáveis (p = 0.948), céu limpo sobe (+0.190 MJ/m2/dia/déc) -> Aerossóis." },
        { label: "Proveniência CMR", value: "IDs auditados: C3264430167-LANCEMODIS (VIIRS) e NISAR_L2_GUNW_PROVISIONAL_V1." },
      ],
    },
  },
  {
    id: "presets",
    tone: "--biome-se",
    bgTint: "#F4F7F3",
    evidence: false,
    deck: true,
    curvePoints: [
      [0, 430],
      [170, 405],
      [340, 375],
      [510, 340],
      [680, 305],
      [850, 265],
      [1020, 225],
      [1200, 185],
    ],
    en: {
      kicker: "5 / 7 · Layperson Action Presets",
      title: "Five real-world questions replace cryptic variable codes.",
      body: "Non-specialists pick the decision they care about — Heatwaves, Drought, Wildfires, Solar Storm, or City Health — and immediately receive a traffic-light verdict, action step, and hover glossary.",
      highlights: [
        { label: "Heatwaves & Drought", value: "Couples temperature, solar irradiance, rainfall, humidity, and clouds." },
        { label: "Wildfires (150 km)", value: "Joins 24h VIIRS hotspots nearby with cloudless air dryness." },
        { label: "Hover Glossary", value: "Interactive definitions for Theil-Sen, p-value, Mann-Kendall & Tau." },
      ],
      cta: { label: "Try Action Presets in Cockpit", route: "/cockpit?tab=trend" },
    },
    pt: {
      kicker: "5 / 7 · Presets de Ação para Pessoas Comuns",
      title: "Cinco perguntas do dia a dia substituem siglas técnicas obscuras.",
      body: "Qualquer visitante escolhe sua dúvida prática — Calor, Seca, Queimadas, Tempestade Solar ou Resumo da Cidade — e recebe diagnóstico em semáforo, ação recomendada e glossário interativo.",
      highlights: [
        { label: "Calor & Estiagem", value: "Conecta temperatura, radiação solar, chuva, umidade e nuvens num só painel." },
        { label: "Queimadas (150 km)", value: "Cruza focos VIIRS em 24h ao redor da cidade com ar seco de céu claro." },
        { label: "Glossário Vivo", value: "Passe o mouse ou toque para entender Theil-Sen, p-valor, Tau e MPTO." },
      ],
      cta: { label: "Testar Presets no Cockpit", route: "/cockpit?tab=trend" },
    },
  },
  {
    id: "proof",
    tone: "--biome-ne",
    bgTint: "#FAF5EC",
    evidence: false,
    deck: true,
    curvePoints: [
      [0, 440],
      [170, 380],
      [340, 410],
      [510, 330],
      [680, 290],
      [850, 240],
      [1020, 200],
      [1200, 160],
    ],
    en: {
      kicker: "6 / 7 · Trend Detective Academy & Live Proof",
      title: "Who grades your hypothesis is the statistical engine — never an LLM.",
      body: "Adapted from HKUDS/DeepTutor without server logins: type a nickname, complete five real-data challenges, pass a mathematically realistic mastery gate (>= 0.80), and earn a printable diploma while Ask OMNI answers strictly from telemetry.",
      highlights: [
        { label: "3 Learning Tracks", value: "Explorer (12+) · Analyst (students/planners) · Specialist (researchers)" },
        { label: "Zero-Login State", value: "Browser localStorage progress + explicit 'Forget me' privacy control." },
        { label: "Grounded Q&A Proxy", value: "Server-side Gonka/Groq/OpenRouter keys never touch client JS." },
      ],
      cta: { label: "Enter the Academy", route: "/academy" },
    },
    pt: {
      kicker: "6 / 7 · Academy & Provas Verificadas",
      title: "Quem avalia sua hipótese é o motor estatístico — nunca uma IA inventando.",
      body: "Inspirado no HKUDS/DeepTutor sem login: digite seu nome, resolva cinco módulos com séries reais, atinja maestria >= 0.80 com falseamento e receba certificado enquanto o Ask OMNI responde ancorado nos dados.",
      highlights: [
        { label: "3 Trilhas de Profundidade", value: "Explorer (12+) · Analyst (estudantes) · Specialist (pesquisadores)" },
        { label: "Privacidade Total", value: "Progresso no navegador via localStorage com botão explícito 'Esquecer dados'." },
        { label: "Proxy IA Seguro", value: "Chaves Gonka/Groq/OpenRouter protegidas no servidor, zero vazamento." },
      ],
      cta: { label: "Entrar na Academy", route: "/academy" },
    },
  },
  {
    id: "future_space",
    tone: "--biome-n",
    bgTint: "#F1F7F8",
    evidence: false,
    deck: true,
    curvePoints: [
      [0, 450],
      [170, 395],
      [340, 355],
      [510, 315],
      [680, 275],
      [850, 235],
      [1020, 195],
      [1200, 150],
    ],
    en: {
      kicker: "7 / 7 · Earth Duck Curve -> Off-World Frontiers (MPTO)",
      title: "Same thermodynamic guardrail from Brazil's grid to Moon & Mars habitats.",
      body: "Open feeds (NASA DSN Now, OSDR OSD-615 plant cell-walls, CelesTrak GP) meet our 4-layer Multi-Physics Orchestrator: T^4 radiator saturation, sintered regolith thermal batteries (~50x k), lunar IR albedo (+10-15%), and rover dispatch.",
      highlights: [
        { label: "Real Open Space Feeds", value: "NASA DSN (Goldstone/Madrid/Canberra), OSDR OSD-615 SoC_bio & CelesTrak." },
        { label: "Heat Sink & Regolith", value: "Couples T^4 compute curtailment, thermal cycle fatigue & P10-P95 dust Cp." },
        { label: "Anticipatory Control", value: "Dispatches rovers, Stirling & ISRU gasifiers 30–60 min before solar ramps." },
      ],
      cta: { label: "Explore Space Analog (MPTO)", route: "/cockpit?tab=space" },
    },
    pt: {
      kicker: "7 / 7 · Curva do Pato -> Fronteiras Espaciais (MPTO)",
      title: "O mesmo rigor termodinâmico da rede elétrica brasileira na Lua e em Marte.",
      body: "Feeds abertos da NASA (DSN Now, OSDR OSD-615 em plantas e CelesTrak) integram-se à orquestração de 4 camadas: radiador T^4, regolito sinterizado (~50x k), albedo IR lunar (+10-15%), biomassa SoC_bio e despacho de rovers.",
      highlights: [
        { label: "Feeds Abertos Reais", value: "NASA DSN (Goldstone/Madrid/Canberra), OSDR OSD-615 SoC_bio e CelesTrak." },
        { label: "Calor T^4 & Regolito", value: "Curtailment térmico antes do radiador saturar + risco P10-P95 de Cp." },
        { label: "Despacho Antecipado", value: "Partida de rovers, Stirling e gaseificador ISRU 30–60 min antes da rampa." },
      ],
      cta: { label: "Abrir Análogo Espacial (MPTO)", route: "/cockpit?tab=space" },
    },
  },
];

// Export STORY keeping top-level English fields for build_deck.mjs compatibility
// plus full `en` and `pt` objects for bilingual StoryPage rendering.
export const STORY = SLIDE_DEFS.map((slide) => ({
  ...slide,
  ...slide.en,
}));

export function localizeSlide(slide, lang = "en") {
  const l = lang === "pt" ? "pt" : "en";
  return {
    ...slide,
    ...(slide[l] || slide.en),
  };
}

export function interpolatePoints(a, b, t) {
  const clamped = Math.max(0, Math.min(1, t));
  return a.map(([x1, y1], idx) => {
    const [x2, y2] = b[idx];
    return [x1 + (x2 - x1) * clamped, y1 + (y2 - y1) * clamped];
  });
}

// Converts 8 [x, y] points into a smooth SVG cubic Bezier path (Catmull-Rom spline).
export function smoothCurvePath(pts) {
  if (!pts.length) return "";
  if (pts.length === 1) return `M${pts[0][0]},${pts[0][1]}`;
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i += 1) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1].toFixed(1)}`;
  }
  return d;
}
