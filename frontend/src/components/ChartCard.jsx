import React, { useState } from "react";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import TrendChart from "./TrendChart";
import RawTable from "./RawTable";
import SourcePanel from "./SourcePanel";
import { humanVerdict } from "../engine/trend";

export default function ChartCard({
  data,
  series,
  stats,
  accent,
  showMovingAvg,
  setShowMovingAvg,
  compareSeries,
  compareLabel,
}) {
  const [view, setView] = useState("chart");
  const verdict = humanVerdict(stats, data.region.name, data.label, data.unit);

  return (
    <div className="card">
      <div
        className="card-inset"
        style={{
          marginBottom: "1rem",
          borderColor: verdict.tone === "sig" ? "rgba(42, 112, 71, 0.35)" : "rgba(115, 100, 70, 0.35)",
          background: verdict.tone === "sig" ? "rgba(42, 112, 71, 0.06)" : "rgba(184, 168, 138, 0.14)",
          display: "flex",
          gap: "0.75rem",
          alignItems: "flex-start",
        }}
      >
        {verdict.tone === "sig" ? (
          <CheckCircle2 size={20} color="var(--sig)" style={{ flexShrink: 0, marginTop: 2 }} />
        ) : (
          <AlertTriangle size={20} color="var(--null-ink)" style={{ flexShrink: 0, marginTop: 2 }} />
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--ink)" }}>{verdict.headline}</div>
          <div style={{ fontSize: "0.86rem", color: "var(--ink-soft)", marginTop: "0.15rem" }}>{verdict.detail}</div>
        </div>
      </div>

      <div className="section-header" style={{ marginBottom: "0.85rem" }}>
        <div>
          <h3 style={{ fontSize: "1.12rem", fontFamily: "var(--font-display)" }}>
            {data.region.name} — {data.label} ({data.unit})
          </h3>
          <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
            {data.region.biome} · Lat {data.region.lat}, Lon {data.region.lon} ·{" "}
            <a href={data.source_url} target="_blank" rel="noreferrer">
              {data.source}
            </a>
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", alignItems: "center" }}>
          <div className="pill-tabs" role="tablist" aria-label="Chart inspection views">
            <button
              type="button"
              role="tab"
              aria-selected={view === "chart"}
              className={`pill ${view === "chart" ? "active" : ""}`}
              onClick={() => setView("chart")}
            >
              Chart
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "raw"}
              className={`pill ${view === "raw" ? "active" : ""}`}
              onClick={() => setView("raw")}
            >
              Raw data ({series.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "source"}
              className={`pill ${view === "source" ? "active" : ""}`}
              onClick={() => setView("source")}
            >
              Source
            </button>
          </div>

          {view === "chart" && (
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                fontSize: "0.82rem",
                color: "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={showMovingAvg}
                onChange={(e) => setShowMovingAvg(e.target.checked)}
              />
              12-Mo Avg
            </label>
          )}
        </div>
      </div>

      {view === "chart" && (
        <TrendChart
          series={series}
          unit={data.unit}
          accent={accent}
          showMovingAvg={showMovingAvg}
          compareSeries={compareSeries}
          compareLabel={compareLabel}
        />
      )}

      {view === "raw" && <RawTable data={data} series={series} unit={data.unit} />}

      {view === "source" && <SourcePanel data={data} stats={stats} />}
    </div>
  );
}
