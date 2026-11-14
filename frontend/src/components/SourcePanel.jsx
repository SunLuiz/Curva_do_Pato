import React from "react";
import { ExternalLink } from "lucide-react";

export default function SourcePanel({ data, stats }) {
  const isCached = data?._transport === "offline_cache";
  const frozenAt = data?.frozen_at_utc ? data.frozen_at_utc.slice(0, 19).replace("T", " ") + " UTC" : "2026-11-14 15:04 UTC";
  const powerUrl = `https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=${encodeURIComponent(
    data?.variable === "CLOUD_ATTEN_PCT" ? "ALLSKY_SFC_SW_DWN,CLRSKY_SFC_SW_DWN" : data?.variable || "T2M"
  )}&community=AG&longitude=${data?.region?.lon ?? -47.06}&latitude=${data?.region?.lat ?? -22.9}&start=1984&end=2025&format=JSON`;

  return (
    <div style={{ display: "grid", gap: "0.9rem" }}>
      <div className="grid-2">
        <div className="card-inset">
          <div className="stat-label">Data Transport</div>
          <div style={{ marginTop: "0.35rem", fontWeight: 700, color: isCached ? "var(--biome-ne)" : "var(--sig)" }}>
            {isCached ? `Frozen Cache Snapshot (${frozenAt})` : "Live FastAPI Backend Telemetry"}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: "0.25rem" }}>
            {isCached
              ? "Served directly from verified local JSON snapshot so the demo works with zero network latency or login."
              : "Computed dynamically from NASA POWER upstream API."}
          </div>
        </div>

        <div className="card-inset">
          <div className="stat-label">Statistical Pipeline</div>
          <div className="mono" style={{ marginTop: "0.35rem", fontSize: "0.84rem", fontWeight: 600 }}>
            {stats?.method}
          </div>
          <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)", marginTop: "0.25rem" }}>
            Drops annual summary rows (`YYYY13`) and `-999.0` fill values before aligning monthly calendar periods.
          </div>
        </div>
      </div>

      <div className="card-inset">
        <div className="stat-label">Canonical NASA POWER Query Endpoint</div>
        <div className="mono" style={{ fontSize: "0.78rem", color: "var(--ink)", wordBreak: "break-all", marginTop: "0.35rem" }}>
          {powerUrl}
        </div>
        <div style={{ marginTop: "0.6rem", display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.82rem" }}>
          <a href={data?.source_url || "https://power.larc.nasa.gov/"} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            NASA POWER Portal <ExternalLink size={13} />
          </a>
          <a href="https://cmr.earthdata.nasa.gov/" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            Earthdata CMR Catalog <ExternalLink size={13} />
          </a>
        </div>
      </div>
    </div>
  );
}
