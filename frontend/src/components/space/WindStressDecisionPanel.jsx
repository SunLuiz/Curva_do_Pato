import React from "react";
import { Shield, Wind } from "lucide-react";
import PrecedingExplanation from "./PrecedingExplanation";

/**
 * Aerodynamic wind-stress vs. natural dust-cleaning decision panel using computeWindStress().
 * Compares Earth, Mars, and Moon vacuum side-by-side at the same wind velocity.
 * Zero hex literals.
 */
export default function WindStressDecisionPanel({
  params,
  unified,
  onChangeParam,
  lang = "en",
}) {
  const l = lang === "pt" ? "pt" : "en";
  const statusMap = {
    vacuum: {
      badge: "sig",
      labelPt: "Vácuo Lunar (ρ = 0 · Sem arrasto)",
      labelEn: "Lunar Vacuum (ρ = 0 · Zero drag)",
      tone: "var(--biome-n)",
    },
    danger: {
      badge: "cached",
      labelPt: "PERIGO ESTRUTURAL (Stress >= 1,0)",
      labelEn: "STRUCTURAL DANGER (Stress >= 1.0)",
      tone: "var(--danger)",
    },
    cleaning_window: {
      badge: "live",
      labelPt: "JANELA DE LIMPEZA EÓLICA [3]",
      labelEn: "WIND-CLEANING WINDOW [3]",
      tone: "var(--sig)",
    },
    calm: {
      badge: "sig",
      labelPt: "Envelope Eólico Seguro",
      labelEn: "Safe Wind Envelope",
      tone: "var(--biome-se)",
    },
  };
  const st = statusMap[unified.windStatus] || statusMap.calm;

  return (
    <section style={{ display: "grid", gap: "0.75rem" }}>
      <PrecedingExplanation
        stepLabel={l === "pt" ? "Bloco 5 · Estresse Aerodinâmico & Limpeza Eólica" : "Block 5 · Wind Stress & Dust-Cleaning Window"}
        title={
          l === "pt"
            ? "Por que a rajada de segundos derruba asas em Marte (4,2 m/s), limpa poeira antes e é nula na Lua"
            : "Why Sub-Minute Gusts Snap Wings on Mars (4.2 m/s), Clean Dust Earlier, and Vanish on Moon"
        }
        badge="computeWindStress()"
        tone="--biome-n"
        lang={l}
        whyItMatters={
          l === "pt"
            ? "Na Terra, a série mensal de vento WS2M (p = 0,489) é estatisticamente plana, mas rajadas horárias exigem defesa em segundos. Em Marte (ρ = 0,02 kg/m³, limite 4,2 m/s do Sol 40 MEDA), inclinar as asas em brisas de 2,2–3,5 m/s limpa a poeira; acima do P90/3,8 m/s é preciso abrigar atrás de rochas e recolher mastro e asas."
            : "Monthly WS2M trends are flat (p = 0.489), yet 2 Hz MEDA Sol 40 gusts reach 5.36 m/s. Between 2.2 and 3.5 m/s on Mars, tilted panels scrub dust passively; past P90 (~3.8–4.2 m/s), only terrain shelter + stowed wings + lowered mast keep normalized aerodynamic torque below 1.0."
        }
        equation={
          <span>
            Stress = (v · factor<sub>shelter</sub> / v<sub>max,safe</sub>) · Area<sub>wings</sub> · Area<sub>mast</sub> &nbsp;(&rho; &le; 10⁻⁴ &rArr; 0)
          </span>
        }
        decisionRule={
          l === "pt"
            ? "Mantenha Stress < 1,00: abrigar atrás de rocha reduz vento efetivo para 28%; fechar asas [1] + abaixar mastro [2] reduz a área exposta em ~75%."
            : "Keep Stress < 1.00: leeward rock shelter cuts effective gust speed to 28%; stowing wings [1] and lowering mast [2] slashes aerodynamic cross-section by ~75%."
        }
      />

      <div className="card" style={{ borderColor: unified.windStatus === "danger" ? "var(--danger)" : "var(--hairline)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.75rem", marginBottom: "0.9rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Wind size={18} color={st.tone} aria-hidden="true" />
            <div>
              <div className="stat-label">
                {l === "pt" ? "Índice de Torque Aerodinâmico Normalizado" : "Normalized Aerodynamic Torque Index"}
              </div>
              <div className="mono" style={{ fontSize: "1.15rem", fontWeight: 700, color: st.tone }}>
                windStress = {unified.windStress.toFixed(3)} ({unified.windStress >= 1.0 ? "CRITICAL >= 1.0" : "< 1.0 SAFE"})
              </div>
            </div>
          </div>

          <span className={`badge ${st.badge}`} style={{ color: st.tone }}>
            {l === "pt" ? st.labelPt : st.labelEn}
          </span>
        </div>

        <div className="grid-3" style={{ gap: "0.8rem", marginBottom: "1rem" }}>
          <label className="card-inset" style={{ display: "grid", gap: "0.35rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span className="stat-label" style={{ fontSize: "0.7rem" }}>
                {l === "pt" ? "Velocidade da Rajada v" : "Gust Wind Speed v"}
              </span>
              <span className="mono" style={{ fontWeight: 700, fontSize: "0.84rem" }}>{params.windMs.toFixed(1)} m/s</span>
            </div>
            <input
              type="range"
              min={0}
              max={16}
              step={0.1}
              value={params.windMs}
              onChange={(e) => onChangeParam("windMs", Number(e.target.value))}
            />
            <span style={{ fontSize: "0.73rem", color: "var(--ink-soft)" }}>
              MEDA Sol 40: P90 = 3.22 · P99 = 4.11 · Max = 5.36 m/s
            </span>
          </label>

          <div className="card-inset" style={{ display: "grid", gap: "0.4rem" }}>
            <span className="stat-label" style={{ fontSize: "0.7rem" }}>
              {l === "pt" ? "Mastro Óptico [2]" : "Optical Mast [2]"}
            </span>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                type="button"
                className={`pill ${params.mastRaised ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center", fontSize: "0.76rem" }}
                onClick={() => onChangeParam("mastRaised", true)}
              >
                {l === "pt" ? "Erguido (1,15×)" : "Raised (1.15×)"}
              </button>
              <button
                type="button"
                className={`pill ${!params.mastRaised ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center", fontSize: "0.76rem" }}
                onClick={() => onChangeParam("mastRaised", false)}
              >
                {l === "pt" ? "Abaixado (0,78×)" : "Lowered (0.78×)"}
              </button>
            </div>
          </div>

          <div className="card-inset" style={{ display: "grid", gap: "0.4rem" }}>
            <span className="stat-label" style={{ fontSize: "0.7rem" }}>
              <Shield size={12} style={{ verticalAlign: "middle" }} /> {l === "pt" ? "Abrigo Topográfico (Rocha/Tubo)" : "Terrain Shelter (Rock/Tube)"}
            </span>
            <div style={{ display: "flex", gap: "0.4rem" }}>
              <button
                type="button"
                className={`pill ${!params.inShelter ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center", fontSize: "0.76rem" }}
                onClick={() => onChangeParam("inShelter", false)}
              >
                {l === "pt" ? "Exposto (100%)" : "Exposed (100%)"}
              </button>
              <button
                type="button"
                className={`pill ${params.inShelter ? "active" : ""}`}
                style={{ flex: 1, justifyContent: "center", fontSize: "0.76rem" }}
                onClick={() => onChangeParam("inShelter", true)}
              >
                {l === "pt" ? "Abrigado (28%)" : "Sheltered (28%)"}
              </button>
            </div>
          </div>
        </div>

        {/* Cross-planet comparison at current wind speed & rover stance */}
        <div className="grid-3" style={{ gap: "0.75rem" }}>
          {unified.windComparison.map((item) => {
            const barWidth = Math.min(100, Math.round(item.stress * 80));
            const dangerItem = item.stress >= 1.0;
            return (
              <div key={item.planetId} className="card-inset" style={{ background: "var(--surface-0)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", fontWeight: 700, color: "var(--ink)" }}>
                  <span>{l === "pt" ? item.labelPt.split("·")[0].trim() : item.labelEn.split("·")[0].trim()}</span>
                  <span className="mono" style={{ color: dangerItem ? "var(--danger)" : item.stress === 0 ? "var(--biome-n)" : "var(--sig)" }}>
                    {item.stress.toFixed(3)}
                  </span>
                </div>
                <div
                  style={{
                    height: "8px",
                    borderRadius: "var(--radius-pill)",
                    background: "var(--hairline)",
                    overflow: "hidden",
                    marginTop: "0.45rem",
                    marginBottom: "0.35rem",
                  }}
                >
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: "100%",
                      background: dangerItem ? "var(--danger)" : "var(--biome-se)",
                      transition: "width 0.16s ease",
                    }}
                  />
                </div>
                <div className="mono" style={{ fontSize: "0.71rem", color: "var(--ink-soft)" }}>
                  ρ={item.rho} kg/m³ · {item.rho <= 0.0001 ? "vacuum" : `safe <=${item.maxSafeWindMs} m/s`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
