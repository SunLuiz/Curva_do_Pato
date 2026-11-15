import React, { useState } from "react";
import { Activity, CheckCircle2, Database, Layers, Orbit, Radio, RefreshCw, ShieldCheck } from "lucide-react";
import TrendPage from "./TrendPage";
import AttributionPage from "./AttributionPage";
import FiresMapSvg from "../components/FiresMapSvg";
import SpaceAnalogTab from "../components/SpaceAnalogTab";
import { UI_TEXT } from "../content/i18n";

export default function CockpitPage({
  region,
  setRegion,
  variable,
  setVariable,
  tab,
  setTab,
  fires,
  spaceWeather,
  backendStatus,
  onVerifyLive,
  lang = "en",
}) {
  const l = lang === "pt" ? "pt" : "en";
  const ui = UI_TEXT[l];
  const tabs = [
    { id: "trend", label: ui.tabTrend, Icon: Activity },
    { id: "attribution", label: ui.tabAttribution, Icon: Layers },
    { id: "sources", label: ui.tabSources, Icon: Database },
    { id: "live", label: ui.tabLive, Icon: Radio },
    { id: "space", label: ui.tabSpace, Icon: Orbit },
  ];

  const [verifying, setVerifying] = useState(false);
  const [verifyDelta, setVerifyDelta] = useState(null);

  const handleVerifyNow = async () => {
    setVerifying(true);
    setVerifyDelta(null);
    try {
      const result = await onVerifyLive({ region, variable });
      setVerifyDelta(result);
    } finally {
      setVerifying(false);
    }
  };

  const isLive = Boolean(backendStatus?.live);

  return (
    <div>
      <div className="section-header">
        <div>
          <span className="badge sig">1984–2025 Earth System &amp; Space Analog Workbench</span>
          <h2 style={{ marginTop: "0.45rem" }}>
            {l === "pt" ? "Cockpit de Tendências e Ação Climática" : "Earth System Trend Cockpit"}
          </h2>
        </div>
      </div>

      {/* Honest connection status banner (D6) */}
      <div className={`banner-status ${isLive ? "is-live" : "is-cached"}`} role="status">
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 700, color: isLive ? "var(--sig)" : "var(--biome-ne)" }}>
            {isLive
              ? `${ui.bannerLive} (${backendStatus.service || "FastAPI"})`
              : l === "pt"
                ? "Exibindo snapshot congelado — 2026-11-14 15:04 UTC"
                : "Showing frozen snapshot — 2026-11-14 15:04 UTC"}
          </span>
          <span style={{ fontSize: "0.84rem", color: "var(--ink-soft)" }}>
            {isLive
              ? l === "pt"
                ? "Consultas podem acessar as APIs da NASA diretamente."
                : "Queries can fetch upstream NASA APIs directly."
              : `${l === "pt" ? "Motivo:" : "Reason:"} ${backendStatus?.reason || "offline"} · ${
                  l === "pt"
                    ? "Séries de 504 meses, presets e análogo espacial funcionam instantaneamente no navegador."
                    : "Preset biomes, 504-month series, and space feeds run instantaneously offline."
                }`}
          </span>
        </div>

        <button
          type="button"
          className="btn-secondary"
          style={{ padding: "0.45rem 0.95rem", fontSize: "0.84rem" }}
          onClick={handleVerifyNow}
          disabled={verifying}
        >
          <RefreshCw size={14} className={verifying ? "spin" : undefined} />
          {verifying
            ? l === "pt"
              ? "Verificando backend NASA..."
              : "Checking NASA backend..."
            : l === "pt"
              ? "Verificar na NASA agora"
              : "Verify against NASA now"}
        </button>
      </div>

      {verifyDelta && (
        <div
          className="card"
          style={{
            marginBottom: "1.15rem",
            borderColor: verifyDelta.ok ? "var(--sig)" : "var(--biome-ne)",
            background: verifyDelta.ok ? "rgba(42,112,71,0.06)" : "rgba(143,93,21,0.07)",
          }}
        >
          <div className="mono" style={{ fontSize: "0.84rem", fontWeight: 700 }}>
            {verifyDelta.ok ? "Live verification succeeded" : "Backend unreachable — frozen snapshot remains active"}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)", marginTop: "0.25rem" }}>
            {verifyDelta.message}
          </div>
        </div>
      )}

      {/* Internal Cockpit tabs */}
      <div className="cockpit-tabs" role="tablist" aria-label="Cockpit Views">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            className={`pill ${tab === id ? "active" : ""}`}
            onClick={() => setTab(id)}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {tab === "trend" && (
        <TrendPage
          region={region}
          setRegion={setRegion}
          variable={variable}
          setVariable={setVariable}
          onSwitchTab={setTab}
          fires={fires}
          spaceWeather={spaceWeather}
          lang={l}
        />
      )}

      {tab === "attribution" && <AttributionPage region={region} setRegion={setRegion} />}

      {tab === "sources" && (
        <div style={{ display: "grid", gap: "1.5rem" }}>
          <div>
            <div className="section-header">
              <h2>Who Acts on These Numbers</h2>
              <span className="badge">Persona → Decision → Evidence</span>
            </div>
            <div className="card" style={{ padding: 0, overflow: "hidden" }}>
              <table className="persona-table">
                <thead>
                  <tr>
                    <th>Persona</th>
                    <th>Decision it changes</th>
                    <th>Number that supports it</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <strong>Civil defense / urban planning</strong>
                      <div style={{ fontSize: "0.76rem", color: "var(--ink-faint)" }}>Campinas municipality</div>
                    </td>
                    <td>Size heat-wave response and thermal load headroom for a multi-decade warming baseline.</td>
                    <td className="mono" style={{ color: "var(--biome-se)" }}>
                      +0.409 °C/dec ~ +1.72 °C cumulative
                      <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)", fontFamily: "inherit" }}>
                        95% CI [+0.333, +0.489], p &lt; 1e-16
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Solar generation planner</strong>
                      <div style={{ fontSize: "0.76rem", color: "var(--ink-faint)" }}>Semi-arid Northeast corridor</div>
                    </td>
                    <td>Decide whether rising irradiance is a durable resource gain or a cloud artifact before committing capacity.</td>
                    <td className="mono" style={{ color: "var(--biome-ne)" }}>
                      Cloud -0.965 %/dec, p = 2.83e-09
                      <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)", fontFamily: "inherit" }}>
                        Clear-sky p = 0.290 (no trend)
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Air quality &amp; fire response</strong>
                      <div style={{ fontSize: "0.76rem", color: "var(--ink-faint)" }}>Amazon basin</div>
                    </td>
                    <td>Separate smoke-driven aerosol forcing from cloud-cover change when advising health authorities.</td>
                    <td className="mono" style={{ color: "var(--biome-n)" }}>
                      Cloud -0.855 %/dec, p = 3.02e-08
                      <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)", fontFamily: "inherit" }}>
                        Clear-sky p = 0.769 (no trend)
                      </div>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <strong>Grid ramp / storage operator</strong>
                      <div style={{ fontSize: "0.76rem", color: "var(--ink-faint)" }}>Declared out of scope</div>
                    </td>
                    <td>Pre-position battery storage ahead of an intra-hour generation ramp.</td>
                    <td className="mono" style={{ color: "var(--null-ink)" }}>
                      Not supported — monthly WS2M p = 0.489 / 0.173 / 0.451
                      <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)", fontFamily: "inherit" }}>
                        Needs hourly series; kept out of the product
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <div className="section-header">
              <h2>NASA Data Sources &amp; Open Telemetry</h2>
              <span style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>Every metric links to its canonical dataset</span>
            </div>
            <div className="grid-4">
              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>NASA POWER</strong>
                  <span className="badge live">Live / Cached</span>
                </div>
                <p style={{ fontSize: "0.84rem", color: "var(--ink-soft)", margin: "0.5rem 0 0.75rem" }}>
                  Monthly surface meteorology &amp; solar irradiance (1984–2025) powered by CERES and MERRA-2.
                </p>
                <a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer" className="mono" style={{ fontSize: "0.78rem" }}>
                  power.larc.nasa.gov ↗
                </a>
              </div>

              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>NASA FIRMS</strong>
                  <span className="badge live">Live / Cached</span>
                </div>
                <p style={{ fontSize: "0.84rem", color: "var(--ink-soft)", margin: "0.5rem 0 0.75rem" }}>
                  Near-real-time active fire &amp; Fire Radiative Power detections from VIIRS NOAA-21.
                </p>
                <a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noreferrer" className="mono" style={{ fontSize: "0.78rem" }}>
                  firms.modaps.eosdis.nasa.gov ↗
                </a>
              </div>

              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>NASA DONKI</strong>
                  <span className="badge live">Live / Cached</span>
                </div>
                <p style={{ fontSize: "0.84rem", color: "var(--ink-soft)", margin: "0.5rem 0 0.75rem" }}>
                  Space weather notifications for solar flares, CMEs, radiation belts, and geomagnetic storms.
                </p>
                <a href="https://kauai.ccmc.gsfc.nasa.gov/DONKI/" target="_blank" rel="noreferrer" className="mono" style={{ fontSize: "0.78rem" }}>
                  kauai.ccmc.gsfc.nasa.gov ↗
                </a>
              </div>

              <div className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong>Earthdata CMR MCP</strong>
                  <span className="badge sig">Verified</span>
                </div>
                <p style={{ fontSize: "0.84rem", color: "var(--ink-soft)", margin: "0.5rem 0 0.75rem" }}>
                  Official NASA CMR Model Context Protocol catalog verifying MODIS/VIIRS, CERES, ECOSTRESS &amp; NISAR concept IDs.
                </p>
                <a href="https://cmr.earthdata.nasa.gov/" target="_blank" rel="noreferrer" className="mono" style={{ fontSize: "0.78rem" }}>
                  cmr.earthdata.nasa.gov ↗
                </a>
              </div>
            </div>
          </div>

          <div className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700 }}>
                <ShieldCheck size={18} color="var(--biome-n)" /> Space Analog Telemetry &amp; MPTO <span className="badge sig">live in Space tab</span>
              </div>
              <p style={{ fontSize: "0.85rem", color: "var(--ink-soft)", marginTop: "0.3rem", maxWidth: "74ch" }}>
                Open zero-key feeds from NASA Deep Space Network Now, NASA OSDR (OSD-615 plant cell-walls), and CelesTrak GP
                are live/cached in the Space Analog (MPTO) tab alongside our parametric 7-Frontier physics simulator, while
                Mars 2020 MEDA &amp; JPL Horizons API clients remain wired as configurable backend adapters.
              </p>
            </div>
            <button type="button" className="btn-secondary" onClick={() => setTab("space")}>
              Open Space Analog (MPTO)
            </button>
          </div>
        </div>
      )}

      {tab === "space" && <SpaceAnalogTab lang={l} />}

      {tab === "live" && (
        <div className="grid-2">
          <div className="card">
            <FiresMapSvg
              fires={fires}
              activeRegion={region}
              onSelectRegion={(regId) => {
                setRegion(regId);
                setTab("trend");
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div className="card">
              <div className="stat-label">Brazil Active Fires (24h VIIRS NOAA-21)</div>
              <div className="stat-value" style={{ color: "var(--danger)" }}>
                {(fires?.count ?? 3313).toLocaleString("en-US")} detections
              </div>
              <div style={{ fontSize: "0.85rem", color: "var(--ink-soft)" }}>
                Mean FRP: <strong>{fires?.mean_frp_mw ?? 3.06} MW</strong> · CMR concept:{" "}
                <span className="mono">{fires?.cmr_concept_id || "C3264430167-LANCEMODIS"}</span>
              </div>
            </div>

            <div className="card" style={{ flex: 1 }}>
              <div className="section-header" style={{ marginBottom: "0.65rem" }}>
                <h3 style={{ fontSize: "1.02rem" }}>NASA DONKI 7-Day Space Weather</h3>
                <span className="badge live">{spaceWeather?.count ?? 8} alerts</span>
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {(spaceWeather?.events || []).slice(0, 6).map((ev) => (
                  <div
                    key={ev.id}
                    className="card-inset"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.6rem", fontSize: "0.82rem" }}
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
          </div>
        </div>
      )}
    </div>
  );
}
