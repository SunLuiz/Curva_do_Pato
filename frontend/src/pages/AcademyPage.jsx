import React, { useState } from "react";
import { Award, CheckCircle2, Gamepad2, GraduationCap, Play } from "lucide-react";
import { MODULES, getModuleById } from "../academy/questions";
import { BADGES, GAME_BADGES } from "../academy/xp";
import StarBar from "../components/StarBar";
import ProfileCard from "../components/ProfileCard";
import ModuleRunner from "../components/ModuleRunner";
import HallOfFame from "../components/HallOfFame";
import DiplomaCanvas from "../components/DiplomaCanvas";

function BadgeCardItem({ badge, unlocked, lockedLabel }) {
  return (
    <div
      className="card-inset"
      style={{
        opacity: unlocked ? 1 : 0.62,
        borderColor: unlocked ? `var(${badge.tone})` : "var(--hairline)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.4rem" }}>
        <strong style={{ fontSize: "0.9rem", color: unlocked ? `var(${badge.tone})` : "var(--ink)" }}>
          {badge.title}
        </strong>
        <span className={`badge ${unlocked ? "sig" : "ns"}`}>
          {unlocked ? "Earned" : lockedLabel}
        </span>
      </div>
      <div style={{ fontSize: "0.79rem", color: "var(--ink-soft)", marginTop: "0.25rem", lineHeight: 1.4 }}>
        {badge.description}
      </div>
    </div>
  );
}

