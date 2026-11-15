import React from "react";
import { Cpu, Network, ShieldAlert, ShieldCheck } from "lucide-react";
import PrecedingExplanation from "./PrecedingExplanation";

/**
 * Block 8: 7-Agent + Statistical Auditor + OMNI Orchestrator fusion view
 * paired with Perseverance/Curiosity VCE FPGA flight hardware architecture.
 * Zero hex literals (strictly CSS custom variables).
 */
export default function AgentOrchestrationPanel({ unified, lang = "en" }) {
  const l = lang === "pt" ? "pt" : "en";
  const orch = unified?.orchestration;
  if (!orch) return null;

  const verdictTone =
    orch.status === "critical"
      ? "var(--danger)"
      : orch.status === "watch"
        ? "var(--biome-ne)"
        : "var(--sig)";

  return (
    <section style={{ display: "grid", gap: "0.75rem" }}>
      <PrecedingExplanation
        stepLabel={l === "pt" ? "Bloco 8 · Orquestração Multiagente & Arquitetura VCE/FPGA" : "Block 8 · Multi-Agent Consensus & VCE/FPGA Flight Stack"}
        title={
          l === "pt"
            ? "Do conflito Gemini Vision × Grok Cratera aos 7 Agentes Físicos + Veto do Auditor"
            : "From Gemini Vision × Grok Cratera to 7 Physical Agents + Non-LLM Statistical Veto"
        }
        badge={l === "pt" ? "RAD750 + VCE FPGA · 7 AGENTES" : "RAD750 + VCE FPGA · 7 AGENTS"}
        tone="--roadmap"
        lang={l}
        whyItMatters={
          l === "pt"
            ? "Fumaça de queimadas no Brasil (NASA FIRMS) e poeira em Marte (NASA MEDA) obedecem à mesma equação Beer-Lambert exp(-0,55τ). Aqui os 7 agentes físicos convertem os parâmetros em votos 0–1 ligados ao hardware real do Perseverance (VCE FPGA Virtex-5QV, estéreo SAD 1/16 px, odometria RANSAC e algoritmo ACE), sob veto rigoroso do Auditor Estatístico."
            : "Wildfire smoke on Earth (NASA FIRMS) and dust storms on Mars (NASA MEDA) obey the exact same Beer-Lambert exp(-0.55τ) attenuation. All 7 physical agents cast 0–1 votes bound to real Perseverance hardware (VCE Virtex-5QV FPGA, 1/16-px SAD stereo, 6-DoF Visual Odometry & ACE), gated by the non-LLM Statistical Auditor."
        }
        decisionRule={l === "pt" ? orch.dispatchPt : orch.dispatchEn}
      />

      <div className="card" style={{ borderLeft: `4px solid ${verdictTone}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.6rem", marginBottom: "0.85rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
            <Network size={18} color={verdictTone} aria-hidden="true" />
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.12rem", margin: 0 }}>
              {l === "pt"
                ? `OMNI Orchestrator · Consenso Ponderado = ${(orch.consensusScore * 100).toFixed(0)}%`
                : `OMNI Orchestrator · Weighted Risk Consensus = ${(orch.consensusScore * 100).toFixed(0)}%`}
            </h3>
          </div>
          <div style={{ display: "flex", gap: "0.45rem", flexWrap: "wrap" }}>
            {orch.activeVetoes.length > 0 ? (
              <span className="badge cached" style={{ color: "var(--danger)", fontWeight: 700 }}>
                <ShieldAlert size={13} />{" "}
                {l === "pt" ? `VETO: ${orch.activeVetoes.join(", ")}` : `VETO: ${orch.activeVetoes.join(", ")}`}
              </span>
            ) : (
              <span className="badge sig">
                <ShieldCheck size={13} /> {l === "pt" ? "SEM VETOS FÍSICOS" : "NO PHYSICAL VETOES"}
              </span>
            )}
          </div>
        </div>

        <div className="grid-2" style={{ gap: "0.7rem" }}>
          {orch.agents.map((a) => {
            const pct = Math.round(a.vote * 100);
            const barColor = a.veto
              ? "var(--danger)"
              : pct >= 60
                ? "var(--biome-ne)"
                : "var(--sig)";
            return (
              <div
                key={a.id}
                className="card-inset"
                style={{
                  background: "var(--surface-0)",
                  borderColor: a.veto ? "var(--danger)" : "var(--hairline)",
                  display: "grid",
                  gap: "0.35rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.4rem" }}>
                  <strong style={{ fontSize: "0.9rem", color: "var(--ink)" }}>
                    #{a.frontierId} · {a.name}
                  </strong>
                  <span className="mono" style={{ fontSize: "0.75rem", fontWeight: 700, color: barColor }}>
                    {a.veto ? "VETO · " : ""}
                    {a.vote.toFixed(2)} ({pct}%)
                  </span>
                </div>

                <div
                  style={{
                    height: "7px",
                    borderRadius: "999px",
                    background: "var(--surface-2)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(4, pct)}%`,
                      height: "100%",
                      background: barColor,
                      transition: "width 0.2s ease",
                    }}
                  />
                </div>

                <div style={{ fontSize: "0.79rem", fontWeight: 600, color: "var(--ink-soft)" }}>
                  {l === "pt" ? a.rolePt : a.roleEn}
                </div>
                <div className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>
                  {l === "pt" ? a.signalPt : a.signalEn} ·{" "}
                  <strong style={{ color: barColor }}>{a.actionKey}</strong>
                </div>
                <div style={{ fontSize: "0.73rem", color: "var(--ink-faint)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                  <Cpu size={12} aria-hidden="true" />
                  <span>{l === "pt" ? a.hardwarePt : a.hardwareEn}</span>
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="card-inset"
          style={{
            marginTop: "0.85rem",
            background: "var(--surface-2)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.5rem",
          }}
        >
          <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--ink)" }}>
            🛡️ {l === "pt" ? orch.auditorRule.namePt : orch.auditorRule.nameEn}
          </span>
          <span className="mono" style={{ fontSize: "0.74rem", color: "var(--ink-soft)" }}>
            {l === "pt" ? orch.auditorRule.statusPt : orch.auditorRule.statusEn}
          </span>
        </div>
      </div>
    </section>
  );
}
