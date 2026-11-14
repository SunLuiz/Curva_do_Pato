import React, { useMemo, useState } from "react";

export default function TrendChart({ series = [], unit = "", accent = "#38bdf8", showMovingAvg = true }) {
  const [hoverIdx, setHoverIdx] = useState(null);

  const width = 920;
  const height = 340;
  const pad = { top: 22, right: 24, bottom: 38, left: 62 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const { minY, maxY, maValues, xTicks, yTicks } = useMemo(() => {
    if (!series.length) {
      return { minY: 0, maxY: 1, maValues: [], xTicks: [], yTicks: [] };
    }
    let lo = Infinity;
    let hi = -Infinity;
    const ma = new Array(series.length).fill(null);

    let rollingSum = 0;
    for (let i = 0; i < series.length; i += 1) {
      const v = series[i].v;
      const s = series[i].sen;
      if (v < lo) lo = v;
      if (v > hi) hi = v;
      if (s !== undefined) {
        if (s < lo) lo = s;
        if (s > hi) hi = s;
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
      const val = minVal + ((maxVal - minVal) * k) / 4;
      yt.push(val);
    }

    const xt = [];
    const step = Math.max(1, Math.floor(series.length / 6));
    for (let i = 0; i < series.length; i += step) {
      xt.push({ idx: i, label: series[i].t.slice(0, 4) });
    }
    if (xt.length && xt[xt.length - 1].idx < series.length - 24) {
      xt.push({ idx: series.length - 1, label: series[series.length - 1].t.slice(0, 4) });
    }

    return { minY: minVal, maxY: maxVal, maValues: ma, xTicks: xt, yTicks: yt };
  }, [series]);

  if (!series.length) {
    return <div className="card">No observations available.</div>;
  }

  const xPos = (i) => pad.left + (i / Math.max(1, series.length - 1)) * plotW;
  const yPos = (val) => pad.top + ((maxY - val) / Math.max(1e-9, maxY - minY)) * plotH;

  const rawPath = series
    .map((pt, i) => `${i === 0 ? "M" : "L"}${xPos(i).toFixed(1)},${yPos(pt.v).toFixed(1)}`)
    .join(" ");

  const maPath = maValues
    .map((val, i) => (val === null ? "" : `${maValues[i - 1] === null ? "M" : "L"}${xPos(i).toFixed(1)},${yPos(val).toFixed(1)}`))
    .filter(Boolean)
    .join(" ");

  const hasSen = series[0].sen !== undefined && series[series.length - 1].sen !== undefined;
  const hovered = hoverIdx !== null ? series[hoverIdx] : null;
  const hoveredMa = hoverIdx !== null ? maValues[hoverIdx] : null;

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * width;
    const norm = Math.min(1, Math.max(0, (relX - pad.left) / plotW));
    const idx = Math.round(norm * (series.length - 1));
    setHoverIdx(idx);
  };

  return (
    <div className="chart-wrap">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {yTicks.map((val, i) => {
          const y = yPos(val);
          return (
            <g key={i}>
              <line x1={pad.left} y1={y} x2={width - pad.right} y2={y} stroke="#1e293b" strokeWidth="1" />
              <text x={pad.left - 10} y={y + 4} textAnchor="end" fill="#94a3b8" fontSize="11" fontFamily="JetBrains Mono, monospace">
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
            fill="#94a3b8"
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
          fill="#64748b"
          fontSize="11"
        >
          {unit}
        </text>

        <path d={rawPath} fill="none" stroke={accent} strokeOpacity="0.45" strokeWidth="1.25" />
        {showMovingAvg && maPath && (
          <path d={maPath} fill="none" stroke="#34d399" strokeWidth="2.1" />
        )}
        {hasSen && (
          <line
            x1={xPos(0)}
            y1={yPos(series[0].sen)}
            x2={xPos(series.length - 1)}
            y2={yPos(series[series.length - 1].sen)}
            stroke="#f43f5e"
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
              stroke="#94a3b8"
              strokeDasharray="3 3"
              strokeWidth="1"
            />
            <circle cx={xPos(hoverIdx)} cy={yPos(hovered.v)} r="4" fill={accent} stroke="#0a0e17" strokeWidth="1.5" />
            {hoveredMa !== null && showMovingAvg && (
              <circle cx={xPos(hoverIdx)} cy={yPos(hoveredMa)} r="4" fill="#34d399" stroke="#0a0e17" strokeWidth="1.5" />
            )}
          </g>
        )}
      </svg>

      {hovered && (
        <div
          className="tooltip-box mono"
          style={{
            top: 12,
            right: 20,
          }}
        >
          <div style={{ color: "#94a3b8", marginBottom: 2 }}>{hovered.t}</div>
          <div style={{ color: accent }}>Monthly: {hovered.v.toFixed(2)} {unit}</div>
          {hoveredMa !== null && showMovingAvg && (
            <div style={{ color: "#34d399" }}>12-mo avg: {hoveredMa.toFixed(2)} {unit}</div>
          )}
          {hovered.sen !== undefined && (
            <div style={{ color: "#fb7185" }}>Sen fit: {hovered.sen.toFixed(2)} {unit}</div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.2rem", marginTop: "0.5rem", fontSize: "0.8rem", color: "#94a3b8" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 2, background: accent, opacity: 0.7 }} /> Monthly NASA POWER
        </span>
        {showMovingAvg && (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 14, height: 2.5, background: "#34d399" }} /> 12-Month Rolling Mean
          </span>
        )}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
          <span style={{ width: 14, height: 2, borderTop: "2px dashed #f43f5e" }} /> Theil-Sen Trend Line
        </span>
      </div>
    </div>
  );
}
