import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Maximize2, Minimize2, Pause, Play, Sparkles } from "lucide-react";
import { STORY, interpolatePoints, localizeSlide, smoothCurvePath } from "../content/story";

function ConceptualNoiseToggle({ lang = "en" }) {
  const l = lang === "pt" ? "pt" : "en";
  const [deseasonalized, setDeseasonalized] = useState(false);

  const seasonalPts = [
    [20, 95], [48, 35], [76, 98], [104, 34], [132, 92], [160, 28],
    [188, 86], [216, 24], [244, 80], [272, 18], [300, 74], [328, 14],
  ];
  const driftPts = [
    [20, 82], [48, 77], [76, 73], [104, 67], [132, 62], [160, 56],
    [188, 52], [216, 46], [244, 41], [272, 35], [300, 29], [328, 22],
  ];

  const activePts = deseasonalized ? driftPts : seasonalPts;
  const poly = activePts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");

  return (
    <div className="card" style={{ marginTop: "1.15rem", maxWidth: 460 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginBottom: "0.65rem" }}>
        <span className="stat-label">
          {l === "pt" ? "Lente Conceitual · Olhos vs. Matemática" : "Conceptual Lens · Eyes vs. Math"}
        </span>
        <button
          type="button"
          className={`pill ${deseasonalized ? "active" : ""}`}
          onClick={() => setDeseasonalized((v) => !v)}
        >
          {deseasonalized
            ? l === "pt"
              ? "Mostrando: Sinal Dessazonalizado"
              : "Showing: Deseasonalized Signal"
            : l === "pt"
              ? "Remover Ciclo Sazonal"
              : "Strip Seasonal Cycle"}
        </button>
      </div>
      <svg viewBox="0 0 350 115" style={{ width: "100%", height: "auto", display: "block" }}>
        <line x1="16" y1="95" x2="334" y2="95" stroke="var(--hairline-strong)" strokeWidth="1" />
        <path
          d={poly}
          fill="none"
          stroke={deseasonalized ? "var(--biome-se)" : "var(--null-ink)"}
          strokeWidth="2.4"
        />
        {deseasonalized && (
          <line x1="20" y1="82" x2="328" y2="22" stroke="var(--danger)" strokeWidth="2" strokeDasharray="5 4" />
        )}
      </svg>
      <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: "0.45rem" }}>
        {deseasonalized
          ? l === "pt"
            ? "Quando os altos e baixos de inverno/verão saem, a tendência de longo prazo fica evidente."
            : "Once winter-to-summer swings are removed, the underlying multi-decade shift stands out clearly."
          : l === "pt"
            ? "Dados mensais brutos oscilam todo ano, escondendo se a base está realmente mudando."
            : "Raw monthly data bounces up and down every year, disguising whether the baseline is moving."}
      </div>
    </div>
  );
}

