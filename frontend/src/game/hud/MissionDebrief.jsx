import React, { useEffect, useState } from "react";
import { Award, CheckCircle2, FlaskConical, GraduationCap, RotateCcw, Star, XCircle, ArrowRight } from "lucide-react";
import { MISSION_DEFS, MISSION_ORDER } from "../missions/missionParams";

function RealSliceSparkline({ values = [], sentinels = [], unit = "" }) {
  if (!values.length) return null;
  const w = 360;
  const h = 88;
  const pad = 10;
  const nums = values.filter((v) => typeof v === "number" && Number.isFinite(v));
  const lo = Math.min(...nums, 0);
  const hi = Math.max(...nums, 1);
  const span = hi - lo || 1;
  const x = (i) => pad + (i / Math.max(1, values.length - 1)) * (w - pad * 2);
  const y = (v) => pad + ((hi - v) / span) * (h - pad * 2);

  let d = "";
  values.forEach((v, i) => {
    if (typeof v !== "number") return;
    d += `${d === "" ? "M" : " L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`;
  });

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }}>
      <path d={d} fill="none" stroke="var(--biome-se)" strokeWidth="2" />
      {sentinels.map((idx) => (
        <circle key={idx} cx={x(idx)} cy={pad} r="3.5" fill="var(--danger)" />
      ))}
      <text x={pad} y={h - 3} className="chart-label">
        min {lo.toFixed(2)} {unit} · max {hi.toFixed(2)} {unit}
      </text>
    </svg>
  );
}

