import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Play, SkipForward, Volume2, VolumeX } from "lucide-react";
import { interpolatePoints, smoothCurvePath } from "../content/story";
import { soundEngine } from "./soundEngine";

const CURVE_MARS = [
  [80, 320],
  [200, 290],
  [320, 240],
  [440, 145],
  [560, 175],
  [680, 260],
  [800, 305],
  [900, 285],
];

const CURVE_MOON = [
  [80, 200],
  [200, 210],
  [320, 340],
  [440, 350],
  [560, 195],
  [680, 180],
  [800, 315],
  [900, 290],
];

const CURVE_EARTH = [
  [80, 315],
  [200, 280],
  [320, 170],
  [440, 105],
  [560, 155],
  [680, 285],
  [800, 215],
  [900, 170],
];

const ACTS = [
  {
    id: "arrival",
    en: {
      kicker: "Act 1 / 5 · Arrival · EDL Vision (64 m)",
      title: "Everything in the universe breathes.",
      body: "Before landing on Mars, computer vision compares frame t-1 to frame t. At 64 meters altitude, retro-rockets kick up regolith plumes that try to blind optical navigation — locking external landmarks saves the lander.",
    },
    pt: {
      kicker: "Ato 1 / 5 · A Chegada · Visão EDL (64 m)",
      title: "Tudo no universo respira.",
      body: "Para pousar vivos em Marte, a visão computacional lê o ambiente frame a frame (t-1 -> t). A 64 metros do solo, o jato dos propulsores levanta poeira que tenta cegar os sensores — travar nos marcos externos garante o pouso.",
    },
  },
  {
    id: "settlement",
    en: {
      kicker: "Act 2 / 5 · The Settlement · 6 Months Later",
      title: "From survival landing to permanent life.",
      body: "A crew and their family walk down the lander ramp toward pressurized domes and OSD-615 biological greenhouses. Six months later, time-series curves are no longer theory — they govern heat, oxygen, and survival.",
    },
    pt: {
      kicker: "Ato 2 / 5 · O Assentamento · 6 Meses Depois",
      title: "Do pouso de emergência à infraestrutura permanente.",
      body: "A tripulação e uma família descem pela rampa rumo aos domos habitacionais e estufas biológicas OSD-615. Seis meses depois, gráficos deixam de ser teoria — passam a proteger calor, oxigênio e vida.",
    },
  },
  {
    id: "command",
    en: {
      kicker: "Act 3 / 5 · Command Center · Multi-Sensor Fusion",
      title: "One sensor alone can drive a rover into a crater.",
      body: "A dust front sweeps Sector 4 while solar power sags. Optical telemetry warns of rising opacity and flags Position Alpha — until terrain geometry spots a steep crater fault blocking that route.",
      dialogue: [
        'Optical Operator: "Gemini Vision detects rising dust delta (|I_t - I_t-1|) in Sector 4. Recall Rover-01 to Position Alpha!"',
        'Terrain Operator: "Negative! Crater geometry audit flags a steep fault at Alpha — recalculating the green safe corridor!"',
      ],
    },
    pt: {
      kicker: "Ato 3 / 5 · Central de Comando · Fusão Sensorial",
      title: "Um único sensor pode jogar o rover dentro de uma cratera.",
      body: "Uma frente de poeira avança pelo Setor 4 enquanto a geração solar cai. O canal óptico pede abrigo imediato na Posição Alpha — até o auditor topográfico detectar uma falha de cratera naquela coordenada.",
      dialogue: [
        'Operador Óptico: "Visão computacional detectando salto de poeira (|I_t - I_t-1|) no Setor 4! Recolher rover para Posição Alpha!"',
        'Operador Topográfico: "Negativo! Auditoria geométrica detectou anomalia na Cratera Alpha — traçando rota verde segura!"',
      ],
    },
  },
  {
    id: "morph",
    en: {
      kicker: "Act 4 / 5 · Unified Physics · Mars -> Moon -> Earth",
      title: "Same math across three worlds via Θ = [g, ρ, Cp, τ].",
      body: "Feed local gravity g and atmospheric density ρ into the physical Duck-Curve engine and the same equations protect Martian dust grids (3.71 m/s²), Lunar lava tubes (1.62 m/s²), and Brazil's power & climate grid (9.81 m/s²).",
    },
    pt: {
      kicker: "Ato 4 / 5 · Física Unificada · Marte -> Lua -> Terra",
      title: "A mesma matemática em três mundos via Θ = [g, ρ, Cp, τ].",
      body: "Ao parametrizar gravidade g e densidade atmosférica ρ no motor da Curva do Pato, as mesmas leis protegem Marte (3,71 m/s²), a Lua (1,62 m/s²) e os biomas brasileiros na Terra (9,81 m/s²).",
    },
  },
  {
    id: "handover",
    en: {
      kicker: "Act 5 / 5 · Command Handover · Rover-01 Ready",
      title: "Commander, assume manual control in 3D.",
      body: "Watch each real-data curve climb in real time, act before critical thresholds using your 5 engineering controls, and compare your timing against the Optimal Oracle and audited NASA datasets.",
    },
    pt: {
      kicker: "Ato 5 / 5 · Transferência de Comando · Rover-01 Pronto",
      title: "Comandante, assuma o controle manual em 3D.",
      body: "Observe cada curva subir ao vivo, execute manobras físicas no terreno 3D com as 5 ações de engenharia e compare seu tempo contra a política ótima e os dados reais da NASA.",
    },
  },
];

