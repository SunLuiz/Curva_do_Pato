import React from "react";
import { Eye, Filter, ShieldAlert } from "lucide-react";
import PrecedingExplanation from "./PrecedingExplanation";

/**
 * NavCam Optical Frame Derivative |I_t - I_{t-1}| & Sentinel 999999999.0 Sanitization Panel.
 * Uses computeFrameDelta() from planetaryPhysics.js identically to M3 Blind Vision.
 * Zero hex literals.
 */
export default function OpticalQualityPanel({
  params,
  unified,
  onChangeParam,
  lang = "en",
}) {
  const l = lang === "pt" ? "pt" : "en";
  const { rawDelta, sanitizedDelta, stillDelta, motionBlurShare, rawSensorValue } = unified.optical;
  const sentinelBlocked = Boolean(params.sentinelActive);

  return (
    <section style={{ display: "grid", gap: "0.75rem" }}>
      <PrecedingExplanation
        stepLabel={l === "pt" ? "Bloco 6 · Filtro Óptico (t−1 -> t) & Qualidade de Dados" : "Block 6 · Frame Delta (t−1 -> t) & Telemetry Hygiene"}
        title={
          l === "pt"
            ? "Separação entre tempestade real, borrão de movimento (ROVER_STILL) e sentinela 999999999.0"
            : "Separating True Dust Plumes, Rover Motion Blur (ROVER_STILL) & 999999999.0 Sentinels"
        }
        badge="MEDA Sol 1100 + Sol 40"
        tone="--roadmap"
        lang={l}
        whyItMatters={
          l === "pt"
            ? "Dados brutos da NASA (MEDA Sol 40) possuem 867 linhas com o valor sentinela 999999999.0 (4,54% da série). Ao mesmo tempo, o movimento do rover mistura borramento mecânico na derivada visual |I_t - I_{t-1}| do MEDA Sol 1100 (ROVER_STILL). Sanitizar sentinelas e estacionar brevemente revela se a poeira atmosférica realmente subiu."
            : "Real Mars 2020 MEDA Sol 40 rows contain 867 fill values flagged as 999999999.0 (4.54% of 19,100 rows). Meanwhile, driving mixes rover motion blur into the optical derivative |I_t - I_{t-1}| (Sol 1100 ROVER_STILL). Sanitizing outliers [4] and pausing movement isolates genuine atmospheric turbidity shifts."
        }
        equation={
          <span>
            ΔI = min(1, env(Δτ) + 0.42 · v<sub>norm</sub>) &nbsp;|&nbsp; v<sub>norm</sub> = 0 (ROVER_STILL) &rArr; ΔI<sub>pure</sub>
          </span>
        }
        decisionRule={
          l === "pt"
            ? "Nunca aborte por um pico 999999999.0 — purgue o sentinela [4]. Se ΔI purificado ultrapassar 0,48 por aumento real de τ, imobilize o rover por 2–3 s para travar referências externas."
            : "Never abort mission on a 999999999.0 sentinel spike — sanitize [4]. When purified ΔI exceeds 0.48 under rising τ, halt briefly (ROVER_STILL = 1) to lock horizon landmarks."
        }
        glossaryKeys={["frame_delta", "sentinel_value"]}
      />

      <div className="card">
        <div className="grid-4" style={{ gap: "0.75rem", marginBottom: "1rem" }}>
          <label className="card-inset" style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>
              τ(t−1): {Number(params.prevTau).toFixed(2)}
            </span>
            <input
              type="range"
              min={0.1}
              max={3.5}
              step={0.05}
              value={params.prevTau}
              onChange={(e) => onChangeParam("prevTau", Number(e.target.value))}
            />
          </label>

          <label className="card-inset" style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>
              τ(t): {Number(params.currTau).toFixed(2)}
            </span>
            <input
              type="range"
              min={0.1}
              max={4.5}
              step={0.05}
              value={params.currTau}
              onChange={(e) => onChangeParam("currTau", Number(e.target.value))}
            />
          </label>

          <label className="card-inset" style={{ display: "grid", gap: "0.3rem" }}>
            <span style={{ fontSize: "0.78rem", fontWeight: 700 }}>
              {params.speedNorm <= 0.01
                ? l === "pt"
                  ? "Velocidade: PARADO (ROVER_STILL=1)"
                  : "Speed: STOPPED (ROVER_STILL=1)"
                : `${l === "pt" ? "Velocidade v_norm" : "Rover Speed"}: ${Math.round(params.speedNorm * 100)}%`}
            </span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={params.speedNorm}
              onChange={(e) => onChangeParam("speedNorm", Number(e.target.value))}
            />
          </label>

          <div className="card-inset" style={{ display: "grid", gap: "0.4rem" }}>
            <span className="stat-label" style={{ fontSize: "0.68rem" }}>
              {l === "pt" ? "Injetar Falha de Telemetria" : "Inject Sensor Outlier"}
            </span>
            <button
              type="button"
              onClick={() => onChangeParam("sentinelActive", !params.sentinelActive)}
              className={sentinelBlocked ? "btn-primary" : "btn-secondary"}
              style={{
                padding: "0.42rem 0.65rem",
                fontSize: "0.77rem",
                background: sentinelBlocked ? "var(--danger)" : undefined,
                borderColor: sentinelBlocked ? "var(--danger)" : undefined,
              }}
            >
              <ShieldAlert size={14} />
              {sentinelBlocked
                ? l === "pt"
                  ? "Sentinela 999999999.0 ATIVO"
                  : "999999999.0 Fault ACTIVE"
                : l === "pt"
                  ? "Injetar 999999999.0"
                  : "Inject 999999999.0"}
            </button>
          </div>
        </div>

        <div className="grid-2" style={{ gap: "0.9rem" }}>
          <div className="card-inset" style={{ borderColor: sentinelBlocked ? "var(--danger)" : "var(--hairline-strong)", background: "var(--surface-0)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="stat-label" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <Eye size={13} color={sentinelBlocked ? "var(--danger)" : "var(--ink-soft)"} />
                {l === "pt" ? "Canal Bruto (Sem Filtro)" : "Raw Sensor Channel (Unsanitized)"}
              </span>
              <span className="mono" style={{ fontSize: "0.75rem", color: sentinelBlocked ? "var(--danger)" : "var(--ink-soft)" }}>
                val = {sentinelBlocked ? "999999999.0" : rawSensorValue.toFixed(2)}
              </span>
            </div>
            <div className="stat-value" style={{ color: rawDelta >= 0.9 ? "var(--danger)" : "var(--ink)" }}>
              ΔI_raw = {rawDelta.toFixed(3)}
            </div>
            <p style={{ fontSize: "0.78rem", color: sentinelBlocked ? "var(--danger)" : "var(--ink-soft)" }}>
              {sentinelBlocked
                ? l === "pt"
                  ? "Sem sanitizador, o erro 999999999.0 satura ΔI em 1.000 e dispara falso alarme de tempestade."
                  : "Without sanitization, 999999999.0 saturates ΔI to 1.000 and triggers a false storm abort."
                : l === "pt"
                  ? `Composto por Δτ ambiental (${stillDelta.toFixed(3)}) + borrão de movimento (+${motionBlurShare.toFixed(3)}).`
                  : `Composed of ambient Δτ (${stillDelta.toFixed(3)}) + motion blur (+${motionBlurShare.toFixed(3)}).`}
            </p>
          </div>

          <div className="card-inset" style={{ borderColor: "var(--sig)", background: "var(--surface-0)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span className="stat-label" style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <Filter size={13} color="var(--sig)" />
                {l === "pt" ? "Canal Purificado MPTO [4]" : "Purified MPTO Optical Filter [4]"}
              </span>
              <span className="badge live" style={{ fontSize: "0.68rem" }}>
                {sentinelBlocked ? (l === "pt" ? "SENTINELA REJEITADO" : "SENTINEL REJECTED") : "NOMINAL"}
              </span>
            </div>
            <div className="stat-value" style={{ color: sanitizedDelta >= 0.48 ? "var(--biome-ne)" : "var(--sig)" }}>
              ΔI_clean = {sanitizedDelta.toFixed(3)}
            </div>
            <p style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
              {l === "pt"
                ? `Sinal limpo sem movimento (ROVER_STILL=1): ${stillDelta.toFixed(3)} · Redução de ruído ao parar: -${motionBlurShare.toFixed(3)}.`
                : `Pure still signal (ROVER_STILL=1): ${stillDelta.toFixed(3)} · Motion-blur drop on halt: -${motionBlurShare.toFixed(3)}.`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
