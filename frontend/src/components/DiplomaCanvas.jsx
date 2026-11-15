import React, { useEffect, useRef } from "react";
import { CheckCircle2, Download, Lock } from "lucide-react";

const MISSION_IDS = ["M1", "M2", "M3", "M4", "M5"];

/**
 * Renders a 1200x800 PNG diploma on an HTML5 <canvas> using live CSS design
 * tokens resolved from getComputedStyle (keeping zero hex constants in JSX).
 * Unlocked strictly when both 3D Mission Objectives and Scientific Quiz Forms are completed.
 */
export default function DiplomaCanvas({ profile, lang = "en" }) {
  const l = lang === "pt" ? "pt" : "en";
  const canvasRef = useRef(null);
  const wonMissions = MISSION_IDS.filter((id) => Boolean(profile.game?.missions?.[id]?.won));
  const masteredModules = MISSION_IDS.filter((id) => Boolean(profile.mastery?.[id]?.passed));
  const fullMastery = wonMissions.length === 5 && masteredModules.length === 5;
  const hasName = Boolean(profile.name?.trim());
  const eligible = fullMastery && hasName;

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
    ctx.fillText("COCKPIT-OMNI · CURVE OF DUCK · NASA SPACE APPS CHALLENGE 2026", 96, 128);

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
    ctx.font = "500 21px 'DM Sans', system-ui, sans-serif";
    ctx.fillText(
      `Track: ${(profile.depth || "explorer").toUpperCase()}  ·  3D Missions Won: ${wonMissions.length}/5  ·  Quiz Forms Passed: ${masteredModules.length}/5`,
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
  }, [profile.name, profile.depth, profile.stars, profile.xp, wonMissions.join(","), masteredModules.join(",")]);

  const handleDownload = () => {
    if (!eligible) return;
    drawDiploma();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    const safeName = (profile.name || "detective").toLowerCase().replace(/[^a-z0-9_-]+/g, "-");
    a.href = url;
    a.download = `curve-of-duck-diploma-${safeName}.png`;
    a.click();
  };

  return (
    <div className="card">
      <div className="section-header" style={{ marginBottom: "0.75rem" }}>
        <div>
          <h3 style={{ fontFamily: "var(--font-display)" }}>
            {l === "pt" ? "Certificado Oficial de Campo & Ciência (1200×800 PNG)" : "Official 3D Field & Science Diploma (1200×800 PNG)"}
          </h3>
          <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
            {eligible
              ? l === "pt"
                ? "Todos os 5 objetivos 3D e os 5 formulários científicos foram concluídos — Certificado liberado!"
                : "All 5 3D mission objectives and all 5 scientific forms completed — Certificate unlocked!"
              : l === "pt"
              ? "O certificado só é liberado após concluir os 5 objetivos práticos no Rover 3D, aprovar os 5 formulários científicos e definir seu nome."
              : "Locked until you complete all 5 3D Rover mission objectives, pass all 5 scientific quiz forms, and set your pilot name."}
          </div>
        </div>
        <button
          type="button"
          className="btn-primary"
          disabled={!eligible}
          onClick={handleDownload}
        >
          {eligible ? <Download size={15} /> : <Lock size={15} />}{" "}
          {l === "pt" ? "Baixar Certificado PNG" : "Download PNG Diploma"}
        </button>
      </div>

      {/* Explicit Unlock Requirements Bar */}
      <div className="card-inset" style={{ marginBottom: "0.85rem", display: "grid", gap: "0.45rem", fontSize: "0.8rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
          <span>
            {hasName ? <CheckCircle2 size={14} color="var(--sig)" /> : <Lock size={14} color="var(--ink-soft)" />}{" "}
            <strong>1. {l === "pt" ? "Identificação do Piloto:" : "Pilot Name:"}</strong>{" "}
            {hasName ? profile.name : l === "pt" ? "Preencha no card de Perfil" : "Set in Profile card"}
          </span>
          <span className={`badge ${hasName ? "sig" : "ns"}`}>{hasName ? "OK" : l === "pt" ? "Pendente" : "Pending"}</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
          <span>
            {wonMissions.length === 5 ? <CheckCircle2 size={14} color="var(--sig)" /> : <Lock size={14} color="var(--ink-soft)" />}{" "}
            <strong>2. {l === "pt" ? "Objetivos de Missão 3D (Rover):" : "3D Rover Mission Objectives:"}</strong>{" "}
            {wonMissions.length}/5 ({wonMissions.join(", ") || "—"})
          </span>
          <span className={`badge ${wonMissions.length === 5 ? "sig" : "ns"}`}>{wonMissions.length}/5</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
          <span>
            {masteredModules.length === 5 ? <CheckCircle2 size={14} color="var(--sig)" /> : <Lock size={14} color="var(--ink-soft)" />}{" "}
            <strong>3. {l === "pt" ? "Formulários de Validação Científica:" : "Scientific Validation Forms:"}</strong>{" "}
            {masteredModules.length}/5 ({masteredModules.join(", ") || "—"})
          </span>
          <span className={`badge ${masteredModules.length === 5 ? "sig" : "ns"}`}>{masteredModules.length}/5</span>
        </div>
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
          opacity: eligible ? 1 : 0.48,
          filter: eligible ? "none" : "grayscale(0.35)",
        }}
      />
    </div>
  );
}
