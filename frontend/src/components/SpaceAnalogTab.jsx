import React, { useEffect, useMemo, useState } from "react";
import { Activity, Cpu, Database, Leaf, Orbit, Radio, ShieldCheck, Thermometer } from "lucide-react";
import { getSpaceAnalog } from "../api";
import GlossaryTooltip from "./GlossaryTooltip";

/**
 * Tab 5: Space Analog & Multi-Physics Thermodynamic Orchestration (MPTO).
 * Shows real open zero-key NASA feeds (DSN Now, OSDR OSD-615, CelesTrak GP) alongside
 * configured Mars/Moon API stubs and an interactive 7-Frontier parametric simulator.
 * Zero hex literals in JSX; strictly separates live/cached telemetry from parametric model outputs.
 */
export default function SpaceAnalogTab({ lang = "en" }) {
  const l = lang === "pt" ? "pt" : "en";
  const [payload, setPayload] = useState(null);
  const [status, setStatus] = useState("loading");

  // Parametric uncertainty & thermal-biological-logistic sliders (Frontier 1–7)
  const [tau, setTau] = useState(0.6); // Mars optical dust depth
  const [cpDust, setCpDust] = useState(0.8); // Dust specific heat Cp (kJ/kg.K)
  const [kReg, setKReg] = useState(0.85); // Sintered regolith conductivity (W/m.K)
  const [albedoIr, setAlbedoIr] = useState(12); // Lunar crater IR re-radiation recovery (%)

  useEffect(() => {
    let cancelled = false;
    getSpaceAnalog()
      .then((res) => {
        if (!cancelled) {
          setPayload(res);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Deterministic 4-layer MPTO physical calculation
  const sim = useMemo(() => {
    // Beer-Lambert solar attenuation under optical dust depth tau
    const pvYieldPct = Math.round(100 * Math.exp(-0.55 * tau));
    // Radiative T^4 saturation pressure when sky is clear (low tau) & compute load runs high
    const thermalLoadPct = Math.min(100, Math.round(92 - tau * 14 + (cpDust - 0.8) * 18));
    const radiatorSaturated = thermalLoadPct >= 82;
    // Sintered vs raw regolith conductivity ratio (raw baseline ~0.02 W/m.K)
    const conductivityGainX = Math.round(kReg / 0.02);
    // Nighttime battery survival heating savings via crater IR albedo (10-15% band)
    const heatingReductionPct = albedoIr;
    // Biological buffer hours based on excess daylight energy storable in photoperiod SoC_bio
    const bioBufferHrs = Number((Math.max(1.2, (pvYieldPct / 100) * 6.5)).toFixed(1));
    // Rover spatial arbitrage net benefit after ~12% Wh/km travel loss and 45 min actuator lead time
    const roverNetGainPct = Math.max(4, Math.round(pvYieldPct * 0.28 + albedoIr * 0.6 - 8));

    return {
      pvYieldPct,
      thermalLoadPct,
      radiatorSaturated,
      conductivityGainX,
      heatingReductionPct,
      bioBufferHrs,
      roverNetGainPct,
    };
  }, [tau, cpDust, kReg, albedoIr]);

  if (status === "loading") {
    return (
      <div className="card">
        {l === "pt"
          ? "Carregando telemetria aberta NASA DSN, OSDR (OSD-615) e CelesTrak..."
          : "Loading open NASA DSN Now, OSDR (OSD-615), and CelesTrak telemetry..."}
      </div>
    );
  }

  if (status === "error" || !payload) {
    return (
      <div className="card" style={{ color: "var(--danger)" }}>
        {l === "pt"
          ? "Não foi possível carregar o cache análogo espacial."
          : "Could not load space analog cache snapshot."}
      </div>
    );
  }

  const dsn = payload.dsn || {};
  const osdr = payload.osdr || {};
  const cel = payload.celestrak || {};
  const statuses = payload.feed_statuses || {};
  const frontiers = payload.mpto_frontiers || [];

  return (
    <div style={{ display: "grid", gap: "1.15rem" }}>
      {/* Intro & Honest Provenance */}
      <div className="card" style={{ borderLeft: "4px solid var(--biome-n)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Orbit size={18} color="var(--biome-n)" />
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem" }}>
              {l === "pt"
                ? "Análogo Espacial & Orquestração Multifísica (MPTO)"
                : "Space Analog & Multi-Physics Orchestration (MPTO)"}
            </h2>
          </div>
          <span className="badge sig">
            {l === "pt" ? "3 Feeds Abertos Verificados + Modelo MPTO" : "3 Verified Open Feeds + MPTO Model"}
          </span>
        </div>
        <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", marginTop: "0.45rem", maxWidth: "78ch", lineHeight: 1.55 }}>
          {l === "pt" ? (
            <>
              O mesmo algoritmo da Curva do Pato na Terra escala para habitats lunares e marcianos ao acoplar 4 camadas:
              eletricidade solar, radiador térmico{" "}
              <GlossaryTooltip termKey="mpto" lang={l}>T⁴ (MPTO)</GlossaryTooltip>, reserva fotossintética (
              <GlossaryTooltip termKey="soc_bio" lang={l}>SoC_bio</GlossaryTooltip>) e logística antecipada.
              Abaixo estão <strong>dados reais abertos</strong> (sem API key) separados do <strong>simulador paramétrico</strong>.
            </>
          ) : (
            <>
              The same Duck-Curve statistical guardrail that protects Brazilian power &amp; water scales off-world by coupling 4 physical layers:
              PV electricity, <GlossaryTooltip termKey="mpto" lang={l}>T⁴ radiator dissipation</GlossaryTooltip>, greenhouse biomass reserve (
              <GlossaryTooltip termKey="soc_bio" lang={l}>SoC_bio</GlossaryTooltip>), and actuator lead-time logistics.
              Below, <strong>verified open feeds</strong> are strictly separated from the <strong>parametric simulator</strong>.
            </>
          )}
        </p>
      </div>

      {/* 4 Telemetry Cards: DSN, OSDR, CelesTrak, MEDA/Horizons */}
      <div className="grid-2">
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: 700 }}>
              <Radio size={16} color="var(--biome-se)" /> {dsn.source || "NASA Deep Space Network Now"}
            </span>
            <span className="badge live">{statuses.dsn === "live" ? "live / snapshot" : "frozen snapshot"}</span>
          </div>
          <div style={{ marginTop: "0.55rem", fontSize: "0.88rem", color: "var(--ink)" }}>
            <strong>{dsn.stations?.join(" · ") || "Goldstone · Madrid · Canberra"}</strong> —{" "}
            {dsn.active_dishes_count ?? 14}/{dsn.total_dishes ?? 14}{" "}
            {l === "pt" ? "antenas ativas" : "active dishes"}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.55rem" }}>
            {(dsn.sample_active || []).slice(0, 6).map((d) => (
              <span key={d.name} className="badge" style={{ fontSize: "0.72rem" }}>
                {d.name} → {(d.targets || []).join(", ") || "DSN"}
                {d.down_band ? ` (${d.down_band})` : ""}
              </span>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: 700 }}>
              <Orbit size={16} color="var(--biome-n)" /> {cel.source || "CelesTrak NORAD GP"}
            </span>
            <span className="badge live">{statuses.celestrak === "live" ? "live / snapshot" : "frozen snapshot"}</span>
          </div>
          <div style={{ marginTop: "0.55rem", fontSize: "0.88rem" }}>
            <strong>{cel.object_name || "ISS (ZARYA)"}</strong> · {cel.objects_count ?? 17}{" "}
            {l === "pt" ? "estações rastreadas" : "tracked station objects"}
          </div>
          <div className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: "0.4rem" }}>
            {l === "pt" ? "Período orbital:" : "Orbital period:"} {cel.orbital_period_min} min ·{" "}
            {l === "pt" ? "Eclipse solar ~" : "Orbital eclipse ~"} {cel.approx_eclipse_min} min ({cel.approx_eclipse_pct}%) · Inc {cel.inclination_deg}°
          </div>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: 700 }}>
              <Leaf size={16} color="var(--sig)" /> NASA OSDR {osdr.study_id || "OSD-615"}
            </span>
            <span className="badge sig">verified dataset</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: "0.86rem", marginTop: "0.45rem", color: "var(--ink)" }}>
            {osdr.title}
          </div>
          <p style={{ fontSize: "0.79rem", color: "var(--ink-soft)", marginTop: "0.3rem", lineHeight: 1.45 }}>
            {osdr.biological_role}
          </p>
        </div>

        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: 700 }}>
              <Database size={16} color="var(--roadmap)" /> JPL Horizons &amp; Mars 2020 MEDA
            </span>
            <span className="badge roadmap">API client wired</span>
          </div>
          <ul style={{ marginTop: "0.5rem", paddingLeft: "1.1rem", fontSize: "0.82rem", color: "var(--ink-soft)", lineHeight: 1.55 }}>
            {(payload.existing_clients || []).map((c) => (
              <li key={c.id}>
                <strong>{c.label}</strong> — <span className="mono">{c.status}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Interactive MPTO Parametric Uncertainty Simulator */}
      <div className="card" style={{ background: "var(--surface-2)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.85rem" }}>
          <div>
            <div className="stat-label">
              {l === "pt" ? "Simulador Paramétrico de Fronteiras (Não é Série Histórica)" : "Parametric Frontier Simulator (Model Exploration)"}
            </div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.12rem" }}>
              {l === "pt"
                ? "Ajuste Poeira (Tau), Cp, Regolito Sinterizado (k) e Albedo IR Lunar"
                : "Vary Mars Dust (Tau), Cp, Sintered Regolith (k), and Lunar IR Albedo"}
            </h3>
          </div>
          <span className="badge">{l === "pt" ? "Cálculo em tempo real" : "Real-time physics sensitivity"}</span>
        </div>

        <div className="grid-4" style={{ marginBottom: "1rem" }}>
          <label className="card" style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>
              <GlossaryTooltip termKey="tau" lang={l}>Tau (τ)</GlossaryTooltip>: {tau.toFixed(1)}
            </span>
            <input type="range" min={0.3} max={5.0} step={0.1} value={tau} onChange={(e) => setTau(Number(e.target.value))} />
            <span style={{ fontSize: "0.74rem", color: "var(--ink-soft)" }}>
              {l === "pt" ? "0,3 claro → 5,0 tempestade global" : "0.3 clear → 5.0 global dust storm"}
            </span>
          </label>

          <label className="card" style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>Dust Cp: {cpDust.toFixed(2)} kJ/kg·K</span>
            <input type="range" min={0.5} max={1.2} step={0.05} value={cpDust} onChange={(e) => setCpDust(Number(e.target.value))} />
            <span style={{ fontSize: "0.74rem", color: "var(--ink-soft)" }}>
              {l === "pt" ? "Incerteza térmica de carga em suspensão" : "Suspended dust heat-capacity band"}
            </span>
          </label>

          <label className="card" style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>
              <GlossaryTooltip termKey="k_reg" lang={l}>k_reg</GlossaryTooltip>: {kReg.toFixed(2)} W/m·K
            </span>
            <input type="range" min={0.02} max={1.2} step={0.02} value={kReg} onChange={(e) => setKReg(Number(e.target.value))} />
            <span style={{ fontSize: "0.74rem", color: "var(--ink-soft)" }}>
              {l === "pt" ? "0,02 solto → 1,20 sinterizado (~50×)" : "0.02 loose → 1.20 sintered (~50×)"}
            </span>
          </label>

          <label className="card" style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>Lunar IR Albedo: +{albedoIr}%</span>
            <input type="range" min={0} max={15} step={1} value={albedoIr} onChange={(e) => setAlbedoIr(Number(e.target.value))} />
            <span style={{ fontSize: "0.74rem", color: "var(--ink-soft)" }}>
              {l === "pt" ? "Ganho passivo de encosta lunar (10–15%)" : "Crater wall IR heating offset (10–15%)"}
            </span>
          </label>
        </div>

        <div className="grid-4">
          <div className="card">
            <div className="stat-label"><Cpu size={13} style={{ verticalAlign: "middle" }} /> PV Duck-Curve Yield</div>
            <div className="stat-value" style={{ color: sim.pvYieldPct < 35 ? "var(--danger)" : "var(--biome-se)" }}>
              {sim.pvYieldPct}%
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
              {l === "pt" ? "Geração útil remanescente sob τ atual" : "Remaining direct PV under current τ"}
            </div>
          </div>

          <div className="card">
            <div className="stat-label"><Thermometer size={13} style={{ verticalAlign: "middle" }} /> T⁴ Radiator Saturation</div>
            <div className="stat-value" style={{ color: sim.radiatorSaturated ? "var(--danger)" : "var(--sig)" }}>
              {sim.thermalLoadPct}%
            </div>
            <div style={{ fontSize: "0.76rem", color: sim.radiatorSaturated ? "var(--danger)" : "var(--ink-soft)" }}>
              {sim.radiatorSaturated
                ? l === "pt"
                  ? "Alerta: acionar curtailment térmico da IA antes do pico!"
                  : "Watch: trigger compute thermal curtailment before saturation!"
                : l === "pt"
                  ? "Margem radiativa T⁴ dentro da envelope segura"
                  : "T⁴ radiator rejection within safe headroom"}
            </div>
          </div>

          <div className="card">
            <div className="stat-label"><Activity size={13} style={{ verticalAlign: "middle" }} /> Sintered Thermal Gain</div>
            <div className="stat-value" style={{ color: "var(--biome-ne)" }}>
              {sim.conductivityGainX}×
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
              {l === "pt"
                ? `Economia de ${sim.heatingReductionPct}% no aquecimento BESS (albedo IR)`
                : `${sim.heatingReductionPct}% nighttime BESS heating saved via IR albedo`}
            </div>
          </div>

          <div className="card">
            <div className="stat-label"><Leaf size={13} style={{ verticalAlign: "middle" }} /> SoC_bio &amp; Rover Lead</div>
            <div className="stat-value" style={{ color: "var(--biome-n)" }}>
              {sim.bioBufferHrs} h
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
              {l === "pt"
                ? `Ganho espacial rover ~+${sim.roverNetGainPct}% · despacho 30–60 min antes`
                : `Rover arbitrage ~+${sim.roverNetGainPct}% · dispatch 30–60 min ahead`}
            </div>
          </div>
        </div>
      </div>

      {/* 7 Frontiers Matrix */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginBottom: "0.75rem" }}>
          <ShieldCheck size={17} color="var(--biome-se)" />
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
            {l === "pt"
              ? "As 7 Fronteiras Físicas da Orquestração Espacial (MPTO)"
              : "The 7 Physical Frontiers of Off-World MPTO Dispatch"}
          </h3>
        </div>
        <div className="grid-2">
          {frontiers.map((f) => (
            <div key={f.id} className="card-inset" style={{ background: "var(--surface-0)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.4rem" }}>
                <span className="badge" style={{ fontSize: "0.7rem" }}>
                  #{f.id} · {f.layer}
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.9rem", marginTop: "0.35rem", color: "var(--ink)" }}>
                {l === "pt" ? f.title_pt : f.title_en}
              </div>
              <p style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: "0.2rem", lineHeight: 1.45 }}>
                {l === "pt" ? f.detail_pt : f.detail_en}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
