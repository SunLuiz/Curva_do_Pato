import React, { useEffect, useState } from "react";
import { CloudRain, Flame, Layers, Loader2, Sun, Database, ExternalLink } from "lucide-react";
import CausalDivergence from "../components/CausalDivergence";
import { getAttribution, getCmrEvidence, getSpaceWeather } from "../api";

const VECTOR_ICONS = {
  hydrometeorological: CloudRain,
  fire_aerosol: Flame,
  heliophysical: Sun,
  geothermal_deformation: Layers,
};

const PRESET_LIST = [
  { id: "campinas", name: "Campinas-SP" },
  { id: "petrolina", name: "Petrolina-PE" },
  { id: "manaus", name: "Manaus-AM" },
];

export default function AttributionPage({ region, setRegion }) {
  const [attr, setAttr] = useState(null);
  const [cmr, setCmr] = useState(null);
  const [sw, setSw] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [a, c, s] = await Promise.all([
          getAttribution({ region }),
          getCmrEvidence().catch(() => null),
          getSpaceWeather().catch(() => null),
        ]);
        if (!cancelled) {
          setAttr(a);
          setCmr(c);
          setSw(s);
        }
      } catch (err) {
        if (!cancelled) {
          setAttr(null);
          setError(err?.message || "Failed to load attribution vectors.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [region]);

  return (
    <div>
      <div className="section-header">
        <div>
          <span className="badge sig">Multi-Vector Attribution · Honest Operational Status</span>
          <h2 style={{ marginTop: "0.45rem" }}>Physical Driver Attribution &amp; Provenance</h2>
        </div>
        <div className="pill-tabs">
          {PRESET_LIST.map((r) => (
            <button
              key={r.id}
              type="button"
              className={`pill ${region === r.id ? "active" : ""}`}
              onClick={() => setRegion(r.id)}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "0.75rem", padding: "2rem" }}>
          <Loader2 size={20} className="spin" /> Aggregating NASA POWER, FIRMS VIIRS NOAA-21, DONKI &amp; Earthdata CMR vectors...
        </div>
      )}

      {!loading && error && (
        <div className="card" style={{ color: "var(--danger)", padding: "1.25rem" }}>
          Unable to load physical attribution data: {error}
        </div>
      )}

      {!loading && !error && attr && (
        <>
          <div className="card" style={{ marginBottom: "1.15rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
            <div>
              <div className="stat-label">Selected Station ({attr.period})</div>
              <strong style={{ fontSize: "1.15rem" }}>{attr.region.name}</strong>
              <span style={{ color: "var(--ink-soft)", marginLeft: 10, fontSize: "0.88rem" }}>
                {attr.region.biome} ({attr.region.lat}, {attr.region.lon})
              </span>
            </div>
            <div className="mono" style={{ fontSize: "0.9rem" }}>
              Headline T2M Slope:{" "}
              <strong style={{ color: "var(--biome-se)" }}>
                +{attr.headline_temperature?.slope_per_decade} °C/decade
              </strong>{" "}
              (p = {attr.headline_temperature?.p_value})
            </div>
          </div>

          <div className="grid-2">
            {attr.vectors.map((vec) => {
              const Icon = VECTOR_ICONS[vec.id] || Layers;
              const badgeClass =
                vec.status === "live" ? "live" : vec.status === "roadmap" ? "roadmap" : "cached";
              return (
                <div key={vec.id} className="card" style={{ display: "flex", flexDirection: "column", gap: "0.7rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem", fontWeight: 600, fontSize: "1.02rem" }}>
                      <Icon size={18} color={vec.status === "roadmap" ? "var(--roadmap)" : "var(--biome-se)"} />
                      {vec.label}
                    </span>
                    <span className={`badge ${badgeClass}`}>{vec.status}</span>
                  </div>

                  <div className="stat-label">{vec.metric}</div>
                  <div className="mono" style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--ink)" }}>
                    {vec.value}
                  </div>
                  <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)" }}>{vec.interpretation}</p>

                  {vec.details && (
                    <div
                      className="card-inset mono"
                      style={{
                        fontSize: "0.76rem",
                        color: "var(--ink)",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0.3rem 0.75rem",
                      }}
                    >
                      {Object.entries(vec.details).map(([k, v]) => (
                        <div key={k} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span style={{ color: "var(--ink-faint)" }}>{k}:</span>{" "}
                          <span>{v === null || v === undefined ? "n/a" : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: "auto", paddingTop: "0.35rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                    <span style={{ color: "var(--ink-faint)" }}>{vec.source}</span>
                    <a href={vec.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      Dataset <ExternalLink size={13} />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <CausalDivergence />

      {cmr && (
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <div className="section-header" style={{ marginBottom: "0.65rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
              <Database size={18} color="var(--sig)" /> Verified via Official NASA Earthdata CMR MCP Server
            </span>
            <span className="mono" style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
              POST {cmr.endpoint} (protocol {cmr.protocol})
            </span>
          </div>
          <div className="grid-4">
            {Object.entries(cmr.queries || {}).map(([key, q]) => (
              <div key={key} className="card-inset">
                <div className="stat-label">{q.keyword}</div>
                <div className="mono" style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--sig)", margin: "0.2rem 0" }}>
                  {q.total_hits} collections
                </div>
                <div className="mono" style={{ fontSize: "0.73rem", color: "var(--ink-soft)" }}>
                  {(q.top_collections || []).slice(0, 2).map((c) => `${c.short_name} (${c.concept_id})`).join(" · ")}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {sw && sw.events && sw.events.length > 0 && (
        <div className="card" style={{ marginTop: "1.25rem" }}>
          <div className="section-header" style={{ marginBottom: "0.5rem" }}>
            <h3 style={{ fontSize: "1.02rem" }}>Recent NASA DONKI Space Weather Notifications ({sw.start_date} → {sw.end_date})</h3>
            <span className="badge live">{sw.count} alerts</span>
          </div>
          <div style={{ display: "grid", gap: "0.5rem" }}>
            {sw.events.slice(0, 5).map((ev) => (
              <div
                key={ev.id}
                className="card-inset"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", fontSize: "0.82rem" }}
              >
                <div>
                  <span className="badge sig" style={{ marginRight: 8 }}>{ev.type}</span>
                  <span className="mono" style={{ color: "var(--ink-soft)" }}>{String(ev.time).slice(0, 16)}</span>
                </div>
                <a href={ev.url} target="_blank" rel="noreferrer" className="mono" style={{ fontSize: "0.78rem" }}>
                  {ev.id} ↗
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
