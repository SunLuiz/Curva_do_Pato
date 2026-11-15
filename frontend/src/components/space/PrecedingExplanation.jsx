import React from "react";
import { BookOpen, Compass } from "lucide-react";
import GlossaryTooltip from "../GlossaryTooltip";

/**
 * Preceding scientific & decision-rule explanation card placed immediately BEFORE
 * each telemetry panel, physics equation, or interactive chart in SpaceAnalogTab.
 * Uses CSS design tokens exclusively (zero hex literals).
 */
export default function PrecedingExplanation({
  stepLabel,
  title,
  badge,
  whyItMatters,
  equationLabel,
  equation,
  decisionRule,
  glossaryKeys = [],
  tone = "--biome-n",
  lang = "en",
}) {
  const l = lang === "pt" ? "pt" : "en";
  const accentVar = `var(${tone})`;

  return (
    <div
      className="card"
      style={{
        background: "var(--surface-1)",
        borderLeft: `4px solid ${accentVar}`,
        padding: "1rem 1.2rem",
        display: "grid",
        gap: "0.6rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.45rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
          <BookOpen size={15} color={accentVar} aria-hidden="true" />
          {stepLabel && (
            <span className="mono" style={{ fontSize: "0.73rem", fontWeight: 700, color: accentVar, textTransform: "uppercase" }}>
              {stepLabel}
            </span>
          )}
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.06rem", color: "var(--ink)" }}>
            {title}
          </h3>
        </div>
        {badge && (
          <span className="badge sig" style={{ fontSize: "0.7rem" }}>
            {badge}
          </span>
        )}
      </div>

      <p style={{ fontSize: "0.86rem", color: "var(--ink-soft)", lineHeight: 1.52, maxWidth: "84ch" }}>
        {whyItMatters}
      </p>

      {(equation || decisionRule) && (
        <div className="grid-2" style={{ gap: "0.75rem" }}>
          {equation && (
            <div className="card-inset" style={{ background: "var(--surface-0)", padding: "0.65rem 0.85rem" }}>
              <div className="stat-label" style={{ fontSize: "0.68rem", marginBottom: "0.22rem" }}>
                {equationLabel || (l === "pt" ? "Equação Física (Motor Único)" : "Physical Law (Single Engine)")}
              </div>
              <div className="mono" style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--ink)", lineHeight: 1.45 }}>
                {equation}
              </div>
            </div>
          )}

          {decisionRule && (
            <div className="card-inset" style={{ background: "var(--surface-0)", padding: "0.65rem 0.85rem" }}>
              <div className="stat-label" style={{ fontSize: "0.68rem", marginBottom: "0.22rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                <Compass size={12} color={accentVar} aria-hidden="true" />
                {l === "pt" ? "Regra Operacional de Decisão" : "Operational Decision Rule"}
              </div>
              <div style={{ fontSize: "0.81rem", color: "var(--ink)", lineHeight: 1.45 }}>
                {decisionRule}
              </div>
            </div>
          )}
        </div>
      )}

      {glossaryKeys.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.55rem", fontSize: "0.78rem", color: "var(--ink-soft)" }}>
          <span className="mono" style={{ fontSize: "0.72rem", fontWeight: 700 }}>
            {l === "pt" ? "Termos-chave:" : "Key terms:"}
          </span>
          {glossaryKeys.map((key) => (
            <GlossaryTooltip key={key} termKey={key} lang={l} />
          ))}
        </div>
      )}
    </div>
  );
}
