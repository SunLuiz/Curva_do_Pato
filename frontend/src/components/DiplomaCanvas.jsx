import React, { useEffect, useRef } from "react";
import { Download } from "lucide-react";

/**
 * Renders a 1200x800 PNG diploma on an HTML5 <canvas> using live CSS design
 * tokens resolved from getComputedStyle (keeping zero hex constants in JSX).
 */
export default function DiplomaCanvas({ profile }) {
  const canvasRef = useRef(null);
  const masteredModules = Object.entries(profile.mastery || {})
    .filter(([, m]) => m?.passed)
    .map(([id]) => id)
    .sort();
  const fullMastery = masteredModules.length === 5;
  const eligible = masteredModules.length >= 1 && Boolean(profile.name?.trim());

  const drawDiploma = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cs = getComputedStyle(document.documentElement);
    const tok = (name) => cs.getPropertyValue(name).trim();

    const bgPaper = tok("--surface-0");
    const bgCard = tok("--surface-1");
    const ink = tok("--ink");
    const inkSoft = tok("--ink-soft");
    const accent = tok("--biome-se");
    const gold = tok("--biome-ne");
    const hairline = tok("--hairline-strong");

    const w = 1200;
    const h = 800;

    // Parchment frame
    ctx.fillStyle = bgPaper;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = bgCard;
    ctx.fillRect(42, 42, w - 84, h - 84);

    ctx.strokeStyle = hairline;
    ctx.lineWidth = 2;
    ctx.strokeRect(42, 42, w - 84, h - 84);

    ctx.strokeStyle = accent;
    ctx.lineWidth = 4;
    ctx.strokeRect(58, 58, w - 116, h - 116);

    // Subtle rising curve watermark across lower band
    ctx.save();
    ctx.strokeStyle = accent;
    ctx.globalAlpha = 0.14;
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.moveTo(90, 620);
    ctx.bezierCurveTo(320, 610, 560, 560, 820, 470);
    ctx.quadraticCurveTo(980, 415, 1110, 310);
    ctx.stroke();
    ctx.restore();

    // Header
    ctx.fillStyle = accent;
    ctx.font = "700 18px 'JetBrains Mono', monospace";
    ctx.fillText("COCKPIT-OMNI · CURVA DO PATO · NASA SPACE APPS CHALLENGE 2026", 96, 128);

    ctx.fillStyle = ink;
    ctx.font = "700 54px 'Fraunces', Georgia, serif";
    ctx.fillText(
      fullMastery ? "Chief Earth System Trend Detective" : "Earth System Field Certificate",
      96,
      202
    );

    ctx.fillStyle = inkSoft;
    ctx.font = "400 22px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("THIS FIELD RECORD CONFIRMS STATISTICAL MASTERY VERIFIED WITHOUT HINTS BY", 96, 266);

    // Recipient name
    ctx.fillStyle = ink;
    ctx.font = "700 58px 'Fraunces', Georgia, serif";
    ctx.fillText(profile.name || "Unnamed Detective", 96, 344);

    ctx.strokeStyle = hairline;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(96, 366);
    ctx.lineTo(760, 366);
    ctx.stroke();

    // Stats block
    ctx.fillStyle = inkSoft;
    ctx.font = "500 22px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(
      `Track: ${profile.depth.toUpperCase()}  ·  Modules Mastered: ${masteredModules.join(", ") || "None yet"} (${masteredModules.length}/5)`,
      96,
      424
    );
    ctx.fillText(
      `Earned Stars: ${profile.stars || 0}  ·  XP: ${profile.xp || 0}  ·  Issued: ${new Date().toISOString().slice(0, 10)} (UTC)`,
      96,
      464
    );

    // Methodology seal (+0.409 C/decade signature)
    ctx.save();
    ctx.translate(985, 315);
    ctx.beginPath();
    ctx.arc(0, 0, 108, 0, Math.PI * 2);
    ctx.fillStyle = bgPaper;
    ctx.fill();
    ctx.lineWidth = 5;
    ctx.strokeStyle = fullMastery ? accent : gold;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(0, 0, 94, 0, Math.PI * 2);
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = accent;
    ctx.font = "700 26px 'JetBrains Mono', monospace";
    ctx.fillText("+0.409 °C", 0, -16);
    ctx.font = "700 17px 'JetBrains Mono', monospace";
    ctx.fillText("PER DECADE", 0, 12);
    ctx.fillStyle = inkSoft;
    ctx.font = "600 13px 'DM Sans', sans-serif";
    ctx.fillText("CAMPINAS 95% CI", 0, 40);
    ctx.fillText("[0.333, 0.489] · p<1e-16", 0, 60);
    ctx.restore();

    // Footer pledge
    ctx.fillStyle = ink;
    ctx.font = "600 20px 'DM Sans', system-ui, sans-serif";
    ctx.fillText("Scientific Honesty Pledge:", 96, 626);
    ctx.fillStyle = inkSoft;
    ctx.font = "400 19px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(
      "Significance before narrative · Seasonal Mann-Kendall + Deseasonalized Theil-Sen · Explicit null bounds.",
      96,
      660
    );
    ctx.font = "400 15px 'JetBrains Mono', monospace";
    ctx.fillText(
      "Device-local credential generated on client canvas · Sources: NASA POWER (1984-2025), VIIRS FIRMS, DONKI, CMR MCP.",
      96,
      708
    );
  };

  useEffect(() => {
    drawDiploma();
  }, [profile.name, profile.depth, profile.stars, profile.xp, masteredModules.join(",")]);

  const handleDownload = () => {
    drawDiploma();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    const safeName = (profile.name || "detective").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
    a.href = url;
    a.download = `curva-do-pato-diploma-${safeName}.png`;
    a.click();
  };

  return (
    <div className="card">
      <div className="section-header" style={{ marginBottom: "0.75rem" }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-display)" }}>
            1200×800 PNG Field Diploma
          </h3>
          <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
            {fullMastery
              ? "All 5 modules mastered — Chief Detective seal unlocked!"
              : "Master at least 1 module (with your codename set) to unlock preview & PNG export; pass all 5 for the Chief Detective seal."}
          </div>
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={!eligible}
          onClick={handleDownload}
        >
          <Download size={15} /> Download PNG diploma
        </button>
      </div>

      <canvas
        ref={canvasRef}
        width={1200}
        height={800}
        style={{
          width: "100%",
          height: "auto",
          borderRadius: "var(--radius-sm)",
          border: "1px solid var(--hairline)",
          display: "block",
          opacity: eligible ? 1 : 0.65,
        }}
      />
    </div>
  );
}
