import React from "react";
import { Activity, Cpu, Gamepad2, Leaf, Thermometer } from "lucide-react";
import GlossaryTooltip from "../GlossaryTooltip";
import PrecedingExplanation from "./PrecedingExplanation";

/**
 * Unified 4-layer MPTO parametric simulator powered by planetaryPhysics.js equations
 * via mptoEngine. Includes deep link launch directly into Rover Pilot 3D (/game).
 * Zero hex literals.
 */
export default function MPTOUnifiedSimulator({
  params,
  unified,
  onChangeParam,
  onLaunchGame,
  lang = "en",
}) {
  const l = lang === "pt" ? "pt" : "en";

  return (
    <section style={{ display: "grid", gap: "0.75rem" }}>
      <PrecedingExplanation
        stepLabel={l === "pt" ? "Bloco 3 · Simulador Multifísico MPTO" : "Block 3 · Coupled MPTO Simulator"}
        title={
          l === "pt"
            ? "Acoplamento Beer-Lambert (τ), Saturação T⁴ (82%), Regolito (k_reg) e SoC_bio"
            : "Coupling Beer-Lambert PV (τ), T⁴ Radiator Ceiling (82%), Sintered k_reg & SoC_bio"
        }
        badge={l === "pt" ? "Modelo Paramétrico em Tempo Real" : "Real-Time Physics Sensitivity"}
        tone="--biome-ne"
        lang={l}
        whyItMatters={
          l === "pt"
            ? "Em vez de painéis isolados, este simulador usa as mesmas equações do Rover Pilot 3D (computeSolarYieldPct e computeThermalLoadPct). Quando o céu está muito limpo (τ baixo) e as asas ficam abertas, o radiador T⁴ ultrapassa 82% de saturação — exigindo sombreamento, recolhimento de asas ou descarga em BESS térmica."
            : "Instead of simplified mock sliders, this panel runs the exact computeSolarYieldPct and computeThermalLoadPct equations from Rover Pilot 3D. Under clear sky (low τ) and full open wings, T⁴ heat rejection breaches the 82% saturation ceiling — requiring BESS tethering, wing stowing, or shadow scheduling."
        }
        equation={
          <span>
            PV = I<sub>norm</sub> · e<sup>−0.55τ</sup> · clean · (1 + IR) &nbsp;|&nbsp; T⁴ = 38 + 56·I − 14τ + 18(C<sub>p</sub> − 0.8) + wing + shadow + BESS
          </span>
        }
        decisionRule={
          l === "pt"
            ? "Se T⁴ ≥ 82%, acione recolhimento de asas / cabo BESS ou compute curtailment antes do pico térmico. Sinterizar regolito (k_reg: 0,02 → 0,85 W/m·K) eleva em ~43× a condutividade da bateria térmica noturna."
            : "If T⁴ >= 82%, dock tethered BESS or fold wings ahead of saturation. Laser/microwave sintering (k_reg: 0.02 -> 0.85 W/m·K) yields ~43× thermal conductivity for nighttime storage."
        }
        glossaryKeys={["duck-curve", "tau", "k_reg", "soc_bio"]}
      />

      <div className="card" style={{ background: "var(--surface-2)", display: "grid", gap: "1rem" }}>
        {/* Primary 4 Sliders matching audited parametric vector */}
        <div className="grid-4">
          <label className="card" style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>
              <GlossaryTooltip termKey="tau" lang={l}>Tau (τ)</GlossaryTooltip>: {Number(params.tau).toFixed(2)}
            </span>
            <input
              type="range"
              min={0.05}
              max={5.0}
              step={0.05}
              value={params.tau}
              onChange={(e) => onChangeParam("tau", Number(e.target.value))}
            />
            <span style={{ fontSize: "0.74rem", color: "var(--ink-soft)" }}>
              {l === "pt" ? "0,05 vácuo → 5,0 tempestade global" : "0.05 clear → 5.0 global dust storm"}
            </span>
          </label>

          <label className="card" style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>
              Dust C<sub>p</sub>: {Number(params.cpDust).toFixed(2)} kJ/kg·K
            </span>
            <input
              type="range"
              min={0.5}
              max={1.2}
              step={0.05}
              value={params.cpDust}
              onChange={(e) => onChangeParam("cpDust", Number(e.target.value))}
            />
            <span style={{ fontSize: "0.74rem", color: "var(--ink-soft)" }}>
              {l === "pt" ? "Capacidade térmica da carga em suspensão" : "Suspended dust heat-capacity band"}
            </span>
          </label>

          <label className="card" style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>
              <GlossaryTooltip termKey="k_reg" lang={l}>k_reg</GlossaryTooltip>: {Number(params.kReg).toFixed(2)} W/m·K
            </span>
            <input
              type="range"
              min={0.02}
              max={1.2}
              step={0.02}
              value={params.kReg}
              onChange={(e) => onChangeParam("kReg", Number(e.target.value))}
            />
            <span style={{ fontSize: "0.74rem", color: "var(--ink-soft)" }}>
              {l === "pt" ? "0,02 solto → 1,20 sinterizado (~50×)" : "0.02 loose → 1.20 sintered (~50×)"}
            </span>
          </label>

          <label className="card" style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>
              IR Albedo: +{params.albedoIr}%
            </span>
            <input
              type="range"
              min={0}
              max={15}
              step={1}
              value={params.albedoIr}
              onChange={(e) => onChangeParam("albedoIr", Number(e.target.value))}
            />
            <span style={{ fontSize: "0.74rem", color: "var(--ink-soft)" }}>
              {l === "pt" ? "Re-irradiação infravermelha de cratera" : "Crater wall IR heating offset (0–15%)"}
            </span>
          </label>
        </div>

        {/* Operational Actuator Toggles (coupled directly into planetaryPhysics) */}
        <div className="grid-4">
          <label className="card" style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>
              {l === "pt" ? "Irradiância I_norm" : "Solar Irradiance I_norm"}: {Math.round(params.irradianceNorm * 100)}%
            </span>
            <input
              type="range"
              min={0.15}
              max={1.05}
              step={0.05}
              value={params.irradianceNorm}
              onChange={(e) => onChangeParam("irradianceNorm", Number(e.target.value))}
            />
          </label>

          <label className="card" style={{ display: "grid", gap: "0.35rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>
              {l === "pt" ? "Sujeira nos Painéis" : "Panel Soiling"}: {params.soilingPct}%
            </span>
            <input
              type="range"
              min={0}
              max={60}
              step={2}
              value={params.soilingPct}
              onChange={(e) => onChangeParam("soilingPct", Number(e.target.value))}
            />
          </label>

          <div className="card" style={{ display: "grid", gap: "0.38rem" }}>
            <span className="stat-label" style={{ fontSize: "0.68rem" }}>
              {l === "pt" ? "Postura das Asas [1] / [3]" : "Wing Actuator Mode [1] / [3]"}
            </span>
            <div style={{ display: "flex", gap: "0.3rem" }}>
              {[
                { id: "open", pt: "Abertas", en: "Open" },
                { id: "tilted", pt: "Inclin.", en: "Tilted" },
                { id: "stowed", pt: "Fechadas", en: "Stowed" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onChangeParam("wingsMode", m.id)}
                  className={`pill ${params.wingsMode === m.id ? "active" : ""}`}
                  style={{ flex: 1, justifyContent: "center", fontSize: "0.73rem", padding: "0.3rem 0.4rem" }}
                >
                  {l === "pt" ? m.pt : m.en}
                </button>
              ))}
            </div>
          </div>

          <div className="card" style={{ display: "grid", gap: "0.38rem" }}>
            <span className="stat-label" style={{ fontSize: "0.68rem" }}>
              {l === "pt" ? "Despacho BESS [5] / Sombra / Borda" : "BESS Tether [5] / Shade / Rim"}
            </span>
            <div style={{ display: "flex", gap: "0.3rem" }}>
              <button
                type="button"
                onClick={() => onChangeParam("tethered", !params.tethered)}
                className={`pill ${params.tethered ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center", fontSize: "0.72rem", padding: "0.3rem 0.35rem" }}
              >
                BESS
              </button>
              <button
                type="button"
                onClick={() => onChangeParam("inShadow", !params.inShadow)}
                className={`pill ${params.inShadow ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center", fontSize: "0.72rem", padding: "0.3rem 0.35rem" }}
              >
                {l === "pt" ? "Sombra" : "Shade"}
              </button>
              <button
                type="button"
                onClick={() => onChangeParam("onCraterRim", !params.onCraterRim)}
                className={`pill ${params.onCraterRim ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center", fontSize: "0.72rem", padding: "0.3rem 0.35rem" }}
              >
                Rim IR
              </button>
            </div>
          </div>
        </div>

        {/* Coupled Outputs */}
        <div className="grid-4">
          <div className="card">
            <div className="stat-label">
              <Cpu size={13} style={{ verticalAlign: "middle" }} /> PV Duck-Curve Yield
            </div>
            <div className="stat-value" style={{ color: unified.pvYieldPct < 35 ? "var(--danger)" : "var(--biome-se)" }}>
              {unified.pvYieldPct}%
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
              {l === "pt"
                ? `Curva acoplada (Beer-Lambert puro: ${unified.pvDirectExpPct}%)`
                : `Coupled PV output (raw exp(-0.55τ): ${unified.pvDirectExpPct}%)`}
            </div>
          </div>

          <div className="card">
            <div className="stat-label">
              <Thermometer size={13} style={{ verticalAlign: "middle" }} /> T⁴ Radiator Saturation
            </div>
            <div className="stat-value" style={{ color: unified.radiatorSaturated ? "var(--danger)" : "var(--sig)" }}>
              {unified.thermalLoadPct}%
            </div>
            <div style={{ fontSize: "0.76rem", color: unified.radiatorSaturated ? "var(--danger)" : "var(--ink-soft)" }}>
              {unified.radiatorSaturated
                ? l === "pt"
                  ? "ALERTA >=82%: fechar asas [1], ir à Sombra ou acoplar BESS!"
                  : "ALERT >=82%: fold wings [1], enter Shade, or tether BESS!"
                : l === "pt"
                  ? "Margem radiativa T⁴ dentro do envelope seguro (<82%)"
                  : "T⁴ radiator rejection within safe envelope (<82%)"}
            </div>
          </div>

          <div className="card">
            <div className="stat-label">
              <Activity size={13} style={{ verticalAlign: "middle" }} /> Sintered Thermal Gain
            </div>
            <div className="stat-value" style={{ color: "var(--biome-ne)" }}>
              {unified.conductivityGainX}×
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
              {l === "pt"
                ? `Economia de ${unified.heatingReductionPct}% no BESS noturno (albedo IR)`
                : `${unified.heatingReductionPct}% nighttime BESS heating saved via IR albedo`}
            </div>
          </div>

          <div className="card">
            <div className="stat-label">
              <Leaf size={13} style={{ verticalAlign: "middle" }} /> SoC_bio &amp; Rover Lead
            </div>
            <div className="stat-value" style={{ color: "var(--biome-n)" }}>
              {unified.bioBufferHrs} h
            </div>
            <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
              {l === "pt"
                ? `Arbitragem líquida +${unified.roverNetGainPct}% · penalidade terreno ${unified.geotechnical.energyDistanceMult}×`
                : `Net rover arbitrage +${unified.roverNetGainPct}% · soil factor ${unified.geotechnical.energyDistanceMult}×`}
            </div>
          </div>
        </div>

        {/* Deep link launch straight into 3D Rover Pilot */}
        <div
          className="card"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.85rem",
            borderLeft: "4px solid var(--sig)",
          }}
        >
          <div>
            <div className="stat-label" style={{ fontSize: "0.7rem" }}>
              {l === "pt" ? "Ponte Cockpit -> Simulador 3D" : "Cockpit -> 3D Simulator Bridge"}
            </div>
            <div style={{ fontWeight: 700, fontSize: "0.96rem", color: "var(--ink)", marginTop: "0.18rem" }}>
              {l === "pt"
                ? `Testar Θ (${unified.planet.labelPt}) e τ=${Number(params.tau).toFixed(2)} diretamente no Rover Pilot 3D`
                : `Launch Θ (${unified.planet.labelEn}) & τ=${Number(params.tau).toFixed(2)} inside Rover Pilot 3D`}
            </div>
            <div className="mono" style={{ fontSize: "0.75rem", color: "var(--ink-soft)", marginTop: "0.18rem" }}>
              {l === "pt"
                ? "Abre o Jogo 3D na missão recomendada com o gráfico de Especialista (L3) e o mesmo vetor físico ativo."
                : "Opens 3D Game directly on the matching mission with Specialist L3 HUD and this exact Θ vector."}
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-primary"
              onClick={() => onLaunchGame(params.recommendedMission || "M5")}
            >
              <Gamepad2 size={16} />
              {l === "pt"
                ? `Simular (${params.recommendedMission || "M5"}) no Rover Pilot 3D ->`
                : `Simulate (${params.recommendedMission || "M5"}) in Rover Pilot 3D ->`}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
