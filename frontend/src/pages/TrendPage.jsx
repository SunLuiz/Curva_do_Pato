import React, { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
import TrendChart from "../components/TrendChart";
import { getTrend } from "../api";

const REGION_ACCENTS = {
  campinas: "#38bdf8",
  petrolina: "#f59e0b",
  manaus: "#22d3ee",
};

const PRESET_LIST = [
  { id: "campinas", name: "Campinas-SP", coords: "-22.90, -47.06" },
  { id: "petrolina", name: "Petrolina-PE", coords: "-9.39, -40.50" },
  { id: "manaus", name: "Manaus-AM", coords: "-3.10, -60.02" },
];

const VARIABLES = [
  { id: "T2M", label: "2m Temperature (T2M)" },
  { id: "PRECTOTCORR", label: "Precipitation (PRECTOTCORR)" },
  { id: "ALLSKY_SFC_SW_DWN", label: "All-Sky Irradiance" },
  { id: "CLRSKY_SFC_SW_DWN", label: "Clear-Sky Irradiance" },
  { id: "CLOUD_ATTEN_PCT", label: "Cloud Attenuation (%)" },
  { id: "RH2M", label: "Relative Humidity (RH2M)" },
  { id: "WS2M", label: "Wind Speed (WS2M)" },
];

export default function TrendPage({ region, setRegion, onNavigate }) {
  const [variable, setVariable] = useState("T2M");
  const [customLat, setCustomLat] = useState("-22.90");
  const [customLon, setCustomLon] = useState("-47.06");
  const [customActive, setCustomActive] = useState(false);
  const [showMovingAvg, setShowMovingAvg] = useState(true);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = customActive
          ? await getTrend({ lat: Number(customLat), lon: Number(customLon), variable })
          : await getTrend({ region, variable });
        if (!cancelled) {
          setData(res);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Failed to load NASA POWER series");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [region, variable, customActive, customLat, customLon]);

  const accent = customActive ? "#38bdf8" : REGION_ACCENTS[region] || "#38bdf8";
  const stats = data?.stats;
  const sig = stats?.significant_5pct;

  return (
    <div>
      <div className="section-header">
        <div>
          <span className="badge sig">1984–2025 Monthly Audit · NASA POWER</span>
          <h2 style={{ marginTop: "0.45rem" }}>Earth System Trend Detective</h2>
        </div>
        {data && (
          <span className={`badge ${data._transport === "offline_cache" ? "cached" : "live"}`}>
            {data._transport === "offline_cache" ? "Frozen Cache Fallback" : "Live Backend Telemetry"}
          </span>
        )}
      </div>

      <div className="controls-bar">
        <div className="control-group">
          <label>Preset Biome Region</label>
          <div className="pill-tabs">
            {PRESET_LIST.map((r) => (
              <button
                key={r.id}
                className={`pill ${!customActive && region === r.id ? "active" : ""}`}
                onClick={() => {
                  setCustomActive(false);
                  setRegion(r.id);
                }}
              >
                {r.name}
              </button>
            ))}
          </div>
        </div>

        <div className="control-group" style={{ flex: 1, minWidth: 220 }}>
          <label>Earth System Variable</label>
          <select value={variable} onChange={(e) => setVariable(e.target.value)}>
            {VARIABLES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label>Custom Lat / Lon (Live API)</label>
          <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
            <input
              type="number"
              step="0.1"
              value={customLat}
              onChange={(e) => setCustomLat(e.target.value)}
              style={{ width: 88 }}
              aria-label="Latitude"
            />
            <input
              type="number"
              step="0.1"
              value={customLon}
              onChange={(e) => setCustomLon(e.target.value)}
              style={{ width: 88 }}
              aria-label="Longitude"
            />
            <button
              className={`pill ${customActive ? "active" : ""}`}
              onClick={() => setCustomActive(true)}
            >
              Query Point
            </button>
          </div>
        </div>
      </div>

      {loading && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "2rem" }}>
          <Loader2 size={20} className="spin" /> Loading 42-year NASA POWER series &amp; computing Mann-Kendall statistics...
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: "rgba(244,63,94,0.5)", color: "#fda4af" }}>
          Error: {error}. Custom coordinates require the live FastAPI backend; preset regions work offline via frozen cache.
        </div>
      )}

      {!loading && !error && data && stats && (
        <>
          <div className="grid-4" style={{ marginBottom: "1.15rem" }}>
            <div className="card">
              <div className="stat-label">Significance Verdict (α = 0.05)</div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginTop: "0.4rem" }}>
                {sig ? <CheckCircle2 size={20} color="#34d399" /> : <AlertTriangle size={20} color="#fbbf24" />}
                <strong style={{ fontSize: "1.02rem", color: sig ? "#34d399" : "#fbbf24" }}>
                  {sig ? `Significant (${stats.trend})` : "No Significant Trend"}
                </strong>
              </div>
              <div className="mono" style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.45rem" }}>
                Seasonal τ = {stats.tau > 0 ? `+${stats.tau}` : stats.tau} · p = {stats.p_value}
              </div>
            </div>

            <div className="card">
              <div className="stat-label">Rate of Change (Theil-Sen)</div>
              <div className="stat-value" style={{ color: accent }}>
                {stats.slope_per_decade > 0 ? `+${stats.slope_per_decade}` : stats.slope_per_decade}
                <span style={{ fontSize: "0.82rem", color: "#94a3b8", marginLeft: 5 }}>{data.unit}/dec</span>
              </div>
              <div className="mono" style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                95% CI: [{stats.ci_95_per_decade?.[0]}, {stats.ci_95_per_decade?.[1]}]
              </div>
            </div>

            <div className="card">
              <div className="stat-label">Cumulative Shift ({stats.start} → {stats.end})</div>
              <div className="stat-value">
                {stats.total_change > 0 ? `+${stats.total_change}` : stats.total_change}
                <span style={{ fontSize: "0.82rem", color: "#94a3b8", marginLeft: 5 }}>{data.unit}</span>
              </div>
              <div className="mono" style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
                n = {stats.n} monthly steps
              </div>
            </div>

            <div className="card">
              <div className="stat-label">Original vs Seasonal MK</div>
              <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "0.35rem" }}>
                Orig τ = {stats.original_tau > 0 ? `+${stats.original_tau}` : stats.original_tau}
              </div>
              <div className="mono" style={{ fontSize: "0.78rem", color: "#94a3b8", marginTop: "0.25rem" }}>
                Orig p = {stats.original_p_value} ({stats.original_trend})
              </div>
              <div style={{ fontSize: "0.74rem", color: "#64748b", marginTop: "0.2rem" }}>
                Deseasonalization isolates climate drift from summer/winter cycles.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="section-header" style={{ marginBottom: "0.75rem" }}>
              <div>
                <h3 style={{ fontSize: "1.1rem" }}>
                  {data.region.name} — {data.label} ({data.unit})
                </h3>
                <div style={{ fontSize: "0.82rem", color: "#94a3b8" }}>
                  {data.region.biome} · Lat {data.region.lat}, Lon {data.region.lon} ·{" "}
                  <a href={data.source_url} target="_blank" rel="noreferrer">{data.source}</a>
                </div>
              </div>
              <label style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontSize: "0.82rem", color: "#94a3b8", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={showMovingAvg}
                  onChange={(e) => setShowMovingAvg(e.target.checked)}
                />
                12-Month Rolling Mean
              </label>
            </div>

            <TrendChart series={data.series} unit={data.unit} accent={accent} showMovingAvg={showMovingAvg} />
          </div>

          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <span className="mono" style={{ fontSize: "0.78rem", color: "#94a3b8" }}>
              Method: {stats.method}
            </span>
            <button className="btn-primary" onClick={() => onNavigate("/attribution")}>
              Inspect 4 Physical Attribution Vectors <ArrowRight size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
