import React, { useState } from "react";
import { FlaskConical, Play, Shuffle } from "lucide-react";
import { MISSION_DEFS, MISSION_ORDER } from "../missions/missionParams";
import { PLANETS } from "../sim/planetaryPhysics";
import { DEPTH_TRACKS } from "../../academy/xp";

export default function MissionLabPanel({ lang = "en", initialDepth = "explorer", onLaunch }) {
  const l = lang === "pt" ? "pt" : "en";
  const [missionId, setMissionId] = useState("M2");
  const [planetId, setPlanetId] = useState("mars_jezero");
  const [depth, setDepth] = useState(initialDepth);
  const [severity, setSeverity] = useState("P90");
  const [dropoutRate, setDropoutRate] = useState(0.05);
  const [seed, setSeed] = useState(2026);

  const selectedPlanet = PLANETS[planetId] || PLANETS.mars_jezero;

  return (
    <section className="card" style={{ borderLeft: "4px solid var(--roadmap)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <FlaskConical size={18} color="var(--roadmap)" />
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem" }}>
            {l === "pt" ? "Mission Lab · Simulador Paramétrico Livre" : "Mission Lab · Custom Difficulty & Physics"}
          </h3>
        </div>
        <span className="badge roadmap">Θ = [g, ρ, Cp, τ]</span>
      </div>

      <p style={{ fontSize: "0.86rem", color: "var(--ink-soft)", marginTop: "0.35rem", marginBottom: "1rem" }}>
        {l === "pt"
          ? "Escolha cenário, gravidade/atmosfera (Vetor Θ), nível de leitura estatística, severidade real (P50/P90/P99) e falhas de sensor para comparar suas decisões contra a resolução ótima."
          : "Customize scenario, planetary vector Θ (gravity/atmosphere), statistical depth, real percentile severity (P50/P90/P99), and sensor dropout rate to stress-test decisions against the Optimal Oracle."}
      </p>

      <div className="grid grid-3" style={{ gap: "0.8rem" }}>
        <div>
          <label className="mono" style={{ fontSize: "0.73rem", color: "var(--ink-soft)", display: "block", marginBottom: "0.3rem" }}>
            {l === "pt" ? "MISSÃO BASE" : "BASE MISSION"}
          </label>
          <select
            className="btn-secondary"
            style={{ width: "100%", borderRadius: "var(--radius-sm)" }}
            value={missionId}
            onChange={(e) => {
              const id = e.target.value;
              setMissionId(id);
              setPlanetId(MISSION_DEFS[id].defaultPlanet);
            }}
          >
            {MISSION_ORDER.map((id) => (
              <option key={id} value={id}>
                {MISSION_DEFS[id][l].title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mono" style={{ fontSize: "0.73rem", color: "var(--ink-soft)", display: "block", marginBottom: "0.3rem" }}>
            {l === "pt" ? "VETOR PLANETÁRIO Θ" : "PLANETARY VECTOR Θ"}
          </label>
          <select
            className="btn-secondary"
            style={{ width: "100%", borderRadius: "var(--radius-sm)" }}
            value={planetId}
            onChange={(e) => setPlanetId(e.target.value)}
          >
            {Object.values(PLANETS).map((pl) => (
              <option key={pl.id} value={pl.id}>
                {l === "pt" ? pl.labelPt : pl.labelEn} (g={pl.g})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mono" style={{ fontSize: "0.73rem", color: "var(--ink-soft)", display: "block", marginBottom: "0.3rem" }}>
            {l === "pt" ? "NÍVEL ESTATÍSTICO (GRÁFICO)" : "STATISTICAL DEPTH (CHART)"}
          </label>
          <select
            className="btn-secondary"
            style={{ width: "100%", borderRadius: "var(--radius-sm)" }}
            value={depth}
            onChange={(e) => setDepth(e.target.value)}
          >
            {DEPTH_TRACKS.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.label} — {tr.id === "explorer" ? "L1" : tr.id === "analyst" ? "L2 P90 Band" : "L3 Multi-Curve"}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mono" style={{ fontSize: "0.73rem", color: "var(--ink-soft)", display: "block", marginBottom: "0.3rem" }}>
            {l === "pt" ? "SEVERIDADE DO EVENTO" : "EVENT SEVERITY"}
          </label>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {["P50", "P90", "P99"].map((sev) => (
              <button
                key={sev}
                type="button"
                className={severity === sev ? "btn-primary" : "btn-secondary"}
                style={{ flex: 1, padding: "0.45rem 0.5rem" }}
                onClick={() => setSeverity(sev)}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mono" style={{ fontSize: "0.73rem", color: "var(--ink-soft)", display: "block", marginBottom: "0.3rem" }}>
            {l === "pt" ? "FALHAS DE SENSOR (999999999.0)" : "SENSOR DROPOUT (999999999.0)"}
          </label>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            {[0, 0.05, 0.15].map((rate) => (
              <button
                key={rate}
                type="button"
                className={dropoutRate === rate ? "btn-primary" : "btn-secondary"}
                style={{ flex: 1, padding: "0.45rem 0.5rem" }}
                onClick={() => setDropoutRate(rate)}
              >
                {Math.round(rate * 100)}%
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mono" style={{ fontSize: "0.73rem", color: "var(--ink-soft)", display: "block", marginBottom: "0.3rem" }}>
            {l === "pt" ? "SEMENTE REPRODUTÍVEL (SEED)" : "REPRODUCIBLE SEED"}
          </label>
          <div style={{ display: "flex", gap: "0.35rem" }}>
            <input
              type="number"
              className="btn-secondary mono"
              style={{ width: "100%", borderRadius: "var(--radius-sm)", padding: "0.45rem 0.6rem" }}
              value={seed}
              onChange={(e) => setSeed(Number(e.target.value) || 1)}
            />
            <button
              type="button"
              className="btn-secondary"
              style={{ padding: "0.45rem 0.65rem" }}
              onClick={() => setSeed(Math.floor(1000 + Math.random() * 8999))}
              aria-label="Randomize seed"
            >
              <Shuffle size={15} />
            </button>
          </div>
        </div>
      </div>

      <div className="card-inset" style={{ marginTop: "0.9rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem" }}>
        <div className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
          Θ = [g={selectedPlanet.g} m/s², ρ={selectedPlanet.rho} kg/m³, Cp={selectedPlanet.cpDust}, τ₀={selectedPlanet.baseTau}, IR=+{Math.round(selectedPlanet.albedoIrGain * 100)}%]
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            onLaunch({
              missionId,
              planetId,
              depth,
              severity,
              dropoutRate,
              seed,
            })
          }
        >
          <Play size={15} /> {l === "pt" ? "Iniciar Missão Customizada" : "Launch Custom Run"}
        </button>
      </div>
    </section>
  );
}
