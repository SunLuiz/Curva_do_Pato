import React from "react";
import { ArrowRight, CheckCircle2, Flame, Globe, LineChart, Radio, ShieldCheck, Sun } from "lucide-react";
import CausalDivergence from "../components/CausalDivergence";

export default function LandingPage({ onNavigate, fires, spaceWeather }) {
  return (
    <div>
      <section className="hero">
        <div>
          <span className="badge sig">
            NASA Space Apps Challenge 2026 · Campinas · Challenge #2
          </span>
          <h1>
            Be An Earth System <span>Trend Detective</span>
          </h1>
          <p className="hero-lead">
            A trend without a statistical significance test is just an opinion. Cockpit-OMNI fetches 42-year NASA satellite &amp; reanalysis series, runs Seasonal Mann-Kendall + Theil-Sen regression, and attributes shifts across four physical vectors with honest data provenance.
          </p>
          <div className="cta-row">
            <button className="btn-primary" onClick={() => onNavigate("/trend")}>
              Access the Cockpit <ArrowRight size={17} />
            </button>
            <button className="btn-secondary" onClick={() => onNavigate("/attribution")}>
              Explore 4 Attribution Vectors
            </button>
          </div>
        </div>

        <div className="hero-telemetry">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="stat-label">Verified Benchmark Telemetry</span>
            <span className="badge live">NASA Open APIs</span>
          </div>

          <div className="telemetry-row">
            <div>
              <div style={{ fontWeight: 600 }}>Campinas-SP (T2M, 1984–2025)</div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Seasonal MK τ = +0.293 · p &lt; 1e-16</div>
            </div>
            <div className="mono" style={{ color: "#38bdf8", fontWeight: 700, fontSize: "1.05rem" }}>
              +0.409 °C/dec
            </div>
          </div>

          <div className="telemetry-row">
            <div>
              <div style={{ fontWeight: 600 }}>Manaus-AM Cloud Attenuation</div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>Clear-Sky p = 0.769 · Cloud p = 3.02e-08</div>
            </div>
            <div className="mono" style={{ color: "#22d3ee", fontWeight: 700, fontSize: "1.05rem" }}>
              -0.855 %/dec
            </div>
          </div>

          <div className="telemetry-row">
            <div>
              <div style={{ fontWeight: 600 }}>Brazil Active Fires (24h VIIRS NOAA-21)</div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>NASA FIRMS NRT · CMR C3264430167</div>
            </div>
            <div className="mono" style={{ color: "#f59e0b", fontWeight: 700, fontSize: "1.05rem" }}>
              {fires ? `${Number(fires.count).toLocaleString("en-US")} fires` : "3,313 fires"}
            </div>
          </div>

          <div className="telemetry-row">
            <div>
              <div style={{ fontWeight: 600 }}>Space Weather Alerts (7d DONKI)</div>
              <div style={{ fontSize: "0.8rem", color: "#94a3b8" }}>CME / Flare / Radiation Belt Telemetry</div>
            </div>
            <div className="mono" style={{ color: "#34d399", fontWeight: 700, fontSize: "1.05rem" }}>
              {spaceWeather ? `${spaceWeather.count} events` : "8 events"}
            </div>
          </div>
        </div>
      </section>

      <section style={{ marginTop: "2.25rem" }}>
        <div className="section-header">
          <h2>Challenge #2 — Four Mandatory Elements Verified</h2>
          <span className="badge">Auditable &amp; Reproducible</span>
        </div>
        <div className="grid-4">
          <div className="card">
            <LineChart size={20} color="#38bdf8" />
            <h3 style={{ marginTop: "0.65rem", fontSize: "1rem" }}>1. Earth Variables</h3>
            <p style={{ fontSize: "0.86rem", color: "#94a3b8", marginTop: "0.35rem" }}>
              Temperature (T2M), Precipitation (PRECTOTCORR), All-Sky &amp; Clear-Sky Irradiance, Relative Humidity, Wind, and Cloud Attenuation Deficit.
            </p>
          </div>
          <div className="card">
            <Globe size={20} color="#22d3ee" />
            <h3 style={{ marginTop: "0.65rem", fontSize: "1rem" }}>2. Specific Regions</h3>
            <p style={{ fontSize: "0.86rem", color: "#94a3b8", marginTop: "0.35rem" }}>
              Campinas-SP (Southeast), Petrolina-PE (Semi-Arid Solar Corridor), Manaus-AM (Amazon Basin), plus custom coordinate queries.
            </p>
          </div>
          <div className="card">
            <Radio size={20} color="#f59e0b" />
            <h3 style={{ marginTop: "0.65rem", fontSize: "1rem" }}>3. Long Time Series</h3>
            <p style={{ fontSize: "0.86rem", color: "#94a3b8", marginTop: "0.35rem" }}>
              42 continuous years (1984–2025, n = 504 monthly observations) directly from NASA POWER (MERRA-2 &amp; CERES), dropping annual summary rows.
            </p>
          </div>
          <div className="card">
            <ShieldCheck size={20} color="#34d399" />
            <h3 style={{ marginTop: "0.65rem", fontSize: "1rem" }}>4. Statistical Proof</h3>
            <p style={{ fontSize: "0.86rem", color: "#94a3b8", marginTop: "0.35rem" }}>
              Seasonal Mann-Kendall (period=12) + Original MK (τ, p-value, α=0.05) + Deseasonalized Theil-Sen slope per decade with 95% confidence interval.
            </p>
          </div>
        </div>
      </section>

      <CausalDivergence />

      <section style={{ marginTop: "2.5rem" }}>
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
                  <div style={{ fontSize: "0.76rem", color: "#64748b" }}>Campinas municipality</div>
                </td>
                <td>Size heat-wave response and thermal load headroom for a multi-decade warming baseline.</td>
                <td className="mono" style={{ color: "#38bdf8" }}>
                  +0.409 °C/dec ~ +1.72 °C cumulative
                  <div style={{ fontSize: "0.76rem", color: "#94a3b8", fontFamily: "inherit" }}>
                    95% CI [+0.333, +0.489], p &lt; 1e-16
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Solar generation planner</strong>
                  <div style={{ fontSize: "0.76rem", color: "#64748b" }}>Semi-arid Northeast corridor</div>
                </td>
                <td>Decide whether rising irradiance is a durable resource gain or a cloud artifact before committing capacity.</td>
                <td className="mono" style={{ color: "#f59e0b" }}>
                  Cloud −0.965 %/dec, p = 2.83e-09
                  <div style={{ fontSize: "0.76rem", color: "#94a3b8", fontFamily: "inherit" }}>
                    Clear-sky p = 0.290 (no trend)
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Air quality &amp; fire response</strong>
                  <div style={{ fontSize: "0.76rem", color: "#64748b" }}>Amazon basin</div>
                </td>
                <td>Separate smoke-driven aerosol forcing from cloud-cover change when advising health authorities.</td>
                <td className="mono" style={{ color: "#22d3ee" }}>
                  Cloud −0.855 %/dec, p = 3.02e-08
                  <div style={{ fontSize: "0.76rem", color: "#94a3b8", fontFamily: "inherit" }}>
                    Clear-sky p = 0.769 (no trend)
                  </div>
                </td>
              </tr>
              <tr>
                <td>
                  <strong>Grid ramp / storage operator</strong>
                  <div style={{ fontSize: "0.76rem", color: "#64748b" }}>Declared out of scope</div>
                </td>
                <td>Pre-position battery storage ahead of an intra-hour generation ramp.</td>
                <td className="mono" style={{ color: "#94a3b8" }}>
                  Not supported — monthly WS2M p = 0.489 / 0.173 / 0.451
                  <div style={{ fontSize: "0.76rem", color: "#94a3b8", fontFamily: "inherit" }}>
                    Needs hourly series; kept out of the product
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: "2.5rem" }}>
        <div className="section-header">
          <h2>NASA Data Sources &amp; Open Telemetry</h2>
          <span style={{ fontSize: "0.85rem", color: "#94a3b8" }}>Every metric links to its canonical dataset</span>
        </div>
        <div className="grid-4">
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>NASA POWER</strong>
              <span className="badge live">Live</span>
            </div>
            <p style={{ fontSize: "0.84rem", color: "#94a3b8", margin: "0.5rem 0 0.75rem" }}>
              Monthly surface meteorology &amp; solar irradiance (1984–2025) powered by CERES and MERRA-2.
            </p>
            <a href="https://power.larc.nasa.gov/" target="_blank" rel="noreferrer" className="mono" style={{ fontSize: "0.78rem" }}>
              power.larc.nasa.gov ↗
            </a>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>NASA FIRMS</strong>
              <span className="badge live">Live</span>
            </div>
            <p style={{ fontSize: "0.84rem", color: "#94a3b8", margin: "0.5rem 0 0.75rem" }}>
              Near-real-time active fire &amp; Fire Radiative Power detections from VIIRS NOAA-21.
            </p>
            <a href="https://firms.modaps.eosdis.nasa.gov/" target="_blank" rel="noreferrer" className="mono" style={{ fontSize: "0.78rem" }}>
              firms.modaps.eosdis.nasa.gov ↗
            </a>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>NASA DONKI</strong>
              <span className="badge live">Live</span>
            </div>
            <p style={{ fontSize: "0.84rem", color: "#94a3b8", margin: "0.5rem 0 0.75rem" }}>
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
            <p style={{ fontSize: "0.84rem", color: "#94a3b8", margin: "0.5rem 0 0.75rem" }}>
              Official NASA CMR Model Context Protocol catalog verifying MODIS/VIIRS, CERES, ECOSTRESS &amp; NISAR concept IDs.
            </p>
            <a href="https://cmr.earthdata.nasa.gov/" target="_blank" rel="noreferrer" className="mono" style={{ fontSize: "0.78rem" }}>
              cmr.earthdata.nasa.gov ↗
            </a>
          </div>
        </div>
      </section>

      <section className="card" style={{ marginTop: "2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 600 }}>
            <CheckCircle2 size={18} color="#a855f7" /> Off-World Analog Telemetry <span className="badge roadmap">roadmap</span>
          </div>
          <p style={{ fontSize: "0.85rem", color: "#94a3b8", marginTop: "0.3rem", maxWidth: "74ch" }}>
            Mars 2020 Perseverance MEDA &amp; JPL Horizons clients exist in the backend as read-only
            analog stubs, but no off-world series is computed or displayed in this product. We
            declare it as a one-line horizon, not as a delivered feature. Globe layer credit:{" "}
            <a href="https://github.com/bilawalsidhu/gods-eye-view" target="_blank" rel="noreferrer">
              God&apos;s Eye View (MIT)
            </a>
            .
          </p>
        </div>
        <button className="btn-primary" onClick={() => onNavigate("/trend")}>
          Launch Trend Detective <ArrowRight size={16} />
        </button>
      </section>
    </div>
  );
}
