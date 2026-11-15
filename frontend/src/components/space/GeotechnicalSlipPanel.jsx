import React from "react";
import { AlertTriangle, Mountain } from "lucide-react";
import PrecedingExplanation from "./PrecedingExplanation";

/**
 * Active Impulse-Response Inversion (64 m EDL retro-plume) & Geotechnical Wheel-Slip Panel.
 * Compares compact basalt, terrestrial loam, lunar regolith, and eolian sand trap (1.8x Wh/km).
 * Zero hex literals.
 */
export default function GeotechnicalSlipPanel({
  unified,
  terrainProfile,
  slope,
  onChangeTerrainProfile,
  onChangeSlope,
  lang = "en",
}) {
  const l = lang === "pt" ? "pt" : "en";
  const geo = unified.geotechnical;
  const isCritical = geo.energyDistanceMult > 1.3;

  return (
    <section style={{ display: "grid", gap: "0.75rem" }}>
      <PrecedingExplanation
        stepLabel={l === "pt" ? "Bloco 4 · Inversão Geotécnica por Impulso (64 m)" : "Block 4 · Active Impulse-Response Inversion (64 m)"}
        title={
          l === "pt"
            ? "Da pluma dos retrofoguetes ao custo Wh/km do rover (Patinagem na Cratera Alpha)"
            : "From 64 m Descent Plume Inversion to Rover Wh/km Energy Cost"
        }
        badge="τ_jet >= τ_c -> Wh/km"
        tone="--danger"
        lang={l}
        whyItMatters={
          l === "pt"
            ? "Durante o pouso (Ato 1), sabemos exatamente o empuxo aplicado contra o solo a 64 m de altitude. Medindo opticamente quando a poeira começa a levantar (t-1 -> t), resolvemos a coesão crítica τ_c (Pa) da superfície e calibramos mapas de inércia térmica orbital para prever onde as rodas vão patinar."
            : "During terminal descent (Act 1), known thruster pressure probes regolith shear strength. Measuring optical dust-plume onset at ~64 m resolves surface cohesion τ_c (Pa) and calibrates orbital thermal-inertia maps before the rover drives onto loose sand."
        }
        equation={
          <span>
            τ<sub>jet</sub> = ½ · ρ · v² ≥ τ<sub>c</sub>(d<sub>p</sub>) &nbsp;|&nbsp; v<sub>eff</sub> = v<sub>wheel</sub> · (1 − slip%) &nbsp;|&nbsp; E<sub>route</sub> = E<sub>0</sub> · mult(τ<sub>c</sub>)
          </span>
        }
        decisionRule={
          l === "pt"
            ? "Areia eólica não consolidada (τ_c = 24 Pa, grão 120 μm) gera >44% de patinagem e multiplicador energético de 1,8× Wh/km (1 km geométrico consome 1,8 km de bateria). Contornar pelo platô de basalto compacto (τ_c = 85 Pa, 6% slip, 1,0×) preserva a autonomia para o resgate."
            : "Unconsolidated eolian sand (τ_c = 24 Pa, 120 μm grain) induces >44% wheel slip and a 1.8× Wh/km drain multiplier (1 km geometric costs 1.8 km energy). Routing around Crater Alpha over compact basalt (τ_c = 85 Pa, 6% slip, 1.0×) preserves survival headroom."
        }
        glossaryKeys={["impulse_inversion", "wheel_slip"]}
      />

      <div className="card" style={{ borderColor: isCritical ? "var(--danger)" : "var(--hairline)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.95rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Mountain size={18} color={isCritical ? "var(--danger)" : "var(--biome-n)"} aria-hidden="true" />
            <div>
              <div className="stat-label">
                {l === "pt" ? "Matriz Calibrada de Coesão & Patinagem" : "Calibrated Soil Cohesion & Slip Matrix"}
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.98rem", color: "var(--ink)" }}>
                {l === "pt"
                  ? `Solo Ativo: τ_c = ${geo.tauC_Pa} Pa · Grão ${geo.grainSizeUm} μm · Patinagem ${geo.wheelSlipPct}%`
                  : `Active Soil: τ_c = ${geo.tauC_Pa} Pa · Grain ${geo.grainSizeUm} μm · Wheel Slip ${geo.wheelSlipPct}%`}
              </div>
            </div>
          </div>

          <span className={`badge ${isCritical ? "cached" : "live"}`} style={{ color: isCritical ? "var(--danger)" : undefined }}>
            {isCritical && <AlertTriangle size={12} />}
            {geo.energyDistanceMult.toFixed(2)}× Wh/km · {l === "pt" ? `Tração ${(geo.tractionFactor * 100).toFixed(0)}%` : `Traction ${(geo.tractionFactor * 100).toFixed(0)}%`}
          </span>
        </div>

        {/* Interactive surface & slope controls */}
        <div className="grid-2" style={{ gap: "0.85rem", marginBottom: "1rem" }}>
          <div className="card-inset" style={{ display: "grid", gap: "0.45rem" }}>
            <span className="stat-label" style={{ fontSize: "0.7rem" }}>
              {l === "pt" ? "Superfície Amostrada / Rota Escolhida" : "Sampled Surface / Selected Route"}
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {unified.terrainMatrix.map((row) => (
                <button
                  key={row.profileId}
                  type="button"
                  onClick={() => onChangeTerrainProfile(row.profileId)}
                  className={`pill ${terrainProfile === row.profileId ? "active" : ""}`}
                  style={{ fontSize: "0.78rem", padding: "0.36rem 0.72rem" }}
                >
                  {l === "pt" ? row.meta.labelPt.split("(")[0].trim() : row.meta.labelEn.split("(")[0].trim()}
                </button>
              ))}
            </div>
          </div>

          <label className="card-inset" style={{ display: "grid", gap: "0.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="stat-label" style={{ fontSize: "0.7rem" }}>
                {l === "pt" ? "Inclinação do Terreno (Slope)" : "Terrain Slope Ratio"}
              </span>
              <span className="mono" style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink)" }}>
                {Math.round(slope * 100)}% ({slope.toFixed(2)})
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={0.35}
              step={0.01}
              value={slope}
              onChange={(e) => onChangeSlope(Number(e.target.value))}
            />
            <span style={{ fontSize: "0.74rem", color: "var(--ink-soft)" }}>
              {l === "pt"
                ? `Dreno em movimento resultante: ${unified.roverMoveDrainPctSec}% bat/s (inclui g=${unified.planet.g} e ${geo.energyDistanceMult}×)`
                : `Resulting locomotion draw: ${unified.roverMoveDrainPctSec}% bat/s (includes g=${unified.planet.g} & ${geo.energyDistanceMult}×)`}
            </span>
          </label>
        </div>

        {/* Comparison table across all 4 calibration profiles */}
        <div className="raw-table-wrap">
          <table className="raw-table">
            <thead>
              <tr>
                <th>{l === "pt" ? "Perfil Calibrado (64 m)" : "Calibrated Profile (64 m)"}</th>
                <th>τ_c (Pa)</th>
                <th>{l === "pt" ? "Grão d_p" : "Grain d_p"}</th>
                <th>{l === "pt" ? "Patinagem" : "Wheel Slip"}</th>
                <th>{l === "pt" ? "Tração Efetiva" : "Effective Traction"}</th>
                <th>{l === "pt" ? "Multiplicador Wh/km" : "Wh/km Mult"}</th>
              </tr>
            </thead>
            <tbody>
              {unified.terrainMatrix.map((row) => {
                const dangerRow = row.energyDistanceMult > 1.3;
                return (
                  <tr
                    key={row.profileId}
                    onClick={() => onChangeTerrainProfile(row.profileId)}
                    style={{
                      cursor: "pointer",
                      background: row.active ? "var(--surface-2)" : "transparent",
                      fontWeight: row.active ? 700 : 400,
                    }}
                  >
                    <td>
                      <div style={{ color: dangerRow ? "var(--danger)" : "var(--ink)" }}>
                        {l === "pt" ? row.meta.labelPt : row.meta.labelEn}
                        {row.active && (
                          <span className="badge sig" style={{ marginLeft: "0.45rem", fontSize: "0.66rem", padding: "0.1rem 0.45rem" }}>
                            {l === "pt" ? "SELECIONADO" : "SELECTED"}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "0.74rem", color: "var(--ink-soft)", fontWeight: 400 }}>
                        {l === "pt" ? row.meta.sitePt : row.meta.siteEn}
                      </div>
                    </td>
                    <td className="mono">{row.tauC_Pa} Pa</td>
                    <td className="mono">{row.grainSizeUm} μm</td>
                    <td className="mono" style={{ color: dangerRow ? "var(--danger)" : "var(--ink)" }}>
                      {row.wheelSlipPct}%
                    </td>
                    <td className="mono">{row.effectiveSpeedFactorPct}%</td>
                    <td className="mono" style={{ color: dangerRow ? "var(--danger)" : "var(--sig)" }}>
                      {row.energyDistanceMult.toFixed(2)}×
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
