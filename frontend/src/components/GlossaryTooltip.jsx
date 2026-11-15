import React, { useId, useState } from "react";
import { HelpCircle } from "lucide-react";
import { GLOSSARY } from "../content/glossary";

/**
 * Accessible inline glossary trigger + floating explanation card.
 * Uses CSS design tokens exclusively (zero hex literals).
 */
export default function GlossaryTooltip({ termKey, lang = "en", children }) {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const l = lang === "pt" ? "pt" : "en";
  const entry = GLOSSARY[termKey]?.[l] || GLOSSARY[termKey]?.en;

  if (!entry) {
    return <span>{children || termKey}</span>;
  }

  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: "0.2rem" }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        onBlur={() => setOpen(false)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.22rem",
          background: "transparent",
          border: "none",
          borderBottom: "1px dashed var(--biome-n)",
          color: "inherit",
          font: "inherit",
          cursor: "help",
          padding: "0 0.08rem",
        }}
      >
        <span>{children || entry.term}</span>
        <HelpCircle size={13} color="var(--biome-n)" aria-hidden="true" />
      </button>

      {open && (
        <span
          id={tipId}
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 8px)",
            left: 0,
            zIndex: 60,
            width: "min(300px, 76vw)",
            padding: "0.75rem 0.85rem",
            background: "var(--surface-1)",
            color: "var(--ink)",
            border: "1px solid var(--hairline-strong)",
            borderRadius: "var(--radius-sm)",
            boxShadow: "var(--shadow-lift)",
            fontSize: "0.8rem",
            lineHeight: 1.45,
            textAlign: "left",
            fontWeight: 400,
          }}
        >
          <strong style={{ display: "block", color: "var(--biome-n)", marginBottom: "0.2rem" }}>
            {entry.term}
          </strong>
          <span style={{ display: "block", fontWeight: 600, marginBottom: "0.25rem" }}>
            {entry.short}
          </span>
          <span style={{ display: "block", color: "var(--ink-soft)" }}>{entry.detail}</span>
        </span>
      )}
    </span>
  );
}
