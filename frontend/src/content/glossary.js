/**
 * Bilingual hover/click glossary definitions for statistical, radiation,
 * and aerospace terms used across Cockpit-OMNI.
 */

export const GLOSSARY = {
  "theil-sen": {
    en: {
      term: "Theil-Sen Slope",
      short: "Robust median trend rate resistant to extreme outlier years.",
      detail:
        "Computes the median slope across every pair of months spaced by season. Unlike ordinary linear regression, a single El Niño spike cannot distort the multi-decade rate.",
    },
    pt: {
      term: "Inclinação de Theil-Sen",
      short: "Taxa mediana de tendência, imune a anos extremos isolados.",
      detail:
        "Calcula a mediana das inclinações entre pares de meses equivalentes. Diferente da média comum, um único ano de El Niño não distorce o ritmo de 42 anos.",
    },
  },
  "p-value": {
    en: {
      term: "p-value (Significance)",
      short: "Probability that a trend happened by pure seasonal luck.",
      detail:
        "Below 0.05 means <5% chance of random noise: we badge it Significant. Above 0.05 (like wind WS2M p=0.952), we declare a flat Null result instead of inventing a story.",
    },
    pt: {
      term: "p-valor (Significância)",
      short: "Probabilidade de uma tendência ter ocorrido por puro acaso.",
      detail:
        "Abaixo de 0,05 (<5% de chance de ruído), marcamos como Significativo. Acima de 0,05 (como vento WS2M p=0,952), assumimos Nulo honesto sem inventar narrativa.",
    },
  },
  "mann-kendall": {
    en: {
      term: "Seasonal Mann-Kendall",
      short: "Non-parametric rank test comparing Jan-to-Jan, Feb-to-Feb across 42 years.",
      detail:
        "By comparing each calendar month only against the same month in other years (period=12), seasonal wet/dry swings never masquerade as long-term climate change.",
    },
    pt: {
      term: "Mann-Kendall Sazonal",
      short: "Teste não-paramétrico que compara jan com jan, fev com fev em 42 anos.",
      detail:
        "Ao comparar cada mês apenas consigo mesmo ao longo dos anos (período=12), o ciclo natural de verão/inverno nunca se disfarça de mudança climática.",
    },
  },
  "duck-curve": {
    en: {
      term: "Solar Duck Curve",
      short: "Midday solar surplus followed by a steep sunset ramp when demand rises.",
      detail:
        "Inspired by California CAISO and Brazilian distributed generation: abundance at noon can cause curtailment, while late afternoon requires thermal/battery dispatch.",
    },
    pt: {
      term: "Curva do Pato Solar",
      short: "Excesso de energia solar ao meio-dia seguido de rampa brusca ao pôr do sol.",
      detail:
        "Inspirada no operador californiano (CAISO) e no sistema brasileiro: excesso ao meio-dia exige armazenamento/carga elástica para suprir o pico noturno.",
    },
  },
  cmr: {
    en: {
      term: "Earthdata CMR MCP",
      short: "NASA Common Metadata Repository verifying live dataset concept IDs.",
      detail:
        "Auditable catalog provenance confirming exact collection versions for VIIRS fire detections, CERES radiation, MODIS, and future NISAR/ECOSTRESS.",
    },
    pt: {
      term: "Earthdata CMR MCP",
      short: "Catálogo oficial da NASA que audita o ID exato de cada coleção.",
      detail:
        "Garante proveniência rastreável das coleções VIIRS (fogo), CERES (radiação), MODIS e da futura expansão ECOSTRESS/NISAR.",
    },
  },
  tau: {
    en: {
      term: "Martian Optical Depth (Tau, τ)",
      short: "Atmospheric dust opacity shielding solar arrays on Mars.",
      detail:
        "Nominal clear sky is τ ~ 0.4; regional dust storms push τ > 2–5, slashing direct photovoltaic power and turning thermal dissipation into the survival bottleneck.",
    },
    pt: {
      term: "Profundidade Óptica (Tau, τ)",
      short: "Opacidade da poeira marciana que reduz a luz solar nos painéis.",
      detail:
        "Céu claro nominal tem τ ~ 0,4; tempestades de poeira levam τ > 2–5, cortando geração solar e tornando a rejeição térmica o gargalo real.",
    },
  },
  mpto: {
    en: {
      term: "Multi-Physics Thermodynamic Orchestration",
      short: "Co-dispatching electrical, T⁴ radiator, biological (SoC_bio), and rover layers.",
      detail:
        "Treats compute, battery second-life packs, sintered regolith thermal storage, crop photo-respiration, and actuator latency as a single energy-entropy system.",
    },
    pt: {
      term: "Orquestração Multifísica (MPTO)",
      short: "Despacho conjunto das camadas elétrica, térmica (T⁴), biológica e logística.",
      detail:
        "Trata computação, baterias de segunda vida, regolito sinterizado, biomassa em estufa (SoC_bio) e atraso de atuadores num único controlador.",
    },
  },
  soc_bio: {
    en: {
      term: "Biological State of Charge (SoC_bio)",
      short: "Crop biomass & photoperiod buffer absorbing solar surplus without battery wear.",
      detail:
        "Plants cannot shut off immediately when solar panels droop; shifting LED photoperiods inside Earth/Mars greenhouses stores surplus energy as growth while respecting darkness windows.",
    },
    pt: {
      term: "Estado de Carga Biológico (SoC_bio)",
      short: "Reserva fotossintética de estufas usada como carga elástica.",
      detail:
        "Plantas exigem ciclos de luz e escuridão; antecipar ou ajustar LEDs agrícolas absorve excedente do meio-dia preservando a saúde celular (NASA OSDR OSD-615).",
    },
  },
  k_reg: {
    en: {
      term: "Regolith Conductivity (k_reg)",
      short: "Heat transfer jump (~50×) when loose lunar/Mars regolith is laser-sintered.",
      detail:
        "Raw planetary dust is an extreme thermal insulator (k ≈ 0.02 W/m·K). Microwave/solar sintering fuses grains into dense thermal batteries (k ≈ 1.0 W/m·K).",
    },
    pt: {
      term: "Condutividade do Regolito (k_reg)",
      short: "Salto térmico (~50×) obtido ao sinterizar poeira lunar ou marciana.",
      detail:
        "Regolito solto é isolante extremo (k ≈ 0,02 W/m·K). Sinterização solar/micro-ondas transforma o solo em bateria térmica de alta condutividade (k ≈ 1,0 W/m·K).",
    },
  },
  cloud_atten: {
    en: {
      term: "Cloud Attenuation (%)",
      short: "Share of incoming clear-sky sunlight blocked by clouds.",
      detail:
        "Computed cleanly as 100 × (1 − ALLSKY / CLRSKY). Distinguishes changes in actual solar panel yield caused by clouds versus smoke/haze aerosols.",
    },
    pt: {
      term: "Atenuação por Nuvens (%)",
      short: "Fração da energia solar de céu claro bloqueada pelas nuvens.",
      detail:
        "Calculada como 100 × (1 − ALLSKY / CLRSKY). Separa o que é sombra de nuvens do escurecimento causado por fumaça e aerossóis.",
    },
  },
};
