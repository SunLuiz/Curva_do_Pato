import React, { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { getTrend } from "../api";

const REGIONS = [
  { id: "campinas", name: "Campinas-SP", biome: "Atlantic Forest / Cerrado transition", accent: "var(--biome-se)" },
  { id: "petrolina", name: "Petrolina-PE", biome: "Semi-arid solar corridor", accent: "var(--biome-ne)" },
  { id: "manaus", name: "Manaus-AM", biome: "Amazon basin", accent: "var(--biome-n)" },
];

function fmtP(p) {
  if (p === 0 || p < 1e-16) return "< 1e-16";
  if (p < 0.001) return p.toExponential(2);
  return p.toFixed(3);
}

function verdict(cloud, clear) {
  const cloudSig = cloud?.significant_5pct;
  const clearSig = clear?.significant_5pct;
  if (cloudSig && !clearSig) return { label: "Cloud-driven", why: "cloud attenuation trend is significant while clear-sky shows no trend", color: "var(--biome-n)" };
  if (clearSig && !cloudSig) return { label: "Aerosol / clear-sky driven", why: "clear-sky trend is significant while cloud attenuation shows no trend", color: "var(--danger)" };
  if (clearSig && cloudSig) return { label: "Mixed signal", why: "both cloud and clear-sky trends are significant", color: "var(--biome-ne)" };
  return { label: "No significant driver", why: "neither cloud nor clear-sky shows a significant trend at alpha = 0.05", color: "var(--ink-soft)" };
}

export default function CausalDivergence() {
  const [rows, setRows] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const results = await Promise.all(
          REGIONS.map(async (r) => {
            const [cloud, clear] = await Promise.all([
              getTrend({ region: r.id, variable: "CLOUD_ATTEN_PCT" }),
              getTrend({ region: r.id, variable: "CLRSKY_SFC_SW_DWN" }),
            ]);
            return { region: r, cloud: cloud.stats, clear: clear.stats };
          })
        );
        if (!cancelled) setRows(results);
      } catch (_err) {
        if (!cancelled) setFailed(true);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section style={{ marginTop: "2.5rem" }}>
      <div className="section-header">
        <div>
          <span className="badge sig">Falsification, not decoration</span>
          <h2 style={{ marginTop: "0.45rem" }}>One Engine, Opposite Causal Verdicts</h2>
        </div>
        <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
          All-Sky <span className="mono">vs</span> Clear-Sky at alpha = 0.05
        </span>
      </div>

      <p style={{ fontSize: "0.9rem", color: "var(--ink-soft)", maxWidth: "92ch", marginBottom: "1rem" }}>
        Surface solar brightening can come from fewer clouds or from cleaner air. The same
        statistical engine disagrees with itself by biome — and we publish the disagreement
        instead of hiding it.
      </p>

      {!rows && !failed && (
        <div className="card" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <Loader2 size={18} className="spin" /> Computing cloud vs clear-sky trend gate for 3 biomes...
        </div>
      )}

      {failed && (
        <div className="card" style={{ borderColor: "var(--danger)", background: "rgba(178,58,42,0.06)", color: "var(--danger)" }}>
          Causal divergence table unavailable. Preset region caches missing or unreachable.
        </div>
      )}

      {rows && (
        <div className="grid-3">
          {rows.map(({ region, cloud, clear }) => {
            const v = verdict(cloud, clear);
            return (
              <div key={region.id} className="card" style={{ borderColor: region.accent }}>
                <div className="mono" style={{ color: region.accent, fontWeight: 700, fontSize: "0.86rem" }}>
                  {region.name}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-faint)", marginBottom: "0.6rem" }}>
                  {region.biome}
                </div>

                <div style={{ display: "grid", gap: "0.35rem", fontSize: "0.82rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Cloud attenuation</span>
                    <span className="mono" style={{ color: cloud?.significant_5pct ? "var(--sig)" : "var(--ink-soft)" }}>
                      {cloud?.slope_per_decade > 0 ? "+" : ""}
                      {cloud?.slope_per_decade} %/dec
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                    <span style={{ color: "var(--ink-faint)", paddingLeft: "0.9rem", fontSize: "0.76rem" }}>p-value</span>
                    <span className="mono" style={{ fontSize: "0.76rem", color: cloud?.significant_5pct ? "var(--sig)" : "var(--ink-soft)" }}>
                      {fmtP(cloud?.p_value)}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", marginTop: "0.2rem" }}>
                    <span style={{ color: "var(--ink-soft)" }}>Clear-sky irradiance</span>
                    <span className="mono" style={{ color: clear?.significant_5pct ? "var(--sig)" : "var(--ink-soft)" }}>
                      {clear?.slope_per_decade > 0 ? "+" : ""}
                      {clear?.slope_per_decade}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
                    <span style={{ color: "var(--ink-faint)", paddingLeft: "0.9rem", fontSize: "0.76rem" }}>p-value</span>
                    <span className="mono" style={{ fontSize: "0.76rem", color: clear?.significant_5pct ? "var(--sig)" : "var(--ink-soft)" }}>
                      {fmtP(clear?.p_value)}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: "auto",
                    paddingTop: "0.65rem",
                    borderTop: "1px solid var(--hairline)",
                    fontSize: "0.8rem",
                    color: v.color,
                    fontWeight: 600,
                  }}
                >
                  {v.label}
                </div>
                <div style={{ fontSize: "0.75rem", color: "var(--ink-faint)", marginTop: "0.2rem" }}>{v.why}</div>
              </div>
            );
          })}
        </div>
      )}

      {rows && (
        <div
          className="card"
          style={{ marginTop: "1rem", borderColor: "var(--biome-ne)", background: "rgba(143,93,21,0.07)", display: "flex", gap: "0.7rem", alignItems: "flex-start" }}
        >
          <AlertTriangle size={18} color="var(--biome-ne)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div style={{ fontSize: "0.84rem", color: "var(--ink)", lineHeight: 1.55 }}>
            <strong style={{ color: "var(--biome-ne)" }}>Declared limitation (monthly resolution):</strong>{" "}
            wind speed <span className="mono">WS2M</span> shows no significant trend at any of the three
            stations (p = 0.489 / 0.173 / 0.451). This dataset is therefore{" "}
            <strong>not valid for sub-hourly ramp-risk claims</strong> — that requires hourly series. We
            keep it out of the product rather than implying it.
          </div>
        </div>
      )}
    </section>
  );
}
