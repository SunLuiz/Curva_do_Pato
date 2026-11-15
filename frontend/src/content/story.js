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
      kicker: "1 / 7 · NASA Space Apps Challenge 2026 · Team Curva do Pato",
      title: "Challenge #2: Be An Earth System Trend Detective!",
      body: "Why do shifting rainfall, wildfire smoke, and midday solar drops feel like noisy guesswork? Across 42 years of open NASA telemetry (1984–2025), Cockpit-OMNI isolates real multi-decade drift from seasonal swings—and proves how one optical-thermal physics law protects energy grids from Brazil to Mars.",
      highlights: [
        { label: "The Challenge", value: "Challenge #2 — Be An Earth System Trend Detective! (Earth · Advanced)" },
        { label: "Observable Proof", value: "504 monthly NASA POWER records × Seasonal Mann-Kendall & Theil-Sen." },
        { label: "Zero-Key Access", value: "Campinas, SP · 100% Open Engine · Story, Academy, Cockpit & 3D Rover." },
      ],
    },
    pt: {
      kicker: "1 / 7 · NASA Space Apps Challenge 2026 · Equipe Curva do Pato",
      title: "Desafio #2: Be An Earth System Trend Detective!",
      body: "Por que secas, fumaça de queimadas e quedas solares parecem ruído caótico antes de separarmos as estações? Em 42 anos de telemetria aberta da NASA (1984–2025), o Cockpit-OMNI separa a tendência real do ciclo sazonal — e mostra como a mesma física protege redes elétricas do Brasil até Marte.",
      highlights: [
        { label: "O Desafio", value: "Desafio #2 — Be An Earth System Trend Detective! (Terra · Avançado)" },
        { label: "Prova Auditável", value: "504 meses NASA POWER × Mann-Kendall Sazonal & Theil-Sen em 3 biomas." },
        { label: "Acesso Aberto", value: "Campinas-SP · Motor 100% sem chaves · Story, Academy, Cockpit e Rover 3D." },
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
        { label: "Open Natural-Language Q&A", value: "100% zero-key Ask OMNI engine queries cache + open NASA CORS APIs directly." },
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
        { label: "Q&A Aberto sem Chaves", value: "Ask OMNI 100% aberto em linguagem natural consulta cache e APIs CORS da NASA." },
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
      kicker: "7 / 7 · Unified Physics & 7-Agent Orchestration",
      title: "From Cerrado smoke to Mars dust: the same equation preventing blackouts.",
      body: "Wildfire smoke in Brazil (NASA FIRMS) and dust storms in Jezero Crater (NASA MEDA) obey the exact same Beer-Lambert attenuation, shift Mann-Kendall trends, and drive the Solar Duck Curve. Seven physical agents — Hebe, Gemini Vision, Grok Cratera, Sol Invicta, Bios Guardian, Storm Watcher & Prudence — fuse VCE FPGA telemetry under a non-LLM Statistical Auditor so OMNI dispatches batteries 30–60 min before collapse.",
      highlights: [
        { label: "One Hidden Physical Link", value: "Earth smoke (FIRMS) = Mars dust (MEDA) = exp(-0.55 tau) grid physics." },
        { label: "7 Agents + Auditor", value: "Optical · T^4 · Regolith · SoC_bio · Geotech · Space Weather · P95 + Non-LLM Veto." },
        { label: "Rover Compute Fidelity", value: "RAD750 + VCE Virtex-5QV FPGA (SAD 1/16 px stereo, RANSAC VO & ACE Rocker-Bogie)." },
      ],
      cta: { label: "Explore 7 Agents & MPTO", route: "/cockpit?tab=space" },
    },
    pt: {
      kicker: "7 / 7 · Física Unificada & Orquestração de 7 Agentes",
      title: "Da fumaça do Cerrado à poeira de Marte: a mesma equação evitando apagões.",
      body: "Uma queimada no Brasil (NASA FIRMS) e uma tempestade em Jezero (NASA MEDA) obedecem à mesma atenuação Beer-Lambert, mudam tendências de Mann-Kendall e disparam a Curva do Pato. Sete agentes físicos — Hebe, Gemini Vision, Grok Cratera, Sol Invicta, Bios Guardian, Storm Watcher e Prudence — fundem telemetria VCE FPGA sob veto do Auditor Estatístico para despachar baterias 30–60 min antes do colapso.",
      highlights: [
        { label: "O Elo Físico Único", value: "Fumaça na Terra (FIRMS) = Poeira em Marte (MEDA) = mesma física exp(-0,55 tau)." },
        { label: "7 Agentes + Auditor", value: "Óptica · T^4 · Regolito · SoC_bio · Geotecnia · Clima Espacial · P95 + Veto Não-LLM." },
        { label: "Hardware Real no Rover", value: "RAD750 + VCE FPGA Virtex-5QV (Estéreo SAD 1/16 px, Odometria VO e ACE Rocker-Bogie)." },
      ],
      cta: { label: "Ver 7 Agentes & MPTO", route: "/cockpit?tab=space" },
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