export default function NarrativeIntro({ lang = "en", onFinish }) {
  const l = lang === "pt" ? "pt" : "en";
  const [step, setStep] = useState(0);
  const [muted, setMuted] = useState(false);
  const [morphT, setMorphT] = useState(0);
  const [parallax, setParallax] = useState({ x: 0, y: 0 });

  const act = ACTS[step];
  const copy = act[l];

  useEffect(() => {
    soundEngine.setMuted(muted);
  }, [muted]);

  // Continuous Mars -> Moon -> Earth morph animation on Act 4
  useEffect(() => {
    if (act.id !== "morph") return undefined;
    let raf = 0;
    const start = performance.now();
    const tick = (now) => {
      const elapsed = ((now - start) / 4800) % 1;
      setMorphT(elapsed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [act.id]);

  const morphPath = useMemo(() => {
    if (morphT < 0.5) {
      return smoothCurvePath(interpolatePoints(CURVE_MARS, CURVE_MOON, morphT * 2));
    }
    return smoothCurvePath(interpolatePoints(CURVE_MOON, CURVE_EARTH, (morphT - 0.5) * 2));
  }, [morphT]);

  const activeWorldLabel =
    morphT < 0.34
      ? "MARS · g = 3.71 m/s² · ρ = 0.020 kg/m³"
      : morphT < 0.68
      ? "MOON · g = 1.62 m/s² · ρ = 0.000 kg/m³"
      : "EARTH · g = 9.81 m/s² · ρ = 1.225 kg/m³";

  const goTo = (nextIdx) => {
    const clamped = Math.max(0, Math.min(ACTS.length - 1, nextIdx));
    setStep(clamped);
    if (clamped === 0) soundEngine.playThrustPulse();
    else if (clamped === 3) soundEngine.playMorphHum();
    else soundEngine.playActionClick("dock");
  };

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - rect.left) / rect.width - 0.5) * 14;
    const ny = ((e.clientY - rect.top) / rect.height - 0.5) * 8;
    setParallax({ x: nx, y: ny });
  };

  return (
    <section className="intro-stage" aria-label="Mission Narrative Intro">
      <div className="intro-canvas-wrap" onMouseMove={handleMouseMove}>
        <svg viewBox="0 0 960 390" className="intro-svg" role="img" aria-label={copy.title}>
          <rect width="960" height="390" className={act.id === "arrival" || act.id === "settlement" ? "svg-bg-mars" : "svg-bg-dark"} />

          {/* Subtle grid background */}
          {[80, 160, 240, 320].map((y) => (
            <line key={`h-${y}`} x1="0" y1={y} x2="960" y2={y} className="svg-hud-grid" />
          ))}
          {[160, 320, 480, 640, 800].map((x) => (
            <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="390" className="svg-hud-grid" />
          ))}

          {act.id === "arrival" && (
            <g transform={`translate(${parallax.x * 0.6}, ${parallax.y * 0.6})`}>
              {/* Horizon & Martian surface */}
              <path d="M0,265 Q280,220 560,255 T960,240 L960,390 L0,390 Z" className="svg-ground-mars" />
              {/* Helmet iris reflection */}
              <circle cx="235" cy="180" r="108" className="svg-iris-glow" />
              <circle cx="235" cy="180" r="76" className="svg-iris-ring" />
              <circle cx="235" cy="180" r="32" className="svg-iris-ring" />
              {/* Descending lander at 64m + retro plume */}
              <g transform="translate(620, 95)">
                <polygon points="-24,0 24,0 38,34 -38,34" className="svg-dome" />
                <line x1="-28" y1="34" x2="-44" y2="56" strokeWidth="3" className="svg-iris-ring" />
                <line x1="28" y1="34" x2="44" y2="56" strokeWidth="3" className="svg-iris-ring" />
                <polygon points="-14,36 14,36 32,115 -32,115" className="svg-iris-glow" />
                <ellipse cx="0" cy="155" rx="95" ry="20" className="svg-iris-glow" />
              </g>
              <text x="58" y="48" className="svg-text-cyan">EDL TELEMETRY · ALTITUDE 64 m · PLUME ONSET</text>
              <text x="520" y="340" className="svg-text-red">|I_t - I_(t-1)| SPIKE DETECTED -&gt; TRN LOCKED TO EXTERNAL LANDMARKS</text>
            </g>
          )}

          {act.id === "settlement" && (
            <g transform={`translate(${parallax.x * 0.5}, ${parallax.y * 0.5})`}>
              <path d="M0,275 Q340,250 660,275 T960,262 L960,390 L0,390 Z" className="svg-ground-mars" />
              {/* Pressurized domes + OSD-615 greenhouse */}
              <path d="M510,270 A110,95 0 0,1 730,270 Z" className="svg-dome" />
              <path d="M545,270 A75,62 0 0,1 695,270 Z" className="svg-dome-light" />
              <path d="M720,270 A75,65 0 0,1 870,270 Z" className="svg-dome" />
              {/* Lander ramp & human silhouettes */}
              <polygon points="80,220 185,220 265,286 80,286" className="svg-dome" />
              <circle cx="290" cy="252" r="8" className="svg-human" />
              <rect x="284" y="260" width="12" height="26" rx="4" className="svg-human" />
              <circle cx="322" cy="256" r="7" className="svg-human" />
              <rect x="317" y="263" width="10" height="23" rx="4" className="svg-human" />
              <circle cx="348" cy="266" r="5" className="svg-human" />
              <rect x="344" y="271" width="8" height="15" rx="3" className="svg-human" />
              <rect x="310" y="42" width="340" height="44" rx="8" className="svg-dome" />
              <text x="344" y="70" className="svg-text-hud">
                {l === "pt" ? "6 MESES DEPOIS · CRATERA JEZERO" : "6 MONTHS LATER · JEZERO CRATER"}
              </text>
            </g>
          )}

          {act.id === "command" && (
            <g transform={`translate(${parallax.x * 0.4}, ${parallax.y * 0.4})`}>
              {/* Topographic contours */}
              <ellipse cx="470" cy="195" rx="190" ry="110" className="svg-hud-grid" fill="none" />
              <ellipse cx="470" cy="195" rx="120" ry="68" className="svg-hud-grid" fill="none" />
              {/* Hazard Crater Alpha */}
              <circle cx="520" cy="150" r="56" className="svg-iris-glow" />
              <text x="458" y="155" className="svg-text-red">ALPHA CRATER FAULT</text>
              {/* Dust storm front */}
              <path d="M120,70 C240,120 210,270 340,330" className="svg-route-red" />
              <text x="95" y="55" className="svg-text-red">SECTOR 4 DUST FRONT (|I_t - I_t-1|)</text>
              {/* Red rejected route vs Green fused safe route */}
              <path d="M220,275 L515,155" className="svg-route-red" />
              <path d="M220,275 Q370,320 695,245" className="svg-route-green" />
              <circle cx="220" cy="275" r="10" className="svg-dome" />
              <circle cx="695" cy="245" r="14" className="svg-dome-light" />
              <text x="615" y="278" className="svg-text-green">GREEN SAFE VECTOR</text>
              <text x="165" y="306" className="svg-text-cyan">ROVER-01</text>
            </g>
          )}

          {act.id === "morph" && (
            <g>
              <path d={morphPath} className="svg-morph-curve" />
              <path d={smoothCurvePath(CURVE_MARS)} className="svg-morph-sub" />
              <text x="72" y="54" className="svg-text-cyan">{activeWorldLabel}</text>
              <text x="72" y="356" className="svg-text-hud">
                Seasonal Mann-Kendall + Theil-Sen + MPTO Transfer Vector Θ = [g, ρ, Cp, τ]
              </text>
            </g>
          )}

          {act.id === "handover" && (
            <g transform={`translate(${parallax.x * 0.5}, ${parallax.y * 0.5})`}>
              <path d="M0,260 Q320,210 640,255 T960,235 L960,390 L0,390 Z" className="svg-ground-mars" />
              {/* Rover wireframe silhouette */}
              <g transform="translate(480, 215)">
                <rect x="-78" y="-32" width="156" height="44" rx="10" className="svg-dome" />
                <polygon points="-145,-26 -78,-26 -78,-8 -145,-14" className="svg-dome-light" />
                <polygon points="78,-26 145,-14 145,-8 78,-26" className="svg-dome-light" />
                <line x1="0" y1="-32" x2="0" y2="-82" strokeWidth="4" className="svg-iris-ring" />
                <rect x="-18" y="-98" width="36" height="18" rx="4" className="svg-dome" />
                <circle cx="-55" cy="28" r="18" className="svg-dome" />
                <circle cx="0" cy="28" r="18" className="svg-dome" />
                <circle cx="55" cy="28" r="18" className="svg-dome" />
              </g>
              <text x="64" y="54" className="svg-text-green">ROVER-01 SYSTEMS ONLINE · 3D VIEWPORT ARMED</text>
              <text x="64" y="80" className="svg-text-cyan">[WASD / Arrows] Drive · [1] Wings · [2] Mast · [3] Tilt · [4] Sanitize · [5] Dock</text>
            </g>
          )}
        </svg>
      </div>

      <div className="intro-copy">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <span className="intro-kicker">{copy.kicker}</span>
          <div style={{ display: "flex", gap: "0.45rem" }}>
            <button
              type="button"
              className="btn-hud-ghost"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute sound" : "Mute sound"}
            >
              {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              <span>{muted ? (l === "pt" ? "Mudo" : "Muted") : (l === "pt" ? "Áudio Synth" : "Synth Audio")}</span>
            </button>
            <button type="button" className="btn-hud-ghost" onClick={onFinish}>
              <SkipForward size={15} />
              <span>{l === "pt" ? "Pular para 3D" : "Skip to 3D"}</span>
            </button>
          </div>
        </div>

        <h2 className="intro-title">{copy.title}</h2>
        <p className="intro-body">{copy.body}</p>

        {copy.dialogue && (
          <div className="intro-dialogue">
            {copy.dialogue.map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        )}

        <div className="intro-controls">
          <div className="intro-dots" role="tablist" aria-label="Intro acts">
            {ACTS.map((item, idx) => (
              <button
                key={item.id}
                type="button"
                className={`intro-dot ${idx === step ? "active" : ""}`}
                aria-label={`Act ${idx + 1}`}
                onClick={() => goTo(idx)}
              />
            ))}
          </div>

          <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-hud-ghost"
              disabled={step === 0}
              onClick={() => goTo(step - 1)}
            >
              <ChevronLeft size={16} /> {l === "pt" ? "Voltar" : "Back"}
            </button>

            {step < ACTS.length - 1 ? (
              <button type="button" className="btn-hud" onClick={() => goTo(step + 1)}>
                {l === "pt" ? "Avançar" : "Advance"} <ChevronRight size={16} />
              </button>
            ) : (
              <button type="button" className="btn-hud" onClick={onFinish}>
                <Play size={16} /> {l === "pt" ? "Assumir Rover 3D" : "Launch 3D Rover"}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
