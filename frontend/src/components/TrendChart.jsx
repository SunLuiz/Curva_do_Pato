import React, { useMemo, useState } from "react";

export default function TrendChart({
  series = [],
  unit = "",
  accent = "var(--biome-se)",
  showMovingAvg = true,
  compareSeries = null,
  compareLabel = "",
  compareAccent = "var(--biome-ne)",
  animateDraw = true,
}) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const width = 920;
  const height = 340;
  const pad = { top: 22, right: 24, bottom: 38, left: 62 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { minY, maxY, maValues, cmpMap, xTicks, yTicks } = useMemo(() => {
    if (!series.length) {
      return { minY: 0, maxY: 1, maValues: [], cmpMap: new Map(), xTicks: [], yTicks: [] };
    }
    const cMap = new Map();
    if (Array.isArray(compareSeries)) {
      for (const p of compareSeries) {
        cMap.set(p.t, p.v);
      }
    }

    let lo = Infinity;
    let hi = -Infinity;
    const ma = new Array(series.length).fill(null);

    let rollingSum = 0;
    for (let i = 0; i < series.length; i += 1) {
      const v = series[i].v;
      const s = series[i].sen;
      const cv = cMap.get(series[i].t);
      if (v < lo) lo = v;
      if (v > hi) hi = v;
      if (s !== undefined) {
        if (s < lo) lo = s;
        if (s > hi) hi = s;
      }
      if (cv !== undefined) {
        if (cv < lo) lo = cv;
        if (cv > hi) hi = cv;
      }
      rollingSum += v;
      if (i >= 12) rollingSum -= series[i - 12].v;
      if (i >= 11) ma[i] = rollingSum / 12;
    }

    const span = hi - lo || 1;
    const minVal = lo - span * 0.08;
    const maxVal = hi + span * 0.08;

    const yt = [];
    for (let k = 0; k <= 4; k += 1) {
      yt.push(minVal + ((maxVal - minVal) * k) / 4);
    }

    const xt = [];
    const step = Math.max(1, Math.floor(series.length / 6));
    for (let i = 0; i < series.length; i += step) {
      xt.push({ idx: i, label: series[i].t.slice(0, 4) });
    }
    if (xt.length && xt[xt.length - 1].idx < series.length - 12) {
      xt.push({ idx: series.length - 1, label: series[series.length - 1].t.slice(0, 4) });
    }

    return { minY: minVal, maxY: maxVal, maValues: ma, cmpMap: cMap, xTicks: xt, yTicks: yt };
  }, [series, compareSeries]);

  if (!series.length) {
    return <div className="card">No observations available.</div>;
  }

  const xPos = (i) => pad.left + (i / Math.max(1, series.length - 1)) * plotW;
  const yPos = (val) => pad.top + ((maxY - val) / Math.max(1e-9, maxY - minY)) * plotH;

  const rawPath = series
    .map((pt, i) => `${i === 0 ? "M" : "L"}${xPos(i).toFixed(1)},${yPos(pt.v).toFixed(1)}`)
    .join(" ");

  const maPath = maValues
    .map((val, i) =>
      val === null ? "" : `${maValues[i - 1] === null ? "M" : "L"}${xPos(i).toFixed(1)},${yPos(val).toFixed(1)}`
    )
    .filter(Boolean)
    .join(" ");

  const cmpPath = useMemo(() => {
    if (!compareSeries?.length) return "";
    let started = false;
    const parts = [];
    for (let i = 0; i < series.length; i += 1) {
      const cv = cmpMap.get(series[i].t);
      if (cv === undefined) continue;
      parts.push(`${started ? "L" : "M"}${xPos(i).toFixed(1)},${yPos(cv).toFixed(1)}`);
      started = true;
    }
    return parts.join(" ");
  }, [compareSeries, series, cmpMap, minY, maxY]);

  const hasSen = series[0].sen !== undefined && series[series.length - 1].sen !== undefined;
  const hovered = hoverIdx !== null ? series[hoverIdx] : null;
  const hoveredMa = hoverIdx !== null ? maValues[hoverIdx] : null;
  const hoveredCmp = hovered ? cmpMap.get(hovered.t) : undefined;

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.touches?.[0]?.clientX ?? e.clientX;
    if (clientX === undefined) return;
    const relX = ((clientX - rect.left) / rect.width) * width;
    const norm = Math.min(1, Math.max(0, (relX - pad.left) / plotW));
    const idx = Math.round(norm * (series.length - 1));
    setHoverIdx(idx);
  };

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", display: "block", touchAction: "pan-y" }}
        onMouseMove={handleMouseMove}
        onTouchStart={handleMouseMove}
        onTouchMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
        role="img"
        aria-label={`Monthly time series chart in ${unit}`}
      >
        {yTicks.map((val, i) => {
          const y = yPos(val);
          return (
            <g key={i}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="var(--hairline)" strokeWidth="1" />
              <text
                x={pad.left - 10}
                y={y + 4}
                textAnchor="end"
                fill="var(--ink-soft)"
                fontSize="11"
                fontFamily="JetBrains Mono, monospace"
              >
                {val.toFixed(1)}
              </text>
            </g>
          );
        })}

        {xTicks.map((tk) => (
          <text
            key={tk.idx}
            x={xPos(tk.idx)}
            y={height - 12}
            textAnchor="middle"
            fill="var(--ink-soft)"
            fontSize="11"
            fontFamily="JetBrains Mono, monospace"
          >
            {tk.label}
          </text>
        ))}

        <text
          x={16}
          y={pad.top + plotH / 2}
          transform={`rotate(-90, 16, ${pad.top + plotH / 2})`}
          textAnchor="middle"
          fill="var(--ink-faint)"
          fontSize="11"
        >
          {unit}
        </text>

        <path
          key={`${series[0]?.t}-${series[series.length - 1]?.t}-${series.length}`}
          d={rawPath}
          pathLength={animateDraw ? "1" : undefined}
          className={animateDraw ? "draw-in" : undefined}
          fill="none"
          stroke={accent}
          strokeOpacity="0.42"
          strokeWidth="1.35"
        />

        {cmpPath && (
          <path d={cmpPath} fill="none" stroke={compareAccent} strokeOpacity="0.65" strokeWidth="1.5" />
        )}

        {showMovingAvg && maPath && (
          <path d={maPath} fill="none" stroke="var(--ink)" strokeWidth="2.1" />
        )}

        {hasSen && (
          <line
            x1={xPos(0)}
            y1={yPos(series[0].sen)}
            x2={xPos(series.length - 1)}
            y2={yPos(series[series.length - 1].sen)}
            stroke="var(--danger)"
            strokeWidth="2.2"
            strokeDasharray="6 4"
          />
        )}

        {hoverIdx !== null && hovered && (
          <g>
            <line
              x1={xPos(hoverIdx)}
              y1={pad.top}
              x2={xPos(hoverIdx)}
              y2={pad.top + plotH}
              stroke="var(--ink-soft)"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <circle cx={xPos(hoverIdx)} cy={yPos(hovered.v)} r="4" fill={accent} stroke="var(--surface-1)" strokeWidth="1.5" />
            {hoveredMa !== null && showMovingAvg && (
              <circle cx={xPos(hoverIdx)} cy={yPos(hoveredMa)} r="4" fill="var(--ink)" stroke="var(--surface-1)" strokeWidth="1.5" />
            )}
          </g>
        )}
      </svg>

      {hovered && (
        <div className="tooltip-box mono" style={{ top: 12, right: 20 }}>
          <div style={{ color: "var(--ink-soft)", marginBottom: 2 }}>{hovered.t}</div>
          <div style={{ color: accent, fontWeight: 600 }}>
            Monthly: {hovered.v.toFixed(2)} {unit}
          </div>
          {hoveredCmp !== undefined && (
            <div style={{ color: compareAccent, fontWeight: 600 }}>
              {compareLabel || "Compare"}: {hoveredCmp.toFixed(2)} {unit}
            </div>
          )}
          {hoveredMa !== null && showMovingAvg && (
            <div style={{ color: "var(--ink)" }}>
              12-mo avg: {hoveredMa.toFixed(2)} {unit}
            </div>
          )}
          {hovered.sen !== undefined && (
            <div style={{ color: "var(--danger)" }}>
              Sen fit: {hovered.sen.toFixed(2)} {unit}
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.2rem", marginTop: "0.65rem", fontSize: "0.82rem", color: "var(--ink-soft)" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 2.5, background: accent, opacity: 0.7 }} /> Monthly NASA POWER
        </span>
        {showMovingAvg && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 2.5, background: "var(--ink)" }} /> 12-Month Rolling Mean
          </span>
        )}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 2, borderTop: "2px dashed var(--danger)" }} /> Theil-Sen Trend Line
        </span>
        {cmpPath && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 2.5, background: compareAccent }} /> {compareLabel || "Comparison"}
          </span>
        )}
      </div>
    </div>
  );
}
