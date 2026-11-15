import React, { useMemo, useState } from "react";
import { MISSION_DEFS } from "../missions/missionParams";

export default function LiveMissionChart({ snapshot, lang = "en", hudMode = false }) {
  const l = lang === "pt" ? "pt" : "en";
  const [collapsed, setCollapsed] = useState(false);
  const missionId = snapshot?.missionId || "M2";
  const depth = snapshot?.depth || "explorer";
  const visibleSeries = snapshot?.visibleSeries || [];
  const timeline = snapshot?.timeline || [];
  const actionLog = snapshot?.actionLog || [];
  const telemetry = snapshot?.telemetry || {};
  const progress = snapshot?.progress || {};

  const def = MISSION_DEFS[missionId] || MISSION_DEFS.M2;
  const width = 620;
  const height = hudMode ? 168 : 225;
  const pad = { top: 20, right: missionId === "M3" && depth === "specialist" ? 42 : 24, bottom: 32, left: 52 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { minY, maxY, m3TauMax } = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    let tauHi = 2.8;
    for (const pt of timeline) {
      const vals = [pt.primaryVal, pt.threshold, pt.uncertaintyLo, pt.uncertaintyHi];
      if (depth === "specialist" && missionId !== "M3" && pt.secondaryVal !== undefined) vals.push(pt.secondaryVal);
      if (missionId === "M4" && pt.clrSkyVal !== undefined) vals.push(pt.clrSkyVal);
      if (missionId === "M3" && typeof pt.secondaryVal === "number" && pt.secondaryVal > tauHi) {
        tauHi = pt.secondaryVal;
      }
      for (const v of vals) {
        if (typeof v === "number" && Number.isFinite(v)) {
          if (v < lo) lo = v;
          if (v > hi) hi = v;
        }
      }
    }
    if (!Number.isFinite(lo)) return { minY: 0, maxY: 100, m3TauMax: 3.2 };
    const span = hi - lo || 1;
    return {
      minY: lo - span * 0.08,
      maxY: hi + span * 0.1,
      m3TauMax: Math.ceil(tauHi * 10) / 10,
    };
  }, [timeline, depth, missionId]);

  const totalN = Math.max(2, timeline.length);
  const xPos = (idx) => pad.left + (idx / (totalN - 1)) * plotW;
  const yPos = (v) => pad.top + ((maxY - v) / Math.max(1e-9, maxY - minY)) * plotH;
  const yPosM3Tau = (tauVal) => pad.top + ((m3TauMax - tauVal) / Math.max(0.5, m3TauMax)) * plotH;

  const bandPolygon = useMemo(() => {
    if (depth === "explorer" || visibleSeries.length < 2) return "";
    const topPts = visibleSeries.map((pt) => `${xPos(pt.t).toFixed(1)},${yPos(pt.uncertaintyHi).toFixed(1)}`);
    const botPts = [...visibleSeries]
      .reverse()
      .map((pt) => `${xPos(pt.t).toFixed(1)},${yPos(pt.uncertaintyLo).toFixed(1)}`);
    return [...topPts, ...botPts].join(" ");
  }, [depth, visibleSeries, minY, maxY, totalN]);

  if (!snapshot) return null;

  const primaryPath = visibleSeries
    .map((pt, i) => `${i === 0 ? "M" : "L"}${xPos(pt.t).toFixed(1)},${yPos(pt.primaryVal).toFixed(1)}`)
    .join(" ");

  const secondaryPath =
    depth === "specialist" || missionId === "M1" || missionId === "M5" || (missionId === "M4" && progress.sampledDecades?.length >= 2)
      ? visibleSeries
          .map((pt, i) => {
            const yVal =
              missionId === "M3"
                ? yPosM3Tau(pt.secondaryVal ?? pt.tau ?? 0.5)
                : yPos(pt.secondaryVal ?? pt.primaryVal);
            return `${i === 0 ? "M" : "L"}${xPos(pt.t).toFixed(1)},${yVal.toFixed(1)}`;
          })
          .join(" ")
      : "";

  const m4DeseasonPath =
    missionId === "M4" && telemetry.revealedSeasonalMk
      ? visibleSeries
          .map((pt, i) => `${i === 0 ? "M" : "L"}${xPos(pt.t).toFixed(1)},${yPos(pt.deseasonalizedTrend).toFixed(1)}`)
          .join(" ")
      : "";

  const m4ClrPath =
    missionId === "M4" && (depth === "specialist" || progress.sampledDecades?.length >= 2)
      ? visibleSeries
          .map((pt, i) => `${i === 0 ? "M" : "L"}${xPos(pt.t).toFixed(1)},${yPos(pt.clrSkyVal).toFixed(1)}`)
          .join(" ")
      : "";

  const thresholdVal = timeline[0]?.threshold;
  const currentPt = visibleSeries[visibleSeries.length - 1];
  const cyclePhase =
    visibleSeries.length <= 5
      ? { id: "A", label: l === "pt" ? "Fase A · Base" : "Phase A · Base", cls: "info" }
      : snapshot.alert?.requiredAction || telemetry.sentinelPending
      ? { id: "C", label: l === "pt" ? "Fase C · Gatilho" : "Phase C · Trigger", cls: "bad" }
      : actionLog.length > 0
      ? { id: "D", label: l === "pt" ? "Fase D · Estável" : "Phase D · Stable", cls: "sig" }
      : { id: "B", label: l === "pt" ? "Fase B · Subindo" : "Phase B · Rising", cls: "null" };

  return (
    <div className={hudMode ? "hud-chart-dock" : "card"} style={hudMode ? undefined : { padding: "1rem 1.15rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.35rem", marginBottom: collapsed ? 0 : "0.35rem" }}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.35rem" }}>
          <span className="badge sig" style={{ fontSize: "0.66rem", padding: "0.1rem 0.42rem" }}>
            {l === "pt" ? "MPTO AO VIVO" : "LIVE MPTO"}
          </span>
          <span className={`badge ${cyclePhase.cls}`} style={{ fontSize: "0.66rem", padding: "0.1rem 0.42rem" }}>
            {cyclePhase.label}
          </span>
          <span className="mono" style={{ fontSize: "0.7rem", color: hudMode ? "var(--cockpit-soft)" : "var(--ink-soft)" }}>
            {def.primaryUnit} · {depth.toUpperCase()}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          {currentPt && (
            <div
              className="mono"
              style={{
                fontSize: "0.78rem",
                fontWeight: 700,
                color: telemetry.sentinelPending
                  ? "var(--hud-red)"
                  : hudMode
                  ? "var(--hud-cyan)"
                  : "var(--ink)",
              }}
            >
              {currentPt.label}:{" "}
              {telemetry.sentinelPending
                ? "999999999.0 (!)"
                : `${currentPt.primaryVal} ${def.primaryUnit}`}
            </div>
          )}
          {hudMode && (
            <button
              type="button"
              className="hud-cam-btn"
              style={{ padding: "0.12rem 0.42rem", fontSize: "0.66rem" }}
              onClick={() => setCollapsed((c) => !c)}
              title={l === "pt" ? "Minimizar/Expandir gráfico" : "Minimize/Expand chart"}
            >
              {collapsed ? "+" : "−"}
            </button>
          )}
        </div>
      </div>

      {!collapsed && (
        <>
          <svg viewBox={`0 0 ${width} ${height}`} className="live-chart-svg" role="img" aria-label="Live Telemetry Chart">
        {/* Horizontal grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const val = minY + (maxY - minY) * frac;
          const y = yPos(val);
          return (
            <g key={frac}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} className="chart-grid" />
              <text x={pad.left - 8} y={y + 4} textAnchor="end" className="chart-label">
                {Math.abs(val) < 10 ? val.toFixed(1) : Math.round(val)}
              </text>
            </g>
          );
        })}

        {/* Axes */}
        <line x1={pad.left} y1={pad.top} x2={pad.left} y2={height - pad.bottom} className="chart-axis" />
        <line x1={pad.left} y1={height - pad.bottom} x2={width - pad.right} y2={height - pad.bottom} className="chart-axis" />

        {/* Uncertainty / P90 band (Analyst & Specialist) */}
        {bandPolygon && <polygon points={bandPolygon} className="chart-unc-band" />}

        {/* Threshold line */}
        {typeof thresholdVal === "number" && (
          <g>
            <line
              x1={pad.left}
              y1={yPos(thresholdVal)}
              x2={width - pad.right}
              y2={yPos(thresholdVal)}
              className="chart-thresh"
            />
            <text x={width - pad.right - 4} y={yPos(thresholdVal) - 5} textAnchor="end" className="chart-label-danger">
              {l === "pt" ? `Limiar ${thresholdVal}` : `Threshold ${thresholdVal}`}
            </text>
          </g>
        )}

        {/* Secondary curve (Demand / tau / Cloud % / DONKI) */}
        {missionId === "M2" && depth === "specialist" && (
          <g>
            <line
              x1={pad.left}
              y1={yPos(1.97)}
              x2={width - pad.right}
              y2={yPos(1.97)}
              className="chart-null-baseline"
            />
            <text x={pad.left + 6} y={yPos(1.97) - 5} className="chart-label">
              {l === "pt" ? "WS2M mensal 1,97 m/s (p=0,489 nulo)" : "Monthly WS2M 1.97 m/s (p=0.489 null)"}
            </text>
          </g>
        )}
        {missionId === "M3" && depth === "specialist" && [0, m3TauMax / 2, m3TauMax].map((tv) => (
          <text key={`tau-${tv}`} x={width - 4} y={yPosM3Tau(tv) + 4} textAnchor="end" className="chart-label" style={{ fill: "var(--biome-ne)" }}>
            τ{tv.toFixed(1)}
          </text>
        ))}
        {secondaryPath && <path d={secondaryPath} className="chart-secondary" />}
        {m4ClrPath && <path d={m4ClrPath} className="chart-oracle-pin" />}
        {m4DeseasonPath && <path d={m4DeseasonPath} className="chart-oracle-pin" />}

        {/* Primary rising curve */}
        {primaryPath && <path d={primaryPath} className="chart-primary" />}

        {/* Sentinel 999999999.0 glitch vertical spikes */}
        {visibleSeries
          .filter((pt) => pt.sentinel)
          .map((pt) => {
            const sx = xPos(pt.t);
            const sy = yPos(pt.primaryVal);
            const alignRight = sx > width - 110;
            return (
              <g key={`sent-${pt.t}`}>
                <line x1={sx} y1={sy} x2={sx} y2={pad.top + 6} className="chart-sentinel-spike" />
                <circle cx={sx} cy={pad.top + 6} r="4.5" fill="var(--danger)" />
                <text
                  x={alignRight ? sx - 6 : sx + 6}
                  y={pad.top + 11}
                  textAnchor={alignRight ? "end" : "start"}
                  className="chart-label-danger"
                >
                  999999999.0
                </text>
              </g>
            );
          })}

        {/* Player action vertical pins */}
        {actionLog.map((act, i) => (
          <line
            key={`${act.t}-${i}`}
            x1={xPos(act.t)}
            y1={pad.top}
            x2={xPos(act.t)}
            y2={height - pad.bottom}
            className="chart-player-pin"
          />
        ))}

        {/* Current head dot */}
        {currentPt && (
          <circle
            cx={xPos(currentPt.t)}
            cy={yPos(currentPt.primaryVal)}
            r="4.5"
            fill="var(--biome-n)"
          />
        )}

        {/* Start/Mid/End X labels */}
        <text x={pad.left} y={height - 10} className="chart-label">
          {timeline[0]?.label}
        </text>
        <text x={pad.left + plotW / 2} y={height - 10} textAnchor="middle" className="chart-label">
          {timeline[Math.floor(timeline.length / 2)]?.label}
        </text>
        <text x={width - pad.right} y={height - 10} textAnchor="end" className="chart-label">
          {timeline[timeline.length - 1]?.label}
        </text>
      </svg>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", fontSize: "0.74rem", color: "var(--ink-soft)", marginTop: "0.25rem" }}>
        <span>● {l === "pt" ? "Curva principal" : "Primary series"}</span>
        {secondaryPath && (
          <span style={{ color: "var(--biome-ne)" }}>
            -- {missionId === "M1"
              ? l === "pt"
                ? "Demanda típica (ilustrativa)"
                : "Typical demand (illustrative)"
              : missionId === "M3"
              ? l === "pt"
                ? `τ opac. (eixo dir. 0–${m3TauMax})`
                : `τ opacity (right axis 0–${m3TauMax})`
              : missionId === "M4"
              ? "CLOUD_ATTEN_PCT (p=0.948)"
              : def.secondaryUnit}
          </span>
        )}
        {m4ClrPath && (
          <span style={{ color: "var(--sig)" }}>
            -- CLRSKY (tau=+0.322)
          </span>
        )}
        {depth !== "explorer" && (
          <span style={{ color: hudMode ? "var(--hud-cyan)" : "var(--biome-n)" }}>
            ▓ {l === "pt" ? "Faixa de incerteza" : "Uncertainty band"}
          </span>
        )}
        <span style={{ marginLeft: "auto", opacity: 0.85 }}>{def.sourceCite}</span>
      </div>
        </>
      )}
    </div>
  );
}
