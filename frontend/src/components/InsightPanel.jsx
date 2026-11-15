import React from "react";
import { AlertOctagon, AlertTriangle, CheckCircle2, Eye, SlidersHorizontal } from "lucide-react";
import GlossaryTooltip from "./GlossaryTooltip";
import { UI_TEXT } from "../content/i18n";

const SEVERITY_STYLE = {
  red: {
    Icon: AlertOctagon,
    accent: "var(--danger)",
    tint: "rgba(178, 58, 42, 0.08)",
    border: "rgba(178, 58, 42, 0.38)",
  },
  amber: {
    Icon: AlertTriangle,
    accent: "var(--biome-ne)",
    tint: "rgba(143, 93, 21, 0.08)",
    border: "rgba(143, 93, 21, 0.38)",
  },
  green: {
    Icon: CheckCircle2,
    accent: "var(--sig)",
    tint: "rgba(42, 112, 71, 0.08)",
    border: "rgba(42, 112, 71, 0.35)",
  },
};

/**
 * Plain-language traffic-light briefing card translating deterministic stats
 * into citizen-understandable headlines, recommended actions, and clickable indicators.
 */
export default function InsightPanel({
  insight,
  activeVariable,
  onSelectVariable,
  simpleMode = true,
  onToggleSimpleMode,
  lang = "en",
}) {
  if (!insight) return null;

  const l = lang === "pt" ? "pt" : "en";
  const ui = UI_TEXT[l];
  const cfg = SEVERITY_STYLE[insight.severity] || SEVERITY_STYLE.green;
  const SevIcon = cfg.Icon;
  const sevLabel = ui.severityLabels[insight.severity] || ui.severityLabels.green;

  return (
    <section
      aria-label={insight.title}
      style={{
        marginBottom: "1.15rem",
        padding: "1.1rem 1.25rem",
        borderRadius: "var(--radius-md)",
        background: cfg.tint,
        border: `1.5px solid ${cfg.border}`,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.65rem",
          marginBottom: "0.65rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
          <span
            className="badge"
            style={{
              background: "var(--surface-1)",
              borderColor: cfg.border,
              color: cfg.accent,
              fontWeight: 800,
              gap: "0.35rem",
            }}
          >
            <SevIcon size={14} aria-hidden="true" />
            {sevLabel}
          </span>
          <strong style={{ fontSize: "0.95rem", color: "var(--ink)" }}>{insight.title}</strong>
        </div>

        <button
          type="button"
          className="pill"
          onClick={onToggleSimpleMode}
          aria-pressed={!simpleMode}
          style={{ fontSize: "0.78rem", background: "var(--surface-1)" }}
        >
          {simpleMode ? <SlidersHorizontal size={13} /> : <Eye size={13} />}
          {simpleMode ? ui.modeTechnical : ui.modeSimple}
        </button>
      </div>

      <p style={{ fontSize: "1.03rem", fontWeight: 700, color: "var(--ink)", lineHeight: 1.42 }}>
        {insight.headline}
      </p>
      <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", marginTop: "0.35rem", lineHeight: 1.5 }}>
        {insight.action}
      </p>

      {/* Inline zero-jargon interactive glossary strip */}
      <div
        style={{
          marginTop: "0.65rem",
          display: "flex",
          flexWrap: "wrap",
          gap: "0.65rem",
          alignItems: "center",
          fontSize: "0.78rem",
          color: "var(--ink-soft)",
        }}
      >
        <span style={{ fontWeight: 700 }}>
          {l === "pt" ? "Entenda os termos:" : "Hover/click terms:"}
        </span>
        <GlossaryTooltip termKey="mann-kendall" lang={l}>
          Seasonal Mann-Kendall
        </GlossaryTooltip>
        <GlossaryTooltip termKey="theil-sen" lang={l}>
          Theil-Sen
        </GlossaryTooltip>
        <GlossaryTooltip termKey="p-value" lang={l}>
          p-value
        </GlossaryTooltip>
        <GlossaryTooltip termKey="cloud_atten" lang={l}>
          {l === "pt" ? "Atenuação por Nuvens" : "Cloud Attenuation"}
        </GlossaryTooltip>
      </div>

      {/* Live extra telemetry pills when applicable */}
      {(insight.extras?.fires || insight.extras?.spaceWeather) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.75rem" }}>
          {insight.extras?.fires && (
            <span className="badge" style={{ background: "var(--surface-1)", color: "var(--ink)" }}>
              VIIRS 24h ({l === "pt" ? "raio 150 km" : "150 km radius"}):{" "}
              <strong>{insight.extras.fires.nearby150km}</strong> · Brazil total:{" "}
              {insight.extras.fires.brazil24h}
            </span>
          )}
          {insight.extras?.spaceWeather && (
            <span className="badge" style={{ background: "var(--surface-1)", color: "var(--ink)" }}>
              NASA DONKI 7d alerts: <strong>{insight.extras.spaceWeather.alerts7d}</strong>
            </span>
          )}
        </div>
      )}

      {/* Clickable supporting indicators */}
      {insight.indicators?.length > 0 && (
        <div style={{ marginTop: "0.85rem" }}>
          <div className="stat-label" style={{ marginBottom: "0.45rem" }}>
            {ui.indicatorsLabel}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(225px, 1fr))",
              gap: "0.6rem",
            }}
          >
            {insight.indicators.map((ind) => {
              const indStyle = SEVERITY_STYLE[ind.severity] || SEVERITY_STYLE.green;
              const IndIcon = indStyle.Icon;
              const selected = ind.variable === activeVariable;
              return (
                <button
                  key={ind.variable}
                  type="button"
                  onClick={() => onSelectVariable?.(ind.variable)}
                  style={{
                    textAlign: "left",
                    padding: "0.7rem 0.85rem",
                    borderRadius: "var(--radius-sm)",
                    background: "var(--surface-1)",
                    border: selected
                      ? "1.8px solid var(--biome-n)"
                      : "1px solid var(--hairline-strong)",
                    color: "var(--ink)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.28rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: "0.4rem",
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: "0.86rem" }}>
                      {ind.humanName}
                    </span>
                    <IndIcon size={14} color={indStyle.accent} aria-hidden="true" />
                  </div>

                  <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", lineHeight: 1.42 }}>
                    {ind.sentence}
                  </div>

                  {!simpleMode && (
                    <div className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-faint)", marginTop: "0.15rem" }}>
                      {ind.variable} · slope {ind.slopePerDecade}/dec · p = {ind.pValue}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