export default function AcademyPage({
  profile,
  hallOfFame,
  onSaveProfile,
  onForgetProfile,
  onOpenCockpit,
  onOpenGame,
}) {
  const [activeModuleId, setActiveModuleId] = useState(null);
  const [rewardedIds, setRewardedIds] = useState({});

  const activeModule = activeModuleId ? getModuleById(activeModuleId) : null;

  const handleRecordAttempt = ({ moduleId, questionId, correct, usedHint, starsEarned, xpEarned }) => {
    const firstSolveReward = correct && !rewardedIds[questionId];
    if (firstSolveReward) {
      setRewardedIds((prev) => ({ ...prev, [questionId]: true }));
    }

    const nextStreak = correct && !usedHint ? (profile.streak || 0) + 1 : correct ? profile.streak || 0 : 0;
    const nextEvents = [
      ...(profile.events || []),
      {
        moduleId,
        questionId,
        correct,
        usedHint,
        at: new Date().toISOString(),
      },
    ].slice(-20);

    onSaveProfile({
      ...profile,
      streak: nextStreak,
      stars: (profile.stars || 0) + (firstSolveReward ? starsEarned : 0),
      xp: (profile.xp || 0) + (firstSolveReward ? xpEarned : 0),
      events: nextEvents,
    });
  };

  const handleCompleteModule = (moduleId, gateResult) => {
    const prev = profile.mastery?.[moduleId];
    const shouldKeepPassed = Boolean(prev?.passed) && !gateResult.passed;
    const nextRecord = shouldKeepPassed
      ? prev
      : {
          passed: gateResult.passed,
          score: gateResult.score,
          earned: gateResult.earned,
          total: gateResult.total,
          completedAt: new Date().toISOString(),
        };

    onSaveProfile({
      ...profile,
      mastery: {
        ...(profile.mastery || {}),
        [moduleId]: nextRecord,
      },
    });
  };

  return (
    <div>
      <div className="section-header">
        <div>
          <span className="badge sig">
            <GraduationCap size={13} /> Offline-Capable Field Training
          </span>
          <h2 style={{ marginTop: "0.45rem" }}>Earth System Detective Academy</h2>
          <p style={{ color: "var(--ink-soft)", fontSize: "0.94rem", marginTop: "0.25rem", maxWidth: "68ch" }}>
            Train on real 1984-2025 NASA POWER datasets across 5 investigation modules. Mastery requires &gt;= 80% recency-weighted accuracy and unassisted critical checks — never hints alone.
          </p>
        </div>
      </div>

      <StarBar profile={profile} />

      <ProfileCard profile={profile} onSave={onSaveProfile} onForget={onForgetProfile} />

      {activeModule && (
        <ModuleRunner
          mod={activeModule}
          profile={profile}
          onRecordAttempt={handleRecordAttempt}
          onCompleteModule={handleCompleteModule}
          onOpenCockpit={onOpenCockpit}
          onClose={() => setActiveModuleId(null)}
        />
      )}

      {/* 5-Module Curriculum Grid */}
      <div style={{ marginBottom: "1.5rem" }}>
        <div className="section-header" style={{ marginBottom: "0.75rem" }}>
          <h3>5 Investigation Modules (Real Cache Ground Truth)</h3>
          <span className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
            Gate threshold: 0.80 · Critical checks unassisted · 100% offline capable
          </span>
        </div>

        <div className="grid grid-3">
          {MODULES.map((mod) => {
            const mState = profile.mastery?.[mod.id];
            const passed = Boolean(mState?.passed);
            const isOpen = activeModuleId === mod.id;

            return (
              <div
                key={mod.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  borderColor: passed ? "var(--sig)" : isOpen ? `var(${mod.tone})` : "var(--hairline)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                    <span className="badge sig" style={{ color: `var(${mod.tone})`, borderColor: `var(${mod.tone})` }}>
                      {mod.id} · {mod.questions.length} Qs
                    </span>
                    {passed ? (
                      <span className="badge sig">
                        <CheckCircle2 size={12} /> Mastered ({Math.round(mState.score * 100)}%)
                      </span>
                    ) : mState ? (
                      <span className="badge ns">Last: {Math.round(mState.score * 100)}%</span>
                    ) : (
                      <span className="badge ns">Not started</span>
                    )}
                  </div>

                  <h4 style={{ fontFamily: "var(--font-display)", fontSize: "1.08rem", marginTop: "0.75rem" }}>
                    {mod.title}
                  </h4>
                  <p style={{ fontSize: "0.84rem", color: "var(--ink-soft)", marginTop: "0.3rem", lineHeight: 1.5 }}>
                    {mod.subtitle}
                  </p>
                </div>

                <div style={{ marginTop: "1rem" }}>
                  <button
                    type="button"
                    className={passed ? "btn-secondary" : "btn-primary"}
                    style={{ width: "100%", justifyContent: "center" }}
                    onClick={() => setActiveModuleId(mod.id)}
                  >
                    <Play size={14} /> {passed ? "Practice again" : mState ? "Retry for mastery" : "Start investigation"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Badges Shelf */}
      <div className="card" style={{ marginBottom: "1.35rem" }}>
        <div className="section-header" style={{ marginBottom: "0.75rem" }}>
          <div>
            <h3 style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontFamily: "var(--font-display)" }}>
              <Award size={18} color="var(--sig)" /> Merit Badges
            </h3>
            <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
              Unlocked strictly by passing each module&apos;s Statistical Mastery Gate.
            </div>
          </div>
          <span className="badge sig">{(profile.badges || []).length}/{BADGES.length} unlocked</span>
        </div>

        <div className="grid grid-3" style={{ gap: "0.7rem" }}>
          {BADGES.map((b) => (
            <BadgeCardItem
              key={b.id}
              badge={b}
              unlocked={(profile.badges || []).includes(b.id)}
              lockedLabel={b.moduleId}
            />
          ))}
        </div>
      </div>

      {/* 3D Field Badges synced from Rover Pilot 3D (/game) */}
      <div className="card">
        <div className="row-between" style={{ marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.6rem" }}>
          <div>
            <h3 style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontFamily: "var(--font-display)" }}>
              <Gamepad2 size={18} color="var(--biome-n)" /> 3D Field Badges (Rover Pilot 3D)
            </h3>
            <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
              Completed live in 3D simulations across Earth, Mars Jezero &amp; Artemis Moon (shared XP &amp; Stars).
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span className="badge info">
              {(profile.game?.badges || []).length}/{GAME_BADGES.length} unlocked
            </span>
            {onOpenGame && (
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
                onClick={onOpenGame}
              >
                <Play size={14} /> Open 3D Rover Game
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-3" style={{ gap: "0.7rem" }}>
          {GAME_BADGES.map((b) => (
            <BadgeCardItem
              key={b.id}
              badge={b}
              unlocked={(profile.game?.badges || []).includes(b.id)}
              lockedLabel={b.missionId}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-2" style={{ alignItems: "start" }}>
        <HallOfFame rows={hallOfFame} currentName={profile.name} />
        <DiplomaCanvas profile={profile} />
      </div>
    </div>
  );
}
