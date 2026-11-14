import React, { useEffect, useState } from "react";
import { CloudRain, Flame, Layers, Loader2, Sun, Database, ExternalLink } from "lucide-react";
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

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
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
          <h2 style={{ marginTop: "0.45rem" }}>Physical Driver Attribution &amp; Sources</h2>
        </div>
        <div className="pill-tabs">
          {PRESET_LIST.map((r) => (
            <button
              key={r.id}
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
          <Loader2 size={20} /> Aggregating NASA POWER, FIRMS VIIRS NOAA-21, DONKI &amp; Earthdata CMR vectors...
        </div>
      )}

      {!loading && attr && (
        <>
          <div className="card" style={{ marginBottom: "1.15rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", alignItems: "center" }}>
            <div>
              <div className="stat-label">Selected Station ({attr.period})</div>
              <strong style={{ fontSize: "1.15rem" }}>{attr.region.name}</strong>
              <span style={{ color: "#94a3b8", marginLeft: 10, fontSize: "0.88rem" }}>
                {attr.region.biome} ({attr.region.lat}, {attr.region.lon})
              </span>
            </div>
            <div className="mono" style={{ fontSize: "0.9rem" }}>
              Headline T2M Slope:{" "}
              <strong style={{ color: "#38bdf8" }}>
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
                      <Icon size={18} color={vec.status === "roadmap" ? "#c084fc" : "#38bdf8"} />
                      {vec.label}
                    </span>
                    <span className={`badge ${badgeClass}`}>{vec.status}</span>
                  </div>

                  <div className="stat-label">{vec.metric}</div>
                  <div className="mono" style={{ fontSize: "1.22rem", fontWeight: 700, color: "#f1f5f9" }}>
                    {vec.value}
                  </div>
                  <p style={{ fontSize: "0.87rem", color: "#94a3b8" }}>{vec.interpretation}</p>

                  {vec.details && (
                    <div
                      className="mono"
                      style={{
                        background: "#0a0e17",
                        border: "1px solid #1e293b",
                        borderRadius: 8,
                        padding: "0.65rem 0.75rem",
                        fontSize: "0.76rem",
                        color: "#cbd5e1",
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "0.3rem 0.75rem",
                      }}
                    >
                      {Object.entries(vec.details).map(([k, v]) => (
                        <div key={k} style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                          <span style={{ color: "#64748b" }}>{k}:</span>{" "}
                          <span>{v === null || v === undefined ? "n/a" : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div style={{ marginTop: "auto", paddingTop: "0.35rem", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                    <span style={{ color: "#64748b" }}>{vec.source}</span>
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

      {cmr && (
        <div className="card" style={{ marginTop: "1.35rem" }}>
          <div className="section-header" style={{ marginBottom: "0.65rem" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
              <Database size={18} color="#34d399" /> Verified via Official NASA Earthdata CMR MCP Server
            </span>
            <span className="mono" style={{ fontSize: "0.76rem", color: "#94a3b8" }}>
              POST {cmr.endpoint} (protocol {cmr.protocol})
            </span>
          </div>
          <div className="grid-4">
            {Object.entries(cmr.queries || {}).map(([key, q]) => (
              <div key={key} style={{ background: "#0a0e17", border: "1px solid #1e293b", borderRadius: 10, padding: "0.75rem" }}>
                <div className="stat-label">{q.keyword}</div>
                <div className="mono" style={{ fontSize: "1.05rem", fontWeight: 700, color: "#34d399", margin: "0.2rem 0" }}>
                  {q.total_hits} collections
                </div>
                <div className="mono" style={{ fontSize: "0.73rem", color: "#94a3b8" }}>
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
              <div key={ev.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", padding: "0.55rem 0.75rem", background: "#0a0e17", borderRadius: 8, border: "1px solid #1e293b", fontSize: "0.82rem" }}>
                <div>
                  <span className="badge sig" style={{ marginRight: 8 }}>{ev.type}</span>
                  <span className="mono" style={{ color: "#94a3b8" }}>{String(ev.time).slice(0, 16)}</span>
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
