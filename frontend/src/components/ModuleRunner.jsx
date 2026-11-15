import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, CheckCircle2, Compass, HelpCircle, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { getTrend } from "../api";
import { creditFor, gate } from "../academy/mastery";
import { starsFor, xpFor } from "../academy/xp";
import { soundEngine } from "../game/soundEngine";

/**
 * Deterministic option permutation per question id so the correct answer
 * is distributed across A/B/C/D without shifting ground truth or re-ordering on render.
 */
function permuteOptions(question) {
  let hash = 0;
  for (let i = 0; i < question.id.length; i += 1) {
    hash = (hash * 31 + question.id.charCodeAt(i)) >>> 0;
  }
  const indices = question.options.map((_, idx) => idx);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    hash = (hash * 1664525 + 1013904223) >>> 0;
    const j = hash % (i + 1);
    const tmp = indices[i];
    indices[i] = indices[j];
    indices[j] = tmp;
  }
  return indices.map((origIdx, displayIdx) => ({
    label: String.fromCharCode(65 + displayIdx),
    text: question.options[origIdx],
    isCorrect: origIdx === question.correctIndex,
  }));
}

function SeriesMiniPreview({ seriesRef, hideSenLine }) {
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    if (!seriesRef) {
      setPayload(null);
      return;
    }
    let alive = true;
    getTrend({ region: seriesRef.region, variable: seriesRef.variable })
      .then((d) => {
        if (alive) setPayload(d);
      })
      .catch(() => {
        if (alive) setPayload(null);
      });
    return () => {
      alive = false;
    };
  }, [seriesRef?.region, seriesRef?.variable]);

  if (!payload?.series?.length) return null;

  const w = 640;
  const h = 150;
  const pad = { l: 42, r: 14, t: 14, b: 22 };
  const vals = payload.series.map((p) => p.v);
  let yMin = Math.min(...vals);
  let yMax = Math.max(...vals);
  if (yMax - yMin < 1e-6) {
    yMin -= 1;
    yMax += 1;
  }
  const sx = (idx) => pad.l + (idx / Math.max(1, payload.series.length - 1)) * (w - pad.l - pad.r);
  const sy = (val) => h - pad.b - ((val - yMin) / (yMax - yMin)) * (h - pad.t - pad.b);

  const rawPath = payload.series
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${sx(idx).toFixed(1)},${sy(p.v).toFixed(1)}`)
    .join(" ");
  const senPath =
    payload.series[0]?.sen != null
      ? `M${sx(0).toFixed(1)},${sy(payload.series[0].sen).toFixed(1)} L${sx(
          payload.series.length - 1
        ).toFixed(1)},${sy(payload.series[payload.series.length - 1].sen).toFixed(1)}`
      : "";

  return (
    <div className="card-inset" style={{ marginBottom: "1rem", padding: "0.75rem 0.9rem" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "0.5rem",
          flexWrap: "wrap",
          marginBottom: "0.4rem",
          fontSize: "0.78rem",
          color: "var(--ink-soft)",
        }}
      >
        <span className="mono" style={{ fontWeight: 700, color: "var(--ink)" }}>
          {payload.region.name} · {payload.label} ({payload.unit})
        </span>
        <span className="mono">
          {hideSenLine
            ? "1984-2025 · 504 monthly observations (Sen line & verdict hidden until solved)"
            : `n = ${payload.series.length} · 1984-2025`}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{ width: "100%", height: "auto", display: "block" }}
        role="img"
        aria-label={`${payload.region.name} ${payload.label} 1984 to 2025 monthly series`}
      >
        <line x1={pad.l} y1={pad.t} x2={pad.l} y2={h - pad.b} stroke="var(--hairline-strong)" />
        <line x1={pad.l} y1={h - pad.b} x2={w - pad.r} y2={h - pad.b} stroke="var(--hairline-strong)" />
        <text x={pad.l - 6} y={pad.t + 10} textAnchor="end" fontSize="9.5" fill="var(--ink-soft)" fontFamily="var(--font-mono)">
          {yMax.toFixed(1)}
        </text>
        <text x={pad.l - 6} y={h - pad.b} textAnchor="end" fontSize="9.5" fill="var(--ink-soft)" fontFamily="var(--font-mono)">
          {yMin.toFixed(1)}
        </text>
        <text x={pad.l} y={h - 6} fontSize="9.5" fill="var(--ink-soft)" fontFamily="var(--font-mono)">
          1984
        </text>
        <text x={w - pad.r} y={h - 6} textAnchor="end" fontSize="9.5" fill="var(--ink-soft)" fontFamily="var(--font-mono)">
          2025
        </text>
        <path d={rawPath} fill="none" stroke="var(--biome-n)" strokeWidth="1.35" opacity="0.82" />
        {!hideSenLine && senPath && (
          <path d={senPath} fill="none" stroke="var(--danger)" strokeWidth="2.4" strokeDasharray="5 3" />
        )}
      </svg>
    </div>
  );
}

export default function ModuleRunner({
  mod,
  profile,
  onRecordAttempt,
  onCompleteModule,
  onOpenCockpit,
  onClose,
}) {
  const [qIdx, setQIdx] = useState(0);
  const [attemptsByQ, setAttemptsByQ] = useState({});
  const [hintShownByQ, setHintShownByQ] = useState({});
  const [solvedByQ, setSolvedByQ] = useState({});
  const [selectedDisplayIdx, setSelectedDisplayIdx] = useState(null);
  const [feedback, setFeedback] = useState(null);
  const [runItems, setRunItems] = useState([]);
  const [finishedResult, setFinishedResult] = useState(null);

  const resetRun = () => {
    setQIdx(0);
    setAttemptsByQ({});
    setHintShownByQ({});
    setSolvedByQ({});
    setSelectedDisplayIdx(null);
    setFeedback(null);
    setRunItems([]);
    setFinishedResult(null);
  };

  useEffect(() => {
    resetRun();
  }, [mod.id]);

  const q = mod.questions[qIdx];
  const displayOptions = useMemo(() => (q ? permuteOptions(q) : []), [q?.id]);

  if (!q) return null;

  const isSolved = Boolean(solvedByQ[q.id]);
  const usedHint = Boolean(hintShownByQ[q.id]);
  const currentAttempts = attemptsByQ[q.id] || 0;

  const handleRevealHint = () => {
    if (isSolved || usedHint) return;
    setHintShownByQ((prev) => ({ ...prev, [q.id]: true }));
  };

  const handleAnswer = (opt, displayIdx) => {
    if (isSolved || finishedResult) return;
    const nextAttempt = currentAttempts + 1;
    setSelectedDisplayIdx(displayIdx);
    setAttemptsByQ((prev) => ({ ...prev, [q.id]: nextAttempt }));

    if (!opt.isCorrect) {
      soundEngine.playAlertWarning();
      setFeedback({
        correct: false,
        text: "Not quite — inspect the units, p-value, or confidence bounds and try again cleanly.",
      });
      onRecordAttempt({
        moduleId: mod.id,
        questionId: q.id,
        correct: false,
        usedHint,
        starsEarned: 0,
        xpEarned: 0,
      });
      return;
    }

    const credit = creditFor(nextAttempt, usedHint);
    const starsEarned = starsFor(nextAttempt, usedHint, true);
    const nextStreak = !usedHint && nextAttempt === 1 ? (profile.streak || 0) + 1 : 0;
    const earnedXp = xpFor(starsEarned, nextStreak);
    const itemRecord = {
      id: q.id,
      credit,
      critical: Boolean(q.critical),
      solvedUnassisted: !usedHint && nextAttempt === 1,
      attempts: nextAttempt,
      usedHint,
      starsEarned,
    };

    const nextItems = [...runItems.filter((it) => it.id !== q.id), itemRecord];
    soundEngine.playActionClick("quiz_ok");
    setRunItems(nextItems);
    setSolvedByQ((prev) => ({ ...prev, [q.id]: itemRecord }));
    setFeedback({
      correct: true,
      starsEarned,
      xpEarned: earnedXp,
      credit,
      text: q.explain,
    });

    onRecordAttempt({
      moduleId: mod.id,
      questionId: q.id,
      correct: true,
      usedHint,
      starsEarned,
      xpEarned: earnedXp,
    });
  };

  const handleNext = () => {
    if (qIdx + 1 < mod.questions.length) {
      setQIdx((i) => i + 1);
      setSelectedDisplayIdx(null);
      setFeedback(null);
      return;
    }
    const result = gate(runItems);
    if (result.passed) {
      soundEngine.playRingtone();
    } else {
      soundEngine.playAlertWarning();
    }
    setFinishedResult(result);
    onCompleteModule(mod.id, result, runItems);
  };

  if (finishedResult) {
    return (
      <div className="card" style={{ marginBottom: "1.35rem" }}>
        <div className="section-header">
          <div>
            <span className={`badge ${finishedResult.passed ? "sig" : "ns"}`}>
              {finishedResult.passed ? `${mod.id} Mastered` : `${mod.id} Needs Clean Mastery`}
            </span>
            <h3 style={{ marginTop: "0.45rem", fontFamily: "var(--font-display)" }}>
              {mod.title} — Evaluation Summary
            </h3>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button type="button" className="btn-secondary" onClick={resetRun}>
              <RotateCcw size={14} /> Retry module
            </button>
            <button type="button" className="btn-ghost" onClick={onClose}>
              Back to all modules
            </button>
          </div>
        </div>

        <div className="grid grid-4" style={{ margin: "1rem 0" }}>
          <div className="card-inset">
            <div className="stat-label">Weighted Mastery</div>
            <div className="stat-value">{Math.round(finishedResult.score * 100)}%</div>
            <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>Gate requires &gt;= 80%</div>
          </div>
          <div className="card-inset">
            <div className="stat-label">First-Try Unassisted</div>
            <div className="stat-value">
              {finishedResult.earned}/{finishedResult.total}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>Zero-hint 1st attempts</div>
          </div>
          <div className="card-inset">
            <div className="stat-label">Critical Checks</div>
            <div className="stat-value" style={{ color: finishedResult.reasons.criticalOk ? "var(--sig)" : "var(--danger)" }}>
              {finishedResult.reasons.criticalOk ? "PASS" : "BLOCKED"}
            </div>
            <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>Falsification &amp; scope items</div>
          </div>
          <div className="card-inset">
            <div className="stat-label">Minimum Length</div>
            <div className="stat-value">{finishedResult.reasons.enoughItems ? "PASS" : "FAIL"}</div>
            <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>At least 5 questions</div>
          </div>
        </div>

        {finishedResult.passed ? (
          <div
            className="card-inset"
            style={{ borderColor: "var(--sig)", background: "rgba(42, 112, 71, 0.08)" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: 700, color: "var(--sig)" }}>
              <CheckCircle2 size={18} /> Module badge unlocked and recorded in your local dossier!
            </div>
            <p style={{ marginTop: "0.35rem", fontSize: "0.88rem", color: "var(--ink-soft)" }}>
              No shortcuts triggered: weighted recency score reached {Math.round(finishedResult.score * 100)}% and every critical honesty check passed without hints.
            </p>
          </div>
        ) : (
          <div
            className="card-inset"
            style={{ borderColor: "var(--danger)", background: "rgba(178, 58, 42, 0.06)" }}
          >
            <p style={{ fontWeight: 700, color: "var(--danger)" }}>
              Not mastered yet: {finishedResult.earned}/{finishedResult.total} solved without hints on your first attempt (score {Math.round(finishedResult.score * 100)}%).
            </p>
            <ul style={{ marginTop: "0.45rem", paddingLeft: "1.2rem", fontSize: "0.86rem", color: "var(--ink-soft)", lineHeight: 1.55 }}>
              {!finishedResult.reasons.thresholdMet && (
                <li>Weighted mastery score ({Math.round(finishedResult.score * 100)}%) is below 80%. Hints award practice stars, not mastery credit.</li>
              )}
              {!finishedResult.reasons.criticalOk && (
                <li>Every critical falsification or limit question in {mod.id} must be answered unaided on the first attempt.</li>
              )}
              {!finishedResult.reasons.enoughItems && (
                <li>Mastery requires at least 5 completed questions in the module.</li>
              )}
            </ul>
          </div>
        )}
      </div>
    );
  }

  const promptText = q.promptByDepth[profile.depth] || q.promptByDepth.explorer;

  return (
    <div className="card" style={{ marginBottom: "1.35rem" }}>
      <div className="section-header" style={{ marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
          <span className="badge sig">
            {mod.id} · Q{qIdx + 1}/{mod.questions.length}
          </span>
          {q.critical && (
            <span className="badge ns" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>
              Critical gate check
            </span>
          )}
          <span style={{ fontSize: "0.8rem", color: "var(--ink-soft)" }}>
            Track: {profile.depth}
          </span>
        </div>

        <button type="button" className="btn-ghost" onClick={onClose}>
          Close module
        </button>
      </div>

      <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", lineHeight: 1.35, marginBottom: "0.85rem" }}>
        {promptText}
      </h3>

      {q.seriesRef && (
        <SeriesMiniPreview seriesRef={q.seriesRef} hideSenLine={Boolean(q.hideSenInPreview) && !isSolved} />
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
        {displayOptions.map((opt, idx) => {
          const isPicked = selectedDisplayIdx === idx;
          let borderColor = "var(--hairline)";
          let bg = "var(--surface-0)";
          if (isSolved && opt.isCorrect) {
            borderColor = "var(--sig)";
            bg = "rgba(42, 112, 71, 0.08)";
          } else if (isPicked && feedback && !feedback.correct) {
            borderColor = "var(--danger)";
            bg = "rgba(178, 58, 42, 0.07)";
          }

          return (
            <button
              key={opt.label}
              type="button"
              disabled={isSolved}
              onClick={() => handleAnswer(opt, idx)}
              className="card-inset"
              style={{
                textAlign: "left",
                cursor: isSolved ? "default" : "pointer",
                borderColor,
                background: bg,
                display: "flex",
                gap: "0.75rem",
                alignItems: "flex-start",
              }}
            >
              <span
                className="mono"
                style={{
                  fontWeight: 700,
                  color: "var(--biome-n)",
                  minWidth: 22,
                }}
              >
                {opt.label}.
              </span>
              <span style={{ fontSize: "0.92rem", color: "var(--ink)", lineHeight: 1.45 }}>{opt.text}</span>
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", marginTop: "0.95rem" }}>
        <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
          {!isSolved && (
            <button
              type="button"
              className="btn-secondary"
              disabled={usedHint}
              onClick={handleRevealHint}
            >
              <HelpCircle size={15} /> {usedHint ? "Hint shown (0 mastery credit)" : "Use hint (+1 star practice, 0 mastery credit)"}
            </button>
          )}
          {q.cockpitLink && isSolved && (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => onOpenCockpit(q.cockpitLink)}
            >
              <Compass size={15} /> Open this case in Cockpit
            </button>
          )}
        </div>

        {isSolved && (
          <button type="button" className="btn-primary" onClick={handleNext}>
            {qIdx + 1 < mod.questions.length ? "Next question" : "See mastery verdict"} <ArrowRight size={15} />
          </button>
        )}
      </div>

      {usedHint && !isSolved && (
        <div className="card-inset" style={{ marginTop: "0.85rem", borderColor: "var(--biome-ne)" }}>
          <div className="stat-label" style={{ color: "var(--biome-ne)" }}>
            Field Hint (Guided Practice)
          </div>
          <p style={{ fontSize: "0.86rem", color: "var(--ink)", marginTop: "0.2rem" }}>{q.hint}</p>
        </div>
      )}

      {feedback && (
        <div
          className="card-inset"
          style={{
            marginTop: "0.85rem",
            borderColor: feedback.correct ? "var(--sig)" : "var(--danger)",
            background: feedback.correct ? "rgba(42, 112, 71, 0.06)" : "rgba(178, 58, 42, 0.06)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.45rem",
              fontWeight: 700,
              color: feedback.correct ? "var(--sig)" : "var(--danger)",
            }}
          >
            {feedback.correct ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
            {feedback.correct
              ? `Correct! +${feedback.starsEarned} star(s) · +${feedback.xpEarned} XP · Mastery credit ${feedback.credit}`
              : "Attempt missed"}
          </div>
          <p style={{ fontSize: "0.86rem", color: "var(--ink-soft)", marginTop: "0.3rem", lineHeight: 1.5 }}>
            {feedback.text}
          </p>
        </div>
      )}
    </div>
  );
}
