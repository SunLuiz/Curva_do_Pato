import React from "react";
import { Globe, RotateCcw } from "lucide-react";
import { PLANET_LIST } from "../../engine/mptoEngine";
import PrecedingExplanation from "./PrecedingExplanation";

/**
 * Planet/Corridor selector for the Planetary Context Vector Θ = [g, ρ, Cp, k_reg, τ₀, IR].
 * Connects Earth Brazil climate corridors (Petrolina, Campinas, Manaus), Mars Jezero, and Moon Artemis
 * under the exact same physics engine. Zero hex literals.
 */
export default function PlanetaryVectorSelector({
  activePlanetId,
  onSelectPlanet,
  onResetNominal,
  lang = "en",
}) {
  const l = lang === "pt" ? "pt" : "en";

  return (
    <section style={{ display: "grid", gap: "0.75rem" }}>
      <PrecedingExplanation
        stepLabel={l === "pt" ? "Bloco 2 · Vetor Planetário Θ" : "Block 2 · Planetary Vector Θ"}
        title={
          l === "pt"
            ? "Por que Terra, Marte e Lua usam a mesma equação sem 'if planeta'?"
            : "Why Earth, Mars & Moon Share One Equation Without Planet Special-Cases"
        }
        badge="Θ = [g, ρ, Cp, k_reg, τ₀, IR%]"
        tone="--biome-se"
        lang={l}
        whyItMatters={
          l === "pt"
            ? "Segundo a tese 'O Planeta Respira', o comportamento energético e estrutural de um sistema muda apenas porque mudam os 6 parâmetros ambientais de contorno do vetor Θ. Selecionar o corpo abaixo injeta suas constantes reais no motor único de planetaryPhysics.js — idêntico ao simulador Rover Pilot 3D."
            : "Under 'The Planet Breathes', energy yield, radiative cooling, aerodynamic drag, and traction change purely through the 6 boundary constants in vector Θ. Selecting a body below injects its constants into the shared planetaryPhysics.js engine used identically by Rover Pilot 3D."
        }
        equation={
          <span>
            Θ = [ g (m/s²), ρ (kg/m³), C<sub>p</sub> (kJ/kg·K), k<sub>reg</sub> (W/m·K), τ<sub>0</sub>, IR (%) ]
          </span>
        }
        decisionRule={
          l === "pt"
            ? "Na Lua (ρ = 0), o vento nunca derruba o mastro, mas a poeira seca (k=0,02) e o eclipse de 35% tornam o Albedo IR (+13%) crítico. Em Marte (ρ = 0,02), o teto eólico seguro cai para 4,2 m/s e a profundidade óptica τ domina a Curva do Pato."
            : "On the Moon (ρ = 0), aerodynamic drag vanishes, making dry regolith insulation and +13% crater IR recovery decisive during eclipses. On Mars (ρ = 0.02), structural wind caps drop to 4.2 m/s and dust τ governs Duck Curve attenuation."
        }
        glossaryKeys={["tau", "k_reg", "mpto"]}
      />

      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.6rem", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <Globe size={17} color="var(--biome-se)" aria-hidden="true" />
            <strong style={{ fontSize: "0.96rem", color: "var(--ink)" }}>
              {l === "pt"
                ? "Selecione o Corpo / Corredor Climático Ativo"
                : "Select Active Planetary Body / Analog Corridor"}
            </strong>
          </div>
          <button type="button" className="btn-secondary" style={{ padding: "0.42rem 0.85rem", fontSize: "0.8rem" }} onClick={onResetNominal}>
            <RotateCcw size={14} />
            {l === "pt" ? "Restaurar nominais de Θ" : "Reset to nominal Θ"}
          </button>
        </div>

        <div className="grid-3" style={{ gap: "0.75rem" }}>
          {PLANET_LIST.map((pl) => {
            const selected = pl.id === activePlanetId;
            const bodyTag =
              pl.body === "Mars"
                ? l === "pt"
                  ? "MARTE · MEDA"
                  : "MARS · MEDA"
                : pl.body === "Moon"
                  ? l === "pt"
                    ? "LUA · ARTEMIS"
                    : "MOON · ARTEMIS"
                  : l === "pt"
                    ? "TERRA · BRASIL"
                    : "EARTH · BRAZIL";

            return (
              <button
                key={pl.id}
                type="button"
                onClick={() => onSelectPlanet(pl.id)}
                aria-pressed={selected}
                style={{
                  textAlign: "left",
                  padding: "0.85rem 0.95rem",
                  borderRadius: "var(--radius-sm)",
                  border: selected ? "2px solid var(--biome-se)" : "1px solid var(--hairline-strong)",
                  background: selected ? "var(--surface-2)" : "var(--surface-0)",
                  cursor: "pointer",
                  display: "grid",
                  gap: "0.38rem",
                  transition: "border-color 0.14s ease, background-color 0.14s ease",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.4rem" }}>
                  <span className="mono" style={{ fontSize: "0.7rem", fontWeight: 700, color: selected ? "var(--biome-se)" : "var(--biome-n)" }}>
                    {bodyTag}
                  </span>
                  {selected && (
                    <span className="badge live" style={{ fontSize: "0.68rem", padding: "0.14rem 0.5rem" }}>
                      {l === "pt" ? "ATIVO" : "ACTIVE"}
                    </span>
                  )}
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--ink)" }}>
                  {l === "pt" ? pl.labelPt : pl.labelEn}
                </div>
                <div className="mono" style={{ fontSize: "0.73rem", color: "var(--ink-soft)", lineHeight: 1.45 }}>
                  g={pl.g} m/s² · ρ={pl.rho} kg/m³ · τ₀={pl.baseTau}
                  <br />
                  {pl.rho <= 0.0001
                    ? l === "pt"
                      ? `IR +${Math.round(pl.albedoIrGain * 100)}% · vácuo`
                      : `IR +${Math.round(pl.albedoIrGain * 100)}% · vacuum`
                    : l === "pt"
                      ? `Vento máx ${pl.maxSafeWindMs} m/s · IR +${Math.round(pl.albedoIrGain * 100)}%`
                      : `Safe wind <=${pl.maxSafeWindMs} m/s · IR +${Math.round(pl.albedoIrGain * 100)}%`}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
