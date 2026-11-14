import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import ChartCard from "../components/ChartCard";
import { computeTrend, fmtP } from "../engine/trend";
import { getTrend } from "../api";

const REGION_ACCENTS = {
  campinas: "var(--biome-se)",
  petrolina: "var(--biome-ne)",
  manaus: "var(--biome-n)",
};

const PRESET_LIST = [
  { id: "campinas", name: "Campinas-SP" },
  { id: "petrolina", name: "Petrolina-PE" },
  { id: "manaus", name: "Manaus-AM" },
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

const MONTHS = [
  { v: 0, label: "All 12 months (Seasonal MK)" },
  { v: 1, label: "Jan" }, { v: 2, label: "Feb" }, { v: 3, label: "Mar" },
  { v: 4, label: "Apr" }, { v: 5, label: "May" }, { v: 6, label: "Jun" },
  { v: 7, label: "Jul" }, { v: 8, label: "Aug" }, { v: 9, label: "Sep" },
  { v: 10, label: "Oct" }, { v: 11, label: "Nov" }, { v: 12, label: "Dec" },
];

export default function TrendPage({
  region,
  setRegion,
  variable = "T2M",
  setVariable,
  onSwitchTab,
}) {
  const [localVar, setLocalVar] = useState(variable);
  const activeVar = setVariable ? variable : localVar;
  const updateVar = setVariable || setLocalVar;

  const [customLat, setCustomLat] = useState("-22.90");
  const [customLon, setCustomLon] = useState("-47.06");
  const [customActive, setCustomActive] = useState(false);
  const [showMovingAvg, setShowMovingAvg] = useState(true);

  const [startYear, setStartYear] = useState(1984);
  const [endYear, setEndYear] = useState(2025);
  const [monthFilter, setMonthFilter] = useState(0);
  const [compareRegion, setCompareRegion] = useState("");

  const [data, setData] = useState(null);
  const [compareData, setCompareData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = customActive
          ? await getTrend({ lat: Number(customLat), lon: Number(customLon), variable: activeVar })
          : await getTrend({ region, variable: activeVar });
        if (!cancelled) setData(res);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to load NASA POWER series");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [region, activeVar, customActive, customLat, customLon]);

  useEffect(() => {
    if (!compareRegion || (!customActive && compareRegion === region)) {
      setCompareData(null);
      return undefined;
    }
    let cancelled = false;
    getTrend({ region: compareRegion, variable: activeVar })
      .then((res) => {
        if (!cancelled) setCompareData(res);
      })
      .catch(() => {
        if (!cancelled) setCompareData(null);
      });
    return () => {
      cancelled = true;
    };
  }, [compareRegion, region, activeVar, customActive]);

  const isFullRange = startYear === 1984 && endYear === 2025 && monthFilter === 0;

  const { viewSeries, viewStats } = useMemo(() => {
    if (!data?.series) return { viewSeries: [], viewStats: null };
    if (isFullRange) {
      return { viewSeries: data.series, viewStats: data.stats };
    }
    const sliced = data.series.filter((pt) => {
      const y = Number(pt.t.slice(0, 4));
      return y >= startYear && y <= endYear;
    });
    const computed = computeTrend(sliced, {
      monthFilter: monthFilter || null,
      minObs: monthFilter ? 10 : 24,
    });
    return { viewSeries: computed.series, viewStats: computed.stats };
  }, [data, startYear, endYear, monthFilter, isFullRange]);

  const filteredCompareSeries = useMemo(() => {
    if (!compareData?.series) return null;
    return compareData.series.filter((pt) => {
      const y = Number(pt.t.slice(0, 4));
      const m = Number(pt.t.slice(5, 7));
      return y >= startYear && y <= endYear && (!monthFilter || m === monthFilter);
    });
  }, [compareData, startYear, endYear, monthFilter]);

  const accent = customActive ? "var(--biome-se)" : REGION_ACCENTS[region] || "var(--biome-se)";
  const stats = viewStats;
  const sig = stats?.significant_5pct;

  return (
    <div>
      <div className="controls-bar">
        <div className="control-group">
          <label>Preset Biome Region</label>
          <div className="pill-tabs">
            {PRESET_LIST.map((r) => (
              <button
                key={r.id}
                type="button"
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

        <div className="control-group" style={{ flex: 1, minWidth: 210 }}>
          <label htmlFor="var-select">Earth System Variable</label>
          <select id="var-select" value={activeVar} onChange={(e) => updateVar(e.target.value)}>
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
              style={{ width: 86 }}
              aria-label="Latitude"
            />
            <input
              type="number"
              step="0.1"
              value={customLon}
              onChange={(e) => setCustomLon(e.target.value)}
              style={{ width: 86 }}
              aria-label="Longitude"
            />
            <button
              type="button"
              className={`pill ${customActive ? "active" : ""}`}
              onClick={() => setCustomActive(true)}
            >
              Query Point
            </button>
          </div>
        </div>
      </div>

      {/* Interactive client-side slice & comparison bar */}
      <div className="controls-bar" style={{ background: "var(--surface-2)" }}>
        <div className="control-group">
          <label htmlFor="start-yr">Window Start ({startYear})</label>
          <input
            id="start-yr"
            type="range"
            min={1984}
            max={Math.min(2022, endYear - 3)}
            value={startYear}
            onChange={(e) => setStartYear(Number(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label htmlFor="end-yr">Window End ({endYear})</label>
          <input
            id="end-yr"
            type="range"
            min={Math.max(1987, startYear + 3)}
            max={2025}
            value={endYear}
            onChange={(e) => setEndYear(Number(e.target.value))}
          />
        </div>

        <div className="control-group">
          <label htmlFor="month-slice">Season / Month Filter</label>
          <select id="month-slice" value={monthFilter} onChange={(e) => setMonthFilter(Number(e.target.value))}>
            {MONTHS.map((m) => (
              <option key={m.v} value={m.v}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="cmp-region">Overlay Region</label>
          <select id="cmp-region" value={compareRegion} onChange={(e) => setCompareRegion(e.target.value)}>
            <option value="">None</option>
            {PRESET_LIST.filter((r) => customActive || r.id !== region).map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        {!isFullRange && (
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: "0.45rem 0.9rem", fontSize: "0.82rem", marginLeft: "auto" }}
            onClick={() => {
              setStartYear(1984);
              setEndYear(2025);
              setMonthFilter(0);
            }}
          >
            <RotateCcw size={14} /> Reset 1984–2025
          </button>
        )}
      </div>

      {loading && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "2rem" }}>
          <Loader2 size={20} className="spin" /> Loading 42-year NASA POWER series &amp; computing Mann-Kendall statistics...
        </div>
      )}

      {error && (
        <div className="card" style={{ borderColor: "var(--danger)", background: "rgba(178,58,42,0.06)", color: "var(--danger)" }}>
          Error: {error}. Custom coordinates require the live FastAPI backend; preset regions work offline via frozen cache.
        </div>
      )}

      {!loading && !error && data && stats && (
        <>
          {stats.status === "ok" && (
            <div className="grid-4" style={{ marginBottom: "1.15rem" }}>
              <div className="card">
                <div className="stat-label">Significance Verdict (alpha = 0.05)</div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginTop: "0.4rem" }}>
                  {sig ? <CheckCircle2 size={20} color="var(--sig)" /> : <AlertTriangle size={20} color="var(--null-ink)" />}
                  <strong style={{ fontSize: "1.02rem", color: sig ? "var(--sig)" : "var(--null-ink)" }}>
                    {sig ? `Significant (${stats.trend})` : "No Significant Trend"}
                  </strong>
                </div>
                <div className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: "0.45rem" }}>
                  tau = {stats.tau > 0 ? `+${stats.tau}` : stats.tau} · p = {fmtP(stats.p_value)}
                </div>
              </div>

              <div className="card">
                <div className="stat-label">Rate of Change (Theil-Sen)</div>
                <div className="stat-value" style={{ color: accent }}>
                  {stats.slope_per_decade > 0 ? `+${stats.slope_per_decade}` : stats.slope_per_decade}
                  <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginLeft: 5 }}>{data.unit}/dec</span>
                </div>
                <div className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
                  95% CI: [{stats.ci_95_per_decade?.[0]}, {stats.ci_95_per_decade?.[1]}]
                </div>
              </div>

              <div className="card">
                <div className="stat-label">Cumulative Shift ({stats.start} → {stats.end})</div>
                <div className="stat-value">
                  {stats.total_change > 0 ? `+${stats.total_change}` : stats.total_change}
                  <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginLeft: 5 }}>{data.unit}</span>
                </div>
                <div className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
                  n = {stats.n} {monthFilter ? "yearly slices" : "monthly steps"}
                </div>
              </div>

              <div className="card">
                <div className="stat-label">Original vs Seasonal MK</div>
                <div className="mono" style={{ fontSize: "0.95rem", fontWeight: 600, marginTop: "0.35rem" }}>
                  Orig tau = {stats.original_tau > 0 ? `+${stats.original_tau}` : stats.original_tau}
                </div>
                <div className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: "0.25rem" }}>
                  Orig p = {fmtP(stats.original_p_value)} ({stats.original_trend})
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--ink-faint)", marginTop: "0.2rem" }}>
                  {isFullRange ? "Server Python cache (pymannkendall)" : "Recomputed live in browser (JS engine)"}
                </div>
              </div>
            </div>
          )}

          <ChartCard
            data={data}
            series={viewSeries}
            stats={stats}
            accent={accent}
            showMovingAvg={showMovingAvg}
            setShowMovingAvg={setShowMovingAvg}
            compareSeries={filteredCompareSeries}
            compareLabel={compareData?.region?.name}
          />

          <div style={{ marginTop: "1rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
            <span className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
              Method: {stats.method}
            </span>
            {onSwitchTab && (
              <button type="button" className="btn-primary" onClick={() => onSwitchTab("attribution")}>
                Inspect 4 Physical Attribution Vectors <ArrowRight size={16} />
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