export default function StoryPage({ onNavigate, lang = "en" }) {
  const l = lang === "pt" ? "pt" : "en";
  const [index, setIndex] = useState(0);
  const [present, setPresent] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [hoverPaused, setHoverPaused] = useState(false);

  const reduceMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const slides = useMemo(
    () => STORY.map((s) => localizeSlide(s, l)),
    [l]
  );

  const safeIdx = Math.min(index, Math.max(0, slides.length - 1));
  const current = slides[safeIdx];

  const [animPts, setAnimPts] = useState(current.curvePoints);
  const animPtsRef = useRef(current.curvePoints);
  const touchStartX = useRef(null);

  const go = useCallback(
    (nextIdx) => {
      setIndex(() => {
        const len = slides.length;
        return ((nextIdx % len) + len) % len;
      });
    },
    [slides.length]
  );

  const togglePresent = useCallback(() => {
    setPresent((prev) => {
      const next = !prev;
      if (next) setPlaying(false);
      return next;
    });
  }, []);

  // Sync body[data-present] for hiding nav/footer in presentation mode
  useEffect(() => {
    if (present) {
      document.body.dataset.present = "1";
    } else {
      delete document.body.dataset.present;
    }
    return () => {
      delete document.body.dataset.present;
    };
  }, [present]);

  // Smoothly interpolate the 8-point background curve across slides (400 ms)
  useEffect(() => {
    const target = current.curvePoints;
    if (reduceMotion) {
      animPtsRef.current = target;
      setAnimPts(target);
      return undefined;
    }
    const startPts = animPtsRef.current;
    const duration = 400;
    const t0 = performance.now();
    let raf = 0;

    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - p) ** 3;
      const next = interpolatePoints(startPts, target, eased);
      animPtsRef.current = next;
      setAnimPts(next);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [current, reduceMotion]);

  // Opt-in autoplay timer (8 seconds, pauses on hover or reduced motion)
  useEffect(() => {
    if (!playing || hoverPaused || reduceMotion) return undefined;
    const timer = setTimeout(() => go(safeIdx + 1), 8000);
    return () => clearTimeout(timer);
  }, [playing, hoverPaused, reduceMotion, safeIdx, go]);

  // Keyboard shortcuts
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowRight") {
        setPlaying(false);
        go(safeIdx + 1);
      } else if (e.key === "ArrowLeft") {
        setPlaying(false);
        go(safeIdx - 1);
      } else if (e.key === "f" || e.key === "F") {
        togglePresent();
      } else if (e.key === "Escape") {
        setPresent(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [safeIdx, go, togglePresent]);

  const curveD = smoothCurvePath(animPts);
  const strokeVar = `var(${current.tone})`;

  return (
    <section
      className="story-shell"
      style={{ backgroundColor: current.bgTint }}
      aria-label="Cockpit-OMNI Story Presentation"
      onTouchStart={(e) => {
        touchStartX.current = e.touches?.[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const endX = e.changedTouches?.[0]?.clientX ?? touchStartX.current;
        const dx = endX - touchStartX.current;
        touchStartX.current = null;
        if (Math.abs(dx) >= 40) {
          setPlaying(false);
          go(dx < 0 ? safeIdx + 1 : safeIdx - 1);
        }
      }}
    >
      <svg
        className="story-curve"
        viewBox="0 0 1200 600"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path
          d={curveD}
          fill="none"
          stroke={strokeVar}
          strokeWidth="5"
          strokeOpacity="0.16"
        />
        <path
          d={curveD}
          fill="none"
          stroke={strokeVar}
          strokeWidth="2"
          strokeOpacity="0.42"
          strokeDasharray="7 7"
        />
      </svg>

      <div className="story-inner">
        <div className="story-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <span className="badge" style={{ color: strokeVar, borderColor: strokeVar }}>
              {safeIdx + 1} / {slides.length} ·{" "}
              {present
                ? l === "pt"
                  ? "Modo Pitch"
                  : "Pitch Presentation"
                : l === "pt"
                  ? "História em 7 Slides"
                  : "7-Slide Story"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "0.45rem 0.95rem", fontSize: "0.84rem" }}
              onClick={() => setPlaying((p) => !p)}
              disabled={reduceMotion}
              title={reduceMotion ? "Autoplay disabled by reduced-motion preference" : "Toggle 8-second slide advance"}
            >
              {playing ? <Pause size={15} /> : <Play size={15} />}
              {playing
                ? l === "pt"
                  ? "Pausar"
                  : "Pause story"
                : l === "pt"
                  ? "Iniciar"
                  : "Start the story"}
            </button>

            <button
              type="button"
              className={`pill ${present ? "active" : ""}`}
              onClick={togglePresent}
              title="Toggle full-screen pitch mode (hotkey: F)"
            >
              {present ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              {present
                ? l === "pt"
                  ? "Sair (Esc)"
                  : "Exit Present (Esc)"
                : l === "pt"
                  ? "Apresentar (F)"
                  : "Present (F)"}
            </button>
          </div>
        </div>

        <div
          className="story-slide-stage"
          onMouseEnter={() => setHoverPaused(true)}
          onMouseLeave={() => setHoverPaused(false)}
        >
          <div>
            <span className="badge" style={{ color: strokeVar }}>
              <Sparkles size={13} /> {current.kicker}
            </span>
            <h1 className="story-title">{current.title}</h1>
            {current.body && <p className="story-lead">{current.body}</p>}
          </div>

          {current.id === "system" && <ConceptualNoiseToggle lang={l} />}

          {current.highlights && current.highlights.length > 0 && (
            <div
              className={current.highlights.length === 4 ? "grid-4" : "grid-3"}
              style={{ marginTop: "1.6rem" }}
            >
              {current.highlights.map((h) => (
                <div key={h.label} className="card" style={{ background: "rgba(255,255,255,0.9)" }}>
                  <div className="stat-label" style={{ color: strokeVar }}>
                    {h.label}
                  </div>
                  <div style={{ marginTop: "0.35rem", fontWeight: 600, fontSize: "0.95rem", color: "var(--ink)" }}>
                    {h.value}
                  </div>
                </div>
              ))}
            </div>
          )}

          {(current.cta || current.id === "cover") && (
            <div style={{ marginTop: "1.65rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
              {current.cta ? (
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setPresent(false);
                    onNavigate(current.cta.route);
                  }}
                >
                  {current.cta.label} <ArrowRight size={16} />
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => {
                      setPresent(false);
                      onNavigate("/cockpit");
                    }}
                  >
                    {l === "pt" ? "Abrir Cockpit & Presets" : "Explore Presets & Cockpit"} <ArrowRight size={15} />
                  </button>
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => {
                      setPresent(false);
                      onNavigate("/game");
                    }}
                  >
                    {l === "pt" ? "Jogar Missões 3D & Academy" : "Play 3D Rover & Academy"}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className="story-controls">
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: "0.5rem 1rem" }}
            onClick={() => {
              setPlaying(false);
              go(safeIdx - 1);
            }}
            aria-label="Previous slide"
          >
            <ArrowLeft size={16} /> {l === "pt" ? "Anterior" : "Previous"}
          </button>

          <div className="story-dots" role="tablist" aria-label="Story slide selector">
            {slides.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                className="story-dot"
                aria-label={`Slide ${idx + 1}: ${s.kicker}`}
                aria-current={idx === safeIdx ? "step" : undefined}
                onClick={() => {
                  setPlaying(false);
                  setIndex(idx);
                }}
              />
            ))}
          </div>

          <button
            type="button"
            className="btn-secondary"
            style={{ padding: "0.5rem 1rem" }}
            onClick={() => {
              setPlaying(false);
              go(safeIdx + 1);
            }}
            aria-label="Next slide"
          >
            {l === "pt" ? "Próximo" : "Next"} <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </section>
  );
}
