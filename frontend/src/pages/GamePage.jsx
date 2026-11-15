import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Award,
  CheckCircle2,
  Compass,
  Eye,
  FlaskConical,
  Gamepad2,
  HelpCircle,
  Lock,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sliders,
  Sparkles,
  Unlock,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from "lucide-react";
import "../game/game.css";
import NarrativeIntro from "../game/NarrativeIntro";
import RoverViewport3D from "../game/scene/RoverViewport3D";
import LiveMissionChart from "../game/hud/LiveMissionChart";
import NavCamMini from "../game/hud/NavCamMini";
import MissionDebrief from "../game/hud/MissionDebrief";
import MissionLabPanel from "../game/hud/MissionLabPanel";
import { MISSION_DEFS, MISSION_ORDER } from "../game/missions/missionParams";
import {
  clearRuntime,
  dispatchAction,
  markHintUsed,
  startMissionRuntime,
  togglePauseRuntime,
  useGameSnapshot,
} from "../game/store";
import { soundEngine } from "../game/soundEngine";
import { DEPTH_TRACKS, GAME_BADGES } from "../academy/xp";

export default function GamePage({ profile, onSaveProfile, onNavigate, lang = "en" }) {
  const l = lang === "pt" ? "pt" : "en";
  const gameState = profile.game || {};
  const [viewMode, setViewMode] = useState(gameState.introSeen ? "play" : "intro"); // intro | play | lab
  const [selectedMissionId, setSelectedMissionId] = useState("M1");
  const [depth, setDepth] = useState(profile.depth || "explorer");
  const [usedHint, setUsedHint] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [muted, setMuted] = useState(false);
  const [runCounter, setRunCounter] = useState(0);
  const [runConfig, setRunConfig] = useState({
    missionId: "M1",
    planetId: null,
    depth: profile.depth || "explorer",
    severity: "P90",
    dropoutRate: null,
    seed: 2026,
  });

  const touchInputRef = useRef({ throttle: 0, steer: 0 });
  const scoredRunRef = useRef(-1);
  const snapshot = useGameSnapshot();

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    []
  );

  useEffect(() => {
    soundEngine.setMuted(muted);
  }, [muted]);

  const launchRun = useCallback(
    (cfg) => {
      const nextCfg = {
        missionId: cfg.missionId || "M1",
        planetId: cfg.planetId || null,
        depth: cfg.depth || depth,
        severity: cfg.severity || "P90",
        dropoutRate: cfg.dropoutRate ?? null,
        seed: cfg.seed || 2026,
      };
      setSelectedMissionId(nextCfg.missionId);
      setRunConfig(nextCfg);
      setShowHint(false);
      setUsedHint(false);
      setRunCounter((c) => c + 1);
      startMissionRuntime({
        ...nextCfg,
        attempt: (gameState.missions?.[nextCfg.missionId]?.attempts || 0) + 1,
        usedHint: false,
        streak: profile.streak || 0,
      });
      setViewMode("play");
    },
    [depth, gameState.missions, profile.streak]
  );

  // Start initial mission automatically when entering play mode without an active runtime
  useEffect(() => {
    if (viewMode === "play" && !snapshot) {
      launchRun(runConfig);
    }
  }, [viewMode, snapshot, launchRun, runConfig]);

  // Cleanup runtime on unmount
  useEffect(() => () => clearRuntime(), []);

  // Persist mission win/loss & XP to shared profile once per run
  useEffect(() => {
    if (!snapshot || (snapshot.status !== "won" && snapshot.status !== "lost")) return;
    if (scoredRunRef.current === runCounter) return;
    scoredRunRef.current = runCounter;

    const mId = snapshot.missionId;
    const prevRec = gameState.missions?.[mId] || {};
    const won = snapshot.status === "won";
    const starsEarned = snapshot.outcome?.stars || 0;
    const xpEarned = snapshot.outcome?.xp || 0;

    // Only increment shared stars if player improved star rating on this mission
    const prevStars = prevRec.stars || 0;
    const deltaStars = won ? Math.max(0, starsEarned - prevStars) : 0;

    const nextMissions = {
      ...(gameState.missions || {}),
      [mId]: {
        won: Boolean(prevRec.won || won),
        stars: Math.max(prevStars, starsEarned),
        bestEfficiency: Math.max(prevRec.bestEfficiency || 0, snapshot.outcome?.efficiencyPct || 0),
        attempts: (prevRec.attempts || 0) + 1,
        lastPlayedAt: new Date().toISOString(),
      },
    };

    const nextStreak = won ? (profile.streak || 0) + 1 : 0;

    onSaveProfile({
      ...profile,
      depth,
      streak: nextStreak,
      stars: (profile.stars || 0) + deltaStars,
      xp: (profile.xp || 0) + xpEarned,
      game: {
        ...gameState,
        introSeen: true,
        missions: nextMissions,
        labRuns:
          viewMode === "play" && runConfig.planetId
            ? [
                ...(gameState.labRuns || []),
                {
                  missionId: mId,
                  planetId: snapshot.planetId,
                  severity: snapshot.severity,
                  seed: snapshot.seed,
                  won,
                  efficiencyPct: snapshot.outcome?.efficiencyPct || 0,
                },
              ].slice(-15)
            : gameState.labRuns || [],
      },
    });
  }, [snapshot, runCounter, gameState, profile, depth, onSaveProfile, viewMode, runConfig]);

  const judgeUnlock = Boolean(gameState.judgeUnlock);
  const completedCount = MISSION_ORDER.filter((id) => gameState.missions?.[id]?.won).length;
  const labUnlocked = judgeUnlock || (Boolean(gameState.missions?.M1?.won) && Boolean(gameState.missions?.M2?.won));

  const isMissionUnlocked = (id) => {
    if (judgeUnlock || id === "M1") return true;
    const idx = MISSION_ORDER.indexOf(id);
    const prevId = MISSION_ORDER[idx - 1];
    return Boolean(gameState.missions?.[prevId]?.won);
  };

  const handleFinishIntro = () => {
    if (!gameState.introSeen) {
      onSaveProfile({
        ...profile,
        game: { ...gameState, introSeen: true },
      });
    }
    launchRun(runConfig);
  };

  const toggleJudgeUnlock = () => {
    onSaveProfile({
      ...profile,
      game: { ...gameState, judgeUnlock: !judgeUnlock },
    });
  };

  const setTouch = (throttle, steer) => {
    touchInputRef.current = { throttle, steer };
  };

  const activeDef = MISSION_DEFS[snapshot?.missionId || selectedMissionId] || MISSION_DEFS.M1;
  const rv = snapshot?.rover;
  const res = snapshot?.resources;
  const al = snapshot?.alert;

  return (
    <div className="game-shell">
      {/* Top Game Command Header */}
      <div className="game-topbar">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <span className="badge sig">
              <Gamepad2 size={13} /> ROVER PILOT 3D
            </span>
            <span className="badge">
              <Zap size={12} /> {profile.xp || 0} XP · {profile.stars || 0} ★ · {completedCount}/5
            </span>
            {!profile.name?.trim() && (
              <button
                type="button"
                className="badge cached"
                style={{ cursor: "pointer" }}
                onClick={() => onNavigate("/academy")}
              >
                {l === "pt" ? "Definir nome no Hall da Fama ▸" : "Set codename in Academy ▸"}
              </button>
            )}
          </div>
          <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.32rem", marginTop: "0.3rem" }}>
            {l === "pt"
              ? "Curve of Duck · Rover Pilot 3D (O Planeta Respira)"
              : "Curve of Duck · Rover Pilot 3D (The Planet Breathes)"}
          </h2>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
          <select
            aria-label="Statistical Depth Track"
            className="btn-secondary"
            style={{ padding: "0.45rem 0.7rem", fontSize: "0.8rem" }}
            value={depth}
            onChange={(e) => {
              const nextD = e.target.value;
              setDepth(nextD);
              if (viewMode === "play") launchRun({ ...runConfig, depth: nextD });
            }}
          >
            {DEPTH_TRACKS.map((tr) => (
              <option key={tr.id} value={tr.id}>
                {tr.label} ({tr.id === "explorer" ? "L1" : tr.id === "analyst" ? "L2" : "L3"})
              </option>
            ))}
          </select>

          <button
            type="button"
            className={viewMode === "intro" ? "btn-primary" : "btn-secondary"}
            style={{ padding: "0.45rem 0.8rem", fontSize: "0.8rem" }}
            onClick={() => setViewMode("intro")}
          >
            <Eye size={14} /> {l === "pt" ? "História" : "Story Intro"}
          </button>

          <button
            type="button"
            className={viewMode === "lab" ? "btn-primary" : "btn-secondary"}
            style={{ padding: "0.45rem 0.8rem", fontSize: "0.8rem" }}
            disabled={!labUnlocked}
            title={
              labUnlocked
                ? ""
                : l === "pt"
                ? "Complete M1 e M2 (ou ative Modo Banca) para liberar o Mission Lab"
                : "Complete M1 & M2 (or enable Judge Preview) to unlock Mission Lab"
            }
            onClick={() => setViewMode("lab")}
          >
            <FlaskConical size={14} /> Mission Lab {!labUnlocked && <Lock size={12} />}
          </button>

          <button
            type="button"
            className={judgeUnlock ? "btn-primary" : "btn-secondary"}
            style={{ padding: "0.45rem 0.75rem", fontSize: "0.78rem" }}
            onClick={toggleJudgeUnlock}
            title={
              l === "pt"
                ? "Libera todas as 5 missões e o Mission Lab imediatamente para avaliação"
                : "Unlock all 5 missions and Mission Lab immediately for hackathon judging"
            }
          >
            {judgeUnlock ? <Unlock size={14} /> : <Lock size={14} />}
            {l === "pt" ? "Modo Banca" : "Judge Unlock"}
          </button>
        </div>
      </div>

      {/* Sequential 5-Mission Selector Strip */}
      <div className="game-mission-strip">
        {MISSION_ORDER.map((id) => {
          const def = MISSION_DEFS[id];
          const unlocked = isMissionUnlocked(id);
          const rec = gameState.missions?.[id];
          const isActive = viewMode === "play" && snapshot?.missionId === id;

          return (
            <button
              key={id}
              type="button"
              disabled={!unlocked}
              className={`game-mission-btn ${isActive ? "active" : ""}`}
              onClick={() =>
                launchRun({
                  missionId: id,
                  planetId: null,
                  depth,
                  severity: "P90",
                  dropoutRate: null,
                  seed: 2026,
                })
              }
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                <span className="mono" style={{ fontSize: "0.73rem", fontWeight: 700, color: "var(--biome-n)" }}>
                  {id} · {def[l].badge.split("·")[0].trim()}
                </span>
                {rec?.won ? (
                  <span className="badge live" style={{ padding: "0.1rem 0.45rem", fontSize: "0.68rem" }}>
                    <CheckCircle2 size={11} /> {rec.stars || 1}★
                  </span>
                ) : !unlocked ? (
                  <Lock size={13} color="var(--ink-soft)" />
                ) : null}
              </div>
              <div style={{ fontWeight: 700, fontSize: "0.86rem", lineHeight: 1.25 }}>
                {def[l].title.replace(`${id} · `, "")}
              </div>
              <div style={{ fontSize: "0.74rem", color: "var(--ink-soft)", lineHeight: 1.3 }}>
                {def[l].subtitle}
              </div>
            </button>
          );
        })}
      </div>

      {/* View 1: 5-Act Interactive SVG Vector Intro */}
      {viewMode === "intro" && <NarrativeIntro lang={l} onFinish={handleFinishIntro} />}

      {/* View 2: Custom Difficulty Mission Lab */}
      {viewMode === "lab" && (
        <MissionLabPanel lang={l} initialDepth={depth} onLaunch={launchRun} />
      )}

      {/* View 3: Active 3D Rover Simulation & Live Telemetry */}
      {viewMode === "play" && snapshot && (
        <>
          <div className="viewport-frame">
            <RoverViewport3D
              key={`${snapshot.missionId}-${snapshot.planetId}-${runCounter}`}
              missionId={snapshot.missionId}
              planetId={snapshot.planetId}
              touchInputRef={touchInputRef}
              reducedMotion={reducedMotion}
            />

            {/* Top HUD Resources & Controls */}
            <div className="hud-overlay-top">
              <div className="hud-pill-bar">
                <span className="hud-stat">
                  <Zap size={13} />
                  <span className={res.battery < 25 ? "hud-stat-danger" : ""}>
                    BAT {Math.round(res.battery)}%
                  </span>
                </span>
                <span className="hud-stat">
                  <Shield size={13} />
                  <span className={res.integrity < 45 ? "hud-stat-danger" : "hud-stat-ok"}>
                    INT {Math.round(res.integrity)}%
                  </span>
                </span>
                <span className="hud-stat">
                  <span className={res.thermalLoad >= 82 ? "hud-stat-danger" : ""}>
                    T⁴ {Math.round(res.thermalLoad)}%
                  </span>
                </span>
                <span className="hud-stat">
                  <Wind size={13} />
                  <span className={res.windStress > 0.85 ? "hud-stat-warn" : ""}>
                    {snapshot.telemetry.currentPoint?.windMs?.toFixed(1) || "0.0"} m/s
                  </span>
                </span>
                {snapshot.missionId === "M5" && (
                  <span className="hud-stat">
                    <span className={res.socBio < 35 ? "hud-stat-danger" : "hud-stat-ok"}>
                      SoC_bio {Math.round(res.socBio)}%
                    </span>
                  </span>
                )}
                <span className="hud-stat">
                  t={snapshot.tickIndex + 1}/{snapshot.totalTicks}
                </span>
              </div>

              <div style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start" }}>
                <NavCamMini snapshot={snapshot} lang={l} />
                <div className="hud-pill-bar" style={{ gap: "0.35rem" }}>
                  <button
                    type="button"
                    className="btn-hud-ghost"
                    style={{ padding: "0.28rem 0.55rem", fontSize: "0.74rem" }}
                    onClick={togglePauseRuntime}
                    aria-label="Pause or Resume"
                  >
                    {snapshot.paused ? <Play size={13} /> : <Pause size={13} />}
                  </button>
                  <button
                    type="button"
                    className="btn-hud-ghost"
                    style={{ padding: "0.28rem 0.55rem", fontSize: "0.74rem" }}
                    onClick={() => setMuted((m) => !m)}
                    aria-label="Toggle Sound"
                  >
                    {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  </button>
                  <button
                    type="button"
                    className="btn-hud-ghost"
                    style={{ padding: "0.28rem 0.55rem", fontSize: "0.74rem" }}
                    onClick={() => launchRun(runConfig)}
                    aria-label="Restart Mission"
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom Dynamic Alert Banner */}
            {al && (
              <div className={`hud-alert-banner hud-alert-${al.level}`} role="status">
                <span>{l === "pt" ? al.textPt : al.textEn}</span>
                {al.countdownSec !== null && al.countdownSec !== undefined && (
                  <span className="badge" style={{ padding: "0.12rem 0.45rem" }}>
                    {al.countdownSec}s
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Tactical 5-Action Engineering Strip + Mobile D-Pad */}
          <div className="rover-controls-strip">
            <div className="rover-action-grid">
              <button
                type="button"
                className={`rover-act-btn ${rv.wingsMode === "stowed" ? "on" : ""}`}
                onClick={() => {
                  dispatchAction("TOGGLE_WINGS");
                  soundEngine.playActionClick("servo");
                }}
              >
                <span className="mono">[1]</span>
                {rv.wingsMode === "stowed"
                  ? l === "pt"
                    ? "Abrir Asas"
                    : "Open Wings"
                  : l === "pt"
                  ? "Fechar Asas (Stow)"
                  : "Fold Wings (Stow)"}
              </button>

              <button
                type="button"
                className={`rover-act-btn ${!rv.mastRaised ? "on" : ""}`}
                onClick={() => {
                  dispatchAction("TOGGLE_MAST");
                  soundEngine.playActionClick("servo");
                }}
              >
                <span className="mono">[2]</span>
                {snapshot.missionId === "M4"
                  ? l === "pt"
                    ? "Erguer Mastro / Coletar"
                    : "Mast / Sample Decade"
                  : rv.mastRaised
                  ? l === "pt"
                    ? "Abaixar Suspensão"
                    : "Lower Mast / Hunker"
                  : l === "pt"
                  ? "Erguer Mastro"
                  : "Raise Mast"}
              </button>

              <button
                type="button"
                className={`rover-act-btn ${rv.wingsMode === "tilted" ? "on" : ""}`}
                onClick={() => {
                  dispatchAction("TILT_PANELS");
                  soundEngine.playActionClick("servo");
                }}
              >
                <span className="mono">[3]</span>
                {l === "pt" ? "Inclinar 35° (Limpar/IR)" : "Tilt 35° (Clean/IR)"}
              </button>

              <button
                type="button"
                className={`rover-act-btn ${snapshot.telemetry.sentinelPending ? "urgent" : ""}`}
                onClick={() => {
                  dispatchAction("SANITIZE_OPTICS");
                  soundEngine.playActionClick("purge");
                }}
              >
                <span className="mono">[4]</span>
                {l === "pt" ? "Purgar 999999999.0 / Óptica" : "Purge 999999999.0 / Optics"}
              </button>

              <button
                type="button"
                className={`rover-act-btn ${rv.tethered ? "on" : ""}`}
                onClick={() => {
                  dispatchAction("COUPLE_DISPATCH");
                  soundEngine.playActionClick("dock");
                }}
              >
                <span className="mono">[5]</span>
                {l === "pt" ? "Acoplar Cabo / Confirmar" : "Dock Cable / Submit"}
              </button>
            </div>

            {/* Touch / Mouse D-Pad for non-keyboard piloting */}
            <div className="dpad-cluster" aria-label="Touch Steering Controls">
              <span />
              <button
                type="button"
                className="dpad-key"
                aria-label="Drive Forward"
                onPointerDown={() => setTouch(1, 0)}
                onPointerUp={() => setTouch(0, 0)}
                onPointerLeave={() => setTouch(0, 0)}
              >
                ▲
              </button>
              <span />
              <button
                type="button"
                className="dpad-key"
                aria-label="Turn Left"
                onPointerDown={() => setTouch(0.8, 1)}
                onPointerUp={() => setTouch(0, 0)}
                onPointerLeave={() => setTouch(0, 0)}
              >
                ◀
              </button>
              <button
                type="button"
                className="dpad-key"
                aria-label="Reverse"
                onPointerDown={() => setTouch(-0.7, 0)}
                onPointerUp={() => setTouch(0, 0)}
                onPointerLeave={() => setTouch(0, 0)}
              >
                ▼
              </button>
              <button
                type="button"
                className="dpad-key"
                aria-label="Turn Right"
                onPointerDown={() => setTouch(0.8, -1)}
                onPointerUp={() => setTouch(0, 0)}
                onPointerLeave={() => setTouch(0, 0)}
              >
                ▶
              </button>
            </div>
          </div>

          {/* Post-Mission Debrief (if won or lost) */}
          {(snapshot.status === "won" || snapshot.status === "lost") && (
            <MissionDebrief
              snapshot={snapshot}
              lang={l}
              labUnlocked={labUnlocked}
              onRetry={() => launchRun(runConfig)}
              onNextMission={(nextId) =>
                launchRun({
                  missionId: nextId,
                  planetId: null,
                  depth,
                  severity: "P90",
                  dropoutRate: null,
                  seed: 2026,
                })
              }
              onOpenLab={() => setViewMode("lab")}
            />
          )}

          {/* Bottom Split: Live Rising Curve + Mission Briefing & Milestones */}
          <div className="game-bottom-grid">
            <LiveMissionChart snapshot={snapshot} lang={l} />

            <aside className="card" style={{ display: "grid", gap: "0.7rem", alignContent: "start" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                <span className="badge">
                  <Compass size={12} /> {activeDef[l].badge}
                </span>
                <span className="mono" style={{ fontSize: "0.74rem", color: "var(--ink-soft)" }}>
                  WASD / Arrows · Mouse drag orbit
                </span>
              </div>

              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.12rem" }}>
                {activeDef[l].title}
              </h3>

              <p style={{ fontSize: "0.86rem", color: "var(--ink-soft)", lineHeight: 1.52 }}>
                {activeDef[l].briefing}
              </p>

              {/* Zone Proximity Pill */}
              <div className="card-inset" style={{ fontSize: "0.81rem", display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.4rem" }}>
                <span>
                  <strong>{l === "pt" ? "Zona atual:" : "Current zone:"}</strong>{" "}
                  {rv.inZones.length
                    ? snapshot.zones
                        .filter((z) => rv.inZones.includes(z.id))
                        .map((z) => (l === "pt" ? z.labelPt : z.labelEn))
                        .join(", ")
                    : l === "pt"
                    ? "Terreno aberto"
                    : "Open terrain"}
                </span>
                <span className="mono" style={{ color: "var(--biome-n)" }}>
                  {l === "pt" ? "Asas:" : "Wings:"} {rv.wingsMode} · {rv.mastRaised ? "Mast UP" : "Hunkered"}
                </span>
              </div>

              {/* Depth-specific guidance */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "0.38rem 0.75rem", fontSize: "0.78rem" }}
                  onClick={() => {
                    setShowHint((s) => !s);
                    setUsedHint(true);
                    markHintUsed();
                  }}
                >
                  <HelpCircle size={14} /> {l === "pt" ? "Dica Científica" : "Field Hint"}
                </button>
                <span className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>
                  {l === "pt" ? "Vetor Θ:" : "Vector Θ:"} g={snapshot.planet.g} · ρ={snapshot.planet.rho}
                </span>
              </div>

              {showHint && (
                <div className="card-inset" style={{ fontSize: "0.82rem", color: "var(--biome-ne)" }}>
                  <Sparkles size={13} style={{ verticalAlign: "middle", marginRight: "0.3rem" }} />
                  {activeDef[l].depthHint?.[depth] || activeDef[l].depthHint?.explorer}
                </div>
              )}
            </aside>
          </div>
        </>
      )}

      {/* Earned Rover Field Badges Strip */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.65rem" }}>
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
            <Award size={17} color="var(--biome-se)" />
            {l === "pt" ? "Medalhas de Campo 3D (Compartilhadas com Academy)" : "3D Field Badges (Shared with Academy Profile)"}
          </h3>
          <span className="mono" style={{ fontSize: "0.75rem", color: "var(--ink-soft)" }}>
            {(gameState.badges || []).length}/{GAME_BADGES.length} {l === "pt" ? "desbloqueadas" : "unlocked"}
          </span>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
          {GAME_BADGES.map((b) => {
            const earned = (gameState.badges || []).includes(b.id);
            return (
              <div
                key={b.id}
                className={`badge ${earned ? "live" : ""}`}
                style={{ opacity: earned ? 1 : 0.52 }}
                title={b.description}
              >
                <Sliders size={12} /> {b.missionId}: {b.title}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