export default function MissionDebrief({
  snapshot,
  lang = "en",
  onRetry,
  onNextMission,
  onOpenLab,
  onOpenQuiz,
  quizPassed = false,
  labUnlocked = false,
}) {
  const l = lang === "pt" ? "pt" : "en";
  const [bakedData, setBakedData] = useState(null);

  useEffect(() => {
    fetch("/game/data/mission_params.json")
      .then((r) => (r.ok ? r.json() : null))
      .then(setBakedData)
      .catch(() => {});
  }, []);

  if (!snapshot) return null;
  const { missionId, status, failReason, outcome, timeline, actionLog, oraclePins, resources } = snapshot;
  const def = MISSION_DEFS[missionId] || MISSION_DEFS.M2;
  const won = status === "won";
  const nextId = MISSION_ORDER[MISSION_ORDER.indexOf(missionId) + 1] || null;

  // Comparative chart coordinates
  const w = 580;
  const h = 145;
  const pad = { l: 42, r: 20, t: 18, b: 26 };
  const vals = timeline.map((p) => p.primaryVal);
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const xPos = (t) => pad.l + (t / Math.max(1, timeline.length - 1)) * (w - pad.l - pad.r);
  const yPos = (v) => pad.t + ((hi - v) / span) * (h - pad.t - pad.b);
  const pathD = timeline
    .map((p, i) => `${i === 0 ? "M" : "L"}${xPos(p.t).toFixed(1)},${yPos(p.primaryVal).toFixed(1)}`)
    .join(" ");

  return (
    <div className="hud-modal-backdrop" role="dialog" aria-modal="true" aria-label={won ? "Mission Accomplished" : "Mission Failed"}>
      <section className="hud-modal-card" style={{ borderLeft: `6px solid ${won ? "var(--sig)" : "var(--danger)"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <span className={`badge ${won ? "live" : "bad"}`} style={{ fontSize: "0.82rem", padding: "0.28rem 0.7rem" }}>
              {won ? <CheckCircle2 size={15} /> : <XCircle size={15} />}
              {won
                ? `${l === "pt" ? "MISSÃO CUMPRIDA" : "MISSION ACCOMPLISHED"} · ${outcome?.grade} (${outcome?.stars || 0}/3 ★)`
                : l === "pt"
                ? "ALERTA: MISSÃO FALHOU"
                : "ALERT: MISSION FAILED"}
            </span>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.32rem", marginTop: "0.45rem" }}>
              {def[l].title}
            </h3>
          </div>

          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <div className="badge sig">
              <Star size={13} /> +{outcome?.xp || 0} XP
            </div>
            <div className="badge">
              <Award size={13} /> {l === "pt" ? "Eficiência" : "Efficiency"}: {outcome?.efficiencyPct ?? 0}%
            </div>
            <div className="badge">
              {l === "pt" ? "Integridade" : "Integrity"}: {Math.round(resources.integrity)}%
            </div>
          </div>
        </div>

        {/* Prominent Failure Diagnosis Box OR Victory Next-Step Box */}
        {!won ? (
          <div
            className="card-inset"
            style={{
              marginTop: "0.85rem",
              borderColor: "var(--danger)",
              background: "rgba(178, 58, 42, 0.08)",
              display: "grid",
              gap: "0.45rem",
            }}
          >
            <div style={{ color: "var(--danger)", fontWeight: 700, fontSize: "0.95rem" }}>
              {l === "pt" ? "Por que a missão falhou:" : "Why the mission failed:"}{" "}
              {failReason ? failReason[l] : l === "pt" ? "Objetivo tático não concluído a tempo." : "Tactical objective not completed in time."}
            </div>
            <div style={{ fontSize: "0.86rem", color: "var(--ink)" }}>
              <strong>{l === "pt" ? "Instrução Objetiva para Vencer:" : "Objective Instruction to Win:"}</strong>{" "}
              {def[l].objectiveShort}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.6rem", marginTop: "0.25rem" }}>
              <button type="button" className="btn-primary" onClick={onRetry}>
                <RotateCcw size={15} /> {l === "pt" ? "Começar Novamente Agora (Tecla R)" : "Retry Mission Now (Key R)"}
              </button>
              {onOpenQuiz && (
                <button type="button" className="btn-secondary" onClick={onOpenQuiz}>
                  <GraduationCap size={15} /> {l === "pt" ? "Abrir Questionário da Missão" : "Open Mission Quiz"}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div
            className="card-inset"
            style={{
              marginTop: "0.85rem",
              borderColor: "var(--sig)",
              background: "rgba(42, 112, 71, 0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "0.65rem",
            }}
          >
            <div style={{ fontSize: "0.86rem" }}>
              <strong>
                {quizPassed
                  ? l === "pt"
                    ? "✓ Objetivo 3D + Questionário Científico desta missão concluídos!"
                    : "✓ 3D Objective + Scientific Quiz for this mission completed!"
                  : l === "pt"
                  ? "Objetivo 3D concluído! Agora responda ao Questionário da Missão para liberar o Mérito e o Certificado:"
                  : "3D Objective complete! Now answer the Mission Quiz right here to unlock your Merit & Diploma:"}
              </strong>
            </div>
            {onOpenQuiz && (
              <button type="button" className="btn-primary" onClick={onOpenQuiz}>
                <GraduationCap size={15} />{" "}
                {quizPassed
                  ? l === "pt"
                    ? "Revisar Questionário na Tela"
                    : "Review In-Game Quiz"
                  : l === "pt"
                  ? "Responder Questionário Aqui no Jogo"
                  : "Take Mission Quiz In-Game"}
              </button>
            )}
          </div>
        )}

      {/* Comparative Timeline: Player Actions vs Optimal Oracle */}
      <div className="card-inset" style={{ marginTop: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.4rem" }}>
          <strong style={{ fontSize: "0.86rem" }}>
            {l === "pt"
              ? "Comparativo: Suas Ações (âmbar) vs. Política Ótima do Oráculo (verde tracejado)"
              : "Comparison: Your Actions (amber) vs. Optimal Oracle Policy (green dashed)"}
          </strong>
          <span className="mono" style={{ fontSize: "0.74rem", color: "var(--ink-soft)" }}>
            Seed {snapshot.seed} · {snapshot.severity} · {snapshot.depth}
          </span>
        </div>

        <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }}>
          <path d={pathD} className="chart-primary" />
          {oraclePins.map((pin, idx) => (
            <g key={`o-${idx}`}>
              <line x1={xPos(pin.t)} y1={pad.t} x2={xPos(pin.t)} y2={h - pad.b} className="chart-oracle-pin" />
              <text x={xPos(pin.t) + 3} y={pad.t + 12 + (idx % 2) * 12} className="chart-label" fill="var(--sig)">
                ★ {l === "pt" ? pin.labelPt : pin.labelEn}
              </text>
            </g>
          ))}
          {actionLog.map((act, idx) => (
            <line
              key={`p-${idx}`}
              x1={xPos(act.t)}
              y1={pad.t}
              x2={xPos(act.t)}
              y2={h - pad.b}
              className="chart-player-pin"
            />
          ))}
        </svg>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem", marginTop: "0.65rem", fontSize: "0.81rem" }}>
          <div>
            <strong>{l === "pt" ? "Oráculo Ideal:" : "Optimal Oracle:"}</strong>
            <ul style={{ paddingLeft: "1.1rem", marginTop: "0.25rem", color: "var(--ink-soft)" }}>
              {oraclePins.map((p, i) => (
                <li key={i}>
                  t={p.t}: {l === "pt" ? p.labelPt : p.labelEn}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <strong>{l === "pt" ? "Suas Ações Executadas:" : "Your Executed Actions:"}</strong>
            <ul style={{ paddingLeft: "1.1rem", marginTop: "0.25rem", color: "var(--ink-soft)" }}>
              {actionLog.length === 0 ? (
                <li>{l === "pt" ? "Nenhuma ação registrada." : "No actions logged."}</li>
              ) : (
                actionLog.slice(-5).map((a, i) => (
                  <li key={i}>
                    t={a.t}: {l === "pt" ? a.labelPt : a.labelEn}
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* Real Frozen NASA Snapshot Proof */}
      <div className="card-inset" style={{ marginTop: "0.9rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.45rem" }}>
          <strong>
            {l === "pt" ? "Dados Reais Auditados da NASA (Prova de Campo)" : "Real Audited NASA Snapshot (Field Ground Truth)"}
          </strong>
          <span className="badge cached">{def.sourceCite}</span>
        </div>

        <p style={{ fontSize: "0.86rem", color: "var(--ink)", lineHeight: 1.55, marginBottom: "0.6rem" }}>
          {def[l].takeaway}
        </p>

        {bakedData && missionId === "M1" && (
          <div>
            <RealSliceSparkline
              values={bakedData.power_ne_hourly.peak_day_hourly.map((r) => r.sw)}
              unit="W/m²"
            />
            <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
              {bakedData.power_ne_hourly.demand_profile_note}
            </div>
          </div>
        )}

        {bakedData && missionId === "M2" && (
          <div>
            <RealSliceSparkline
              values={bakedData.meda_sol40_wind.real_peak_window.map((r) => (r.sentinel ? null : r.wind_ms))}
              sentinels={bakedData.meda_sol40_wind.real_peak_window
                .map((r, idx) => (r.sentinel ? idx : -1))
                .filter((i) => i >= 0)}
              unit="m/s"
            />
            <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
              MEDA Sol 40: {bakedData.meda_sol40_wind.rows_count} rows · {bakedData.meda_sol40_wind.sentinel_count} sentinels (4.54%) · P90 {bakedData.meda_sol40_wind.stats.p90} · P99 {bakedData.meda_sol40_wind.stats.p99} · max {bakedData.meda_sol40_wind.stats.max} m/s.
            </div>
          </div>
        )}

        {bakedData && missionId === "M3" && (
          <div className="mono" style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
            MEDA Sol 1100 CAL_RDS: {bakedData.meda_sol1100_rad.rows_count} rows · ROVER_STILL=1 ({bakedData.meda_sol1100_rad.rover_still_1_count}) vs ROVER_STILL=0 moving ({bakedData.meda_sol1100_rad.rover_still_0_moving_count}) · RDS_TOP_1 max {bakedData.meda_sol1100_rad.stats.rds_top_1_max}.
          </div>
        )}

        {bakedData && missionId === "M4" && (
          <div>
            <RealSliceSparkline
              values={bakedData.trends.campinas_ALLSKY_SFC_SW_DWN.annual_series.map((r) => r.v)}
              unit="MJ/m²/d"
            />
            <div className="mono" style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
              Campinas (1984–2025): ALLSKY p=0.00086 (+0.1621/dec) · CLRSKY tau=+0.322 p&lt;1e-16 · CLOUD p=0.9476 (null) vs Manaus CLOUD -0.855 %/dec.
            </div>
          </div>
        )}

        {bakedData && missionId === "M5" && (
          <div className="mono" style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
            NASA DONKI ({bakedData.space_and_fires.donki.window.join(" -> ")}): {bakedData.space_and_fires.donki.count} alerts ({bakedData.space_and_fires.donki.events.map((e) => e.type).join(", ")}) · OSDR {bakedData.space_and_fires.space_analog.osdr_study} · CelesTrak eclipse {bakedData.space_and_fires.space_analog.celestrak_eclipse_pct}%.
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.65rem", marginTop: "1rem" }}>
        <button type="button" className="btn-secondary" onClick={onRetry}>
          <RotateCcw size={15} /> {l === "pt" ? "Jogar Novamente (R)" : "Retry Mission (R)"}
        </button>

        {onOpenQuiz && (
          <button type="button" className="btn-secondary" onClick={onOpenQuiz}>
            <GraduationCap size={15} />{" "}
            {l === "pt" ? `Questionário Científico ${missionId}` : `Scientific Quiz ${missionId}`}
          </button>
        )}

        {won && nextId && (
          <button type="button" className="btn-primary" onClick={() => onNextMission(nextId)}>
            {l === "pt" ? `Próxima Missão: ${nextId}` : `Next Mission: ${nextId}`} <ArrowRight size={15} />
          </button>
        )}

        {labUnlocked && (
          <button type="button" className="btn-secondary" onClick={onOpenLab}>
            <FlaskConical size={15} /> {l === "pt" ? "Abrir Mission Lab (Dificuldades)" : "Open Mission Lab (Difficulty)"}
          </button>
        )}
      </div>
      </section>
    </div>
  );
}
