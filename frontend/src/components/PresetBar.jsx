import React from "react";
import { Compass, Droplets, Flame, Sparkles, Sun } from "lucide-react";
import { UI_TEXT } from "../content/i18n";

const ICONS = {
  sun: Sun,
  droplets: Droplets,
  flame: Flame,
  sparkles: Sparkles,
  compass: Compass,
};

/**
 * 5 goal-driven Action Presets allowing laypersons to interrogate NASA datasets
 * by everyday life questions rather than variable codes. Zero hex literals.
 */
export default function PresetBar({
  presets = [],
  activePresetId,
  onSelectPreset,
  lang = "en",
}) {
  const l = lang === "pt" ? "pt" : "en";
  const ui = UI_TEXT[l];

  return (
    <section
      aria-label={ui.presetTitle}
      style={{
        marginBottom: "1rem",
        padding: "1rem 1.15rem",
        background: "var(--surface-1)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-soft)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "0.75rem",
        }}
      >
        <div>
          <div className="stat-label">{ui.presetEyebrow}</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.18rem", lineHeight: 1.25 }}>
            {ui.presetTitle}
          </h2>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(205px, 1fr))",
          gap: "0.6rem",
        }}
      >
        {presets.map((preset) => {
          const Icon = ICONS[preset.iconKey] || Compass;
          const active = preset.id === activePresetId;
          return (
            <button
              key={preset.id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelectPreset(preset)}
              style={{
                textAlign: "left",
                padding: "0.75rem 0.85rem",
                borderRadius: "var(--radius-sm)",
                border: active ? "1.5px solid var(--biome-se)" : "1px solid var(--hairline-strong)",
                background: active ? "var(--surface-2)" : "var(--surface-0)",
                color: "var(--ink)",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                gap: "0.3rem",
                boxShadow: active ? "var(--shadow-soft)" : "none",
                transition: "transform 0.14s ease, border-color 0.14s ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", fontWeight: 700, fontSize: "0.9rem" }}>
                <Icon size={16} color={active ? "var(--biome-se)" : "var(--biome-n)"} aria-hidden="true" />
                <span>{preset.title}</span>
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", lineHeight: 1.38 }}>
                {preset.question}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
