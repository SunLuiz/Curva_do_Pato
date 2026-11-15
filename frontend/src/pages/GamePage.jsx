import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Award,
  Camera,
  CheckCircle2,
  Compass,
  Eye,
  FlaskConical,
  Gamepad2,
  Globe,
  GraduationCap,
  HelpCircle,
  Home,
  Lock,
  Maximize,
  Minimize,
  Music,
  Pause,
  Play,
  RotateCcw,
  Shield,
  Sliders,
  Sparkles,
  Unlock,
  UserCheck,
  Volume2,
  VolumeX,
  Wind,
  XCircle,
  Zap,
} from "lucide-react";
import "../game/game.css";
import NarrativeIntro from "../game/NarrativeIntro";
import StartMenuModal from "../game/StartMenuModal";
import RoverViewport3D from "../game/scene/RoverViewport3D";
import LiveMissionChart from "../game/hud/LiveMissionChart";
import NavCamMini from "../game/hud/NavCamMini";
import MissionDebrief from "../game/hud/MissionDebrief";
import MissionLabPanel from "../game/hud/MissionLabPanel";
import { MISSION_DEFS, MISSION_ORDER } from "../game/missions/missionParams";
import { PLANETS } from "../game/sim/planetaryPhysics";
import { computeSnapshotAgentState } from "../engine/mptoEngine";
import {
  clearRuntime,
  dispatchAction,
  markHintUsed,
  startMissionRuntime,
  togglePauseRuntime,
  useGameSnapshot,
} from "../game/store";
import { soundEngine } from "../game/soundEngine";
import { MODULES, getModuleById } from "../academy/questions";
import { validatePilotName } from "../academy/storage";
import { BADGES, DEPTH_TRACKS, GAME_BADGES } from "../academy/xp";
import ModuleRunner from "../components/ModuleRunner";
import ProfileCard from "../components/ProfileCard";
import StarBar from "../components/StarBar";
import HallOfFame from "../components/HallOfFame";
import DiplomaCanvas from "../components/DiplomaCanvas";

function getMissionObjectives(snapshot, lang = "en") {
  const l = lang === "pt" ? "pt" : "en";
  const mId = snapshot?.missionId || "M1";
  const prog = snapshot?.progress || {};
  const res = snapshot?.resources || {};
  const rv = snapshot?.rover || {};
  const pt = snapshot?.telemetry?.currentPoint;

  if (mId === "M1") {
    const s1Done = res.thermalLoad < 85 && (rv.wingsMode === "stowed" || rv.inZones?.includes("shadow_rock"));
    const s2Done = Boolean(prog.bessCharged);
    return [
      {
        id: "m1-s1",
        label: l === "pt" ? "Recolha asas [1] ou vá à sombra no pico solar (>760 W/m²)" : "Fold wings [1] or seek shadow in peak solar (>760 W/m²)",
        done: s1Done,
        active: !s1Done && (pt?.primaryVal >= 720 || res.thermalLoad >= 70),
      },
      {
        id: "m1-s2",
        label: l === "pt" ? "Acople [5] na Estação BESS para carregar a bateria" : "Dock [5] at BESS Station to charge battery",
        done: s2Done,
        active: s1Done && !s2Done,
      },
    ];
  }

  if (mId === "M2") {
    const s1Done = Boolean(prog.cleaned);
    const s2Done = Boolean(prog.sheltered);
    const s3Done = rv.wingsMode === "stowed" && !rv.mastRaised && s2Done;
    return [
      {
        id: "m2-s1",
        label: l === "pt" ? "Suba à Crista e incline painéis [3] para limpar poeira (<28%)" : "Climb Ridge & tilt panels [3] to clean dust (<28%)",
        done: s1Done,
        active: !s1Done,
      },
      {
        id: "m2-s2",
        label: l === "pt" ? "Entre no Abrigo da Rocha antes da rajada (>3.8 m/s)" : "Enter Rock Shelter before peak gust (>3.8 m/s)",
        done: s2Done,
        active: s1Done && !s2Done,
      },
      {
        id: "m2-s3",
        label: l === "pt" ? "Feche as asas [1] e abaixe o mastro [2]" : "Fold wings [1] and lower mast [2]",
        done: s3Done,
        active: s2Done && !s3Done,
      },
    ];
  }

  if (mId === "M3") {
    const s1Done = (prog.sentinelsPurged || 0) >= 1;
    const s2Done = Boolean(prog.beaconLocked);
    return [
      {
        id: "m3-s1",
        label: l === "pt" ? "Quando surgir o erro 999999999.0, aperte [4] Purgar" : "When sentinel error 999999999.0 appears, press [4] Purge",
        done: s1Done,
        active: Boolean(snapshot?.telemetry?.sentinelPending),
      },
      {
        id: "m3-s2",
        label: l === "pt" ? "Evite a Cratera Alpha (>40% patinagem) e acople [5] no Farol EDL" : "Avoid Alpha Crater (>40% slip) and dock [5] at EDL Beacon",
        done: s2Done,
        active: s1Done && !s2Done,
      },
    ];
  }

  if (mId === "M4") {
    const sampledCount = prog.sampledDecades?.length || 0;
    const s1Done = sampledCount >= 3;
    const s2Done = Boolean(prog.dockedDriver);
    return [
      {
        id: "m4-s1",
        label: l === "pt" ? `Amostre as 3 décadas erguendo o mastro [2] (${sampledCount}/3)` : `Sample all 3 decades with mast [2] (${sampledCount}/3)`,
        done: s1Done,
        active: !s1Done,
      },
      {
        id: "m4-s2",
        label: l === "pt" ? "Acople [5] no vetor real (Aerossóis/Céu Limpo, não Nuvens)" : "Dock [5] at true driver (Aerosols/Clear-Sky, not Clouds)",
        done: s2Done,
        active: s1Done && !s2Done,
      },
    ];
  }

  if (mId === "M5") {
    const s1Done = Boolean(prog.rimHarvested);
    const s2Done = Boolean(prog.greenhouseSecured);
    const s3Done = Boolean(prog.lavaTubeSheltered);
    return [
      {
        id: "m5-s1",
        label: l === "pt" ? "Capte Albedo IR (+13%) na Borda da Cratera (Abrir [1] + Inclinar [3])" : "Harvest Crater Rim IR albedo (Open [1] + Tilt [3])",
        done: s1Done,
        active: !s1Done,
      },
      {
        id: "m5-s2",
        label: l === "pt" ? "Acople [5] na Estufa OSD-615 para manter o SoC_bio" : "Dock [5] at Greenhouse OSD-615 to secure SoC_bio",
        done: s2Done,
        active: s1Done && !s2Done,
      },
      {
        id: "m5-s3",
        label: l === "pt" ? "Feche asas [1], abaixe mastro [2] e abrigue-se no Tubo de Lava" : "Fold [1], lower [2] and shelter inside Lava Tube",
        done: s3Done,
        active: s2Done && !s3Done,
      },
    ];
  }

  return [];
}

function parseGameLaunchQuery(searchStr) {
  if (!searchStr || typeof searchStr !== "string") return null;
  const qp = new URLSearchParams(searchStr);
  const rawMission = qp.get("mission");
  const rawPlanet = qp.get("planet");
  const rawDepth = qp.get("depth");
  const rawTau = qp.get("tau");
  const missionId = MISSION_ORDER.includes(rawMission) ? rawMission : null;
  const planetId = rawPlanet && PLANETS[rawPlanet] ? rawPlanet : null;
  const depth = DEPTH_TRACKS.some((t) => t.id === rawDepth) ? rawDepth : null;
  const parsedTau = rawTau !== null && rawTau !== "" ? Number(rawTau) : null;
  const tauOverride =
    parsedTau !== null && Number.isFinite(parsedTau) && parsedTau >= 0.05 && parsedTau <= 5.0
      ? parsedTau
      : null;

  if (!missionId && !planetId && !depth && tauOverride === null) return null;
  return { missionId, planetId, depth, tauOverride };
}

export default function GamePage({
  profile,
  hallOfFame = [],
  onSaveProfile,
  onForgetProfile,
  onOpenCockpit,
  onNavigate,
  launchSearch = "",
  lang = "en",
  setLang,
}) {
  const l = lang === "pt" ? "pt" : "en";
  const gameState = profile.game || {};
  const initialQuery = parseGameLaunchQuery(
    launchSearch || (typeof window !== "undefined" ? window.location.search : "")
  );
  const [viewMode, setViewMode] = useState(initialQuery ? "play" : "start"); // start | intro | play | lab
  const [selectedMissionId, setSelectedMissionId] = useState(initialQuery?.missionId || "M1");
  const [depth, setDepth] = useState(initialQuery?.depth || profile.depth || "explorer");
  const [usedHint, setUsedHint] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [muted, setMuted] = useState(() => soundEngine.getState().muted);
  const [volume, setVolume] = useState(() => soundEngine.getState().volume);
  const [musicEnabled, setMusicEnabled] = useState(() => soundEngine.getState().musicEnabled);
  const [camMode, setCamMode] = useState("chase"); // chase | survey
  const [runCounter, setRunCounter] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [inGameQuizModuleId, setInGameQuizModuleId] = useState(null);
  const [browserQuizModuleId, setBrowserQuizModuleId] = useState(null);
  const [rewardedIds, setRewardedIds] = useState({});
  const [nameGateAlert, setNameGateAlert] = useState(false);

  const viewportRef = useRef(null);
  const profileSectionRef = useRef(null);
  const browserQuizSectionRef = useRef(null);
  const pilotNameRef = useRef(profile.name || "");
  const touchInputRef = useRef({ throttle: 0, steer: 0 });
  const scoredRunRef = useRef(-1);
  const snapshot = useGameSnapshot();

  useEffect(() => {
    pilotNameRef.current = profile.name || "";
  }, [profile.name]);

  const toggleCamMode = useCallback(() => {
    setCamMode((m) => (m === "chase" ? "survey" : "chase"));
  }, []);

  const toggleFullscreen = useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const onFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const [runConfig, setRunConfig] = useState({
    missionId: initialQuery?.missionId || "M1",
    planetId: initialQuery?.planetId || null,
    depth: initialQuery?.depth || profile.depth || "explorer",
    tauOverride: initialQuery?.tauOverride ?? null,
    severity: "P90",
    dropoutRate: null,
    seed: 2026,
  });

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches,
    []
  );

  useEffect(() => {
    const sync = (snap) => {
      setMuted(snap.muted);
      setVolume(snap.volume);
      setMusicEnabled(snap.musicEnabled);
    };
    return soundEngine.subscribe(sync);
  }, []);

  useEffect(() => {
    soundEngine.setMuted(muted);
  }, [muted]);

  useEffect(() => {
    soundEngine.setVolume(volume);
  }, [volume]);

  useEffect(() => {
    soundEngine.setMusicEnabled(musicEnabled);
  }, [musicEnabled]);

  useEffect(() => {
    if (viewMode !== "play" && viewMode !== "start") {
      soundEngine.stopAllLoops();
    }
  }, [viewMode]);

  useEffect(() => () => soundEngine.stopAllLoops(), []);

  const handleToggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  const handleChangeVolume = useCallback(
    (nextVol) => {
      setVolume(nextVol);
      if (nextVol > 0 && muted) setMuted(false);
    },
    [muted]
  );

  const handleToggleMusic = useCallback(() => {
    setMusicEnabled((prev) => !prev);
  }, []);

  const handleChangeLang = useCallback(
    (nextLang) => {
      setLang?.(nextLang === "pt" ? "pt" : "en");
    },
    [setLang]
  );

  const handleSavePilotName = useCallback(
    (cleanName) => {
      pilotNameRef.current = cleanName;
      setNameGateAlert(false);
      onSaveProfile({ ...profile, name: cleanName });
    },
    [profile, onSaveProfile]
  );

  const launchRun = useCallback(
    (cfg) => {
      const isDeepLinked = Boolean(cfg.allowAnonymous || initialQuery);
      const hasName = Boolean(
        cfg.verifiedPilotName ||
          validatePilotName(pilotNameRef.current).valid ||
          validatePilotName(profile.name).valid
      );
      if (!hasName && !gameState.judgeUnlock && !isDeepLinked) {
        setSelectedMissionId(cfg.missionId || "M1");
        setNameGateAlert((n) => (typeof n === "number" ? n + 1 : 1));
        setViewMode("start");
        return;
      }
      setNameGateAlert(false);

      const nextCfg = {
        missionId: cfg.missionId || "M1",
        planetId: cfg.planetId || null,
        depth: cfg.depth || depth,
        tauOverride: cfg.tauOverride ?? null,
        severity: cfg.severity || "P90",
        dropoutRate: cfg.dropoutRate ?? null,
        seed: cfg.seed || 2026,
      };
      setSelectedMissionId(nextCfg.missionId);
      setRunConfig(nextCfg);
      setShowHint(false);
      setUsedHint(false);
      setInGameQuizModuleId(null);
      setRunCounter((c) => c + 1);
      startMissionRuntime({
        ...nextCfg,
        attempt: (gameState.missions?.[nextCfg.missionId]?.attempts || 0) + 1,
        usedHint: false,
        streak: profile.streak || 0,
      });
      setViewMode("play");
    },
    [depth, gameState.missions, gameState.judgeUnlock, initialQuery, profile.name, profile.streak]
  );

  const lastLaunchSearchRef = useRef(launchSearch);
  useEffect(() => {
    if (launchSearch === lastLaunchSearchRef.current) return;
    lastLaunchSearchRef.current = launchSearch;
    const parsed = parseGameLaunchQuery(launchSearch);
    if (parsed) {
      if (parsed.depth) setDepth(parsed.depth);
      launchRun({
        missionId: parsed.missionId || "M5",
        planetId: parsed.planetId || null,
        depth: parsed.depth || depth,
        tauOverride: parsed.tauOverride ?? null,
        severity: "P90",
        dropoutRate: null,
        seed: 2026,
        allowAnonymous: true,
      });
    }
  }, [launchSearch, depth, launchRun]);

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

  const judgeUnlock = Boolean(gameState.judgeUnlock);
  const completedCount = MISSION_ORDER.filter((id) => gameState.missions?.[id]?.won).length;
  const labUnlocked = judgeUnlock || (Boolean(gameState.missions?.M1?.won) && Boolean(gameState.missions?.M2?.won));

  const isMissionUnlocked = (id) => {
    if (judgeUnlock || id === "M1" || runConfig.missionId === id) return true;
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
  const objectives = useMemo(() => getMissionObjectives(snapshot, l), [snapshot, l]);
  const agentOrchestration = useMemo(() => computeSnapshotAgentState(snapshot), [snapshot]);

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
              <Zap size={12} /> {profile.xp || 0} XP · {profile.stars || 0} ★ · {completedCount}/5 3D
            </span>
            {snapshot?.planet && (
              <span className="badge live">
                Θ: {snapshot.planet.body} · g={snapshot.planet.g} · τ₀={snapshot.planet.baseTau}
              </span>
            )}
            {profile.name?.trim() ? (
              <span className="badge sig" title={l === "pt" ? "Piloto registrado para certificado e ranking" : "Registered trainee for certificate and ranking"}>
                <UserCheck size={12} /> {profile.name}
              </span>
            ) : (
              <button
                type="button"
                className="badge cached"
                style={{ cursor: "pointer" }}
                onClick={() => {
                  setViewMode("start");
                  setNameGateAlert((n) => (typeof n === "number" ? n + 1 : 1));
                }}
              >
                {l === "pt" ? "Informe seu nome no Menu Start ↑" : "Enter pilot name in Start Menu"}
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
            className={viewMode === "start" ? "btn-primary" : "btn-secondary"}
            style={{ padding: "0.45rem 0.8rem", fontSize: "0.8rem" }}
            onClick={() => setViewMode("start")}
          >
            <Home size={14} /> {l === "pt" ? "Menu Start" : "Start Menu"}
          </button>

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
          const quizPassed = Boolean(profile.mastery?.[id]?.passed);
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
                <div style={{ display: "flex", gap: "0.3rem" }}>
                  {rec?.won && (
                    <span className="badge live" style={{ padding: "0.1rem 0.35rem", fontSize: "0.65rem" }} title="3D Rover Mission Won">
                      <CheckCircle2 size={10} /> {rec.stars || 1}★
                    </span>
                  )}
                  {quizPassed && (
                    <span className="badge sig" style={{ padding: "0.1rem 0.35rem", fontSize: "0.65rem" }} title="Scientific Quiz Passed">
                      <GraduationCap size={10} />
                    </span>
                  )}
                  {!unlocked && <Lock size={13} color="var(--ink-soft)" />}
                </div>
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

      {/* View 0: Start Menu with Ocarina Theme, Pilot Verification & Language Settings */}
      {viewMode === "start" && (
        <StartMenuModal
          lang={l}
          onChangeLang={handleChangeLang}
          muted={muted}
          onToggleMute={handleToggleMute}
          volume={volume}
          onChangeVolume={handleChangeVolume}
          musicEnabled={musicEnabled}
          onToggleMusic={handleToggleMusic}
          selectedMissionId={selectedMissionId}
          pilotName={profile.name || ""}
          onSavePilotName={handleSavePilotName}
          nameGateAlert={nameGateAlert}
          onStartPlay={(verifiedName) =>
            launchRun({
              ...runConfig,
              missionId: selectedMissionId,
              verifiedPilotName: verifiedName,
            })
          }
          onOpenIntro={() => {
            soundEngine.stopMusic();
            setViewMode("intro");
          }}
        />
      )}

      {/* View 1: 5-Act Interactive SVG Vector Intro */}
      {viewMode === "intro" && (
        <NarrativeIntro lang={l} muted={muted} onToggleMute={handleToggleMute} onFinish={handleFinishIntro} />
      )}

      {/* View 2: Custom Difficulty Mission Lab */}
      {viewMode === "lab" && (
        <MissionLabPanel lang={l} initialDepth={depth} onLaunch={launchRun} />
      )}

      {/* View 3: Active 3D Rover Simulation & Live Telemetry (Unified Fullscreen Game Stage) */}
      {viewMode === "play" && snapshot && (
        <div
          ref={viewportRef}
          className={`viewport-frame ${isFullscreen ? "is-fullscreen" : ""}`}
          aria-label="3D Rover Pilot Viewport"
        >
          <RoverViewport3D
            key={`${snapshot.missionId}-${snapshot.planetId}-${runCounter}`}
            missionId={snapshot.missionId}
            planetId={snapshot.planetId}
            lang={l}
            camMode={camMode}
            onToggleCamMode={toggleCamMode}
            onToggleFullscreen={toggleFullscreen}
            onToggleMute={handleToggleMute}
            onRetry={() => launchRun(runConfig)}
            touchInputRef={touchInputRef}
            reducedMotion={reducedMotion}
          />

          {/* Top HUD Overlay (Resources + Objectives + Minimap & Quick Controls) */}
          <div className="hud-overlay-top">
            <div style={{ display: "grid", gap: "0.45rem" }}>
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

              {/* In-Game Objective Checklist inside HUD */}
              <div className="hud-objectives-box">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.72rem", color: "var(--hud-cyan)", fontWeight: 700 }}>
                  <span>{l === "pt" ? "CHECKLIST DA MISSÃO" : "MISSION CHECKLIST"}</span>
                  <span>{objectives.filter((o) => o.done).length}/{objectives.length}</span>
                </div>
                {objectives.map((obj, i) => (
                  <div key={obj.id} className={`hud-step-row ${obj.done ? "done" : obj.active ? "active" : ""}`}>
                    <span>{obj.done ? "✓" : `${i + 1}.`}</span>
                    <span>{obj.label}</span>
                  </div>
                ))}
              </div>

              {/* Read-Only 7-Agent OMNI Orchestrator + Statistical Auditor Live Consensus */}
              {agentOrchestration && (
                <div className="hud-agent-strip" aria-label="7-Agent OMNI Live Consensus">
                  <span style={{ color: "var(--hud-cyan)", fontWeight: 700 }}>
                    OMNI {Math.round((agentOrchestration.consensusScore || 0) * 100)}%
                  </span>
                  <span
                    className={`hud-agent-chip ${
                      agentOrchestration.activeVetoes?.length > 0 ? "is-veto" : "is-ok"
                    }`}
                    title={
                      l === "pt"
                        ? agentOrchestration.auditorRule.statusPt
                        : agentOrchestration.auditorRule.statusEn
                    }
                  >
                    {agentOrchestration.activeVetoes?.length > 0
                      ? `VETO: ${agentOrchestration.activeVetoes.join(", ")}`
                      : l === "pt"
                        ? "Auditor: NOMINAL"
                        : "Auditor: NOMINAL"}
                  </span>
                  {agentOrchestration.agents.map((ag) => {
                    const cls = ag.veto ? "is-veto" : ag.vote >= 0.55 ? "is-watch" : "is-ok";
                    const shortName = ag.name.split(" ")[0];
                    return (
                      <span
                        key={ag.id}
                        className={`hud-agent-chip ${cls}`}
                        title={`${ag.name} (#${ag.frontierId}): ${l === "pt" ? ag.signalPt : ag.signalEn}`}
                      >
                        {shortName} {Math.round(ag.vote * 100)}%
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "0.45rem", alignItems: "flex-start" }}>
              <NavCamMini snapshot={snapshot} lang={l} />
              <div className="hud-pill-bar" style={{ gap: "0.35rem" }}>
                <button
                  type="button"
                  className="hud-cam-btn"
                  onClick={toggleCamMode}
                  title={l === "pt" ? "Alternar câmera [C]" : "Toggle camera [C]"}
                >
                  <Camera size={13} />
                  <span>[C] {camMode === "chase" ? "Chase" : "Survey"}</span>
                </button>
                <button
                  type="button"
                  className="hud-cam-btn"
                  onClick={toggleFullscreen}
                  title={l === "pt" ? "Modo Tela Cheia [F]" : "Toggle Fullscreen [F]"}
                >
                  {isFullscreen ? <Minimize size={13} /> : <Maximize size={13} />}
                  <span>[F] {isFullscreen ? (l === "pt" ? "Janela" : "Window") : (l === "pt" ? "Tela Cheia" : "Fullscreen")}</span>
                </button>
                <button
                  type="button"
                  className="btn-hud-ghost"
                  style={{ padding: "0.28rem 0.55rem", fontSize: "0.74rem" }}
                  onClick={togglePauseRuntime}
                  aria-label="Pause or Resume"
                  title={l === "pt" ? "Play / Pause [P]" : "Play / Pause [P]"}
                >
                  {snapshot.paused ? <Play size={13} /> : <Pause size={13} />}
                </button>
                <button
                  type="button"
                  className={`hud-cam-btn ${!muted ? "active-cyan" : ""}`}
                  style={{ padding: "0.28rem 0.52rem", fontSize: "0.72rem" }}
                  onClick={handleToggleMute}
                  aria-label="Toggle Sound"
                  title={l === "pt" ? "Ligar / Desligar Som [M]" : "Toggle Sound [M]"}
                >
                  {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
                  <span>{muted ? "OFF" : "ON"}</span>
                </button>
                <button
                  type="button"
                  className={`hud-cam-btn ${musicEnabled && !muted ? "active-cyan" : ""}`}
                  style={{ padding: "0.28rem 0.5rem", fontSize: "0.72rem" }}
                  onClick={handleToggleMusic}
                  aria-label="Toggle Ocarina Melody"
                  title={l === "pt" ? "Ligar / Desligar Canção Adaptativa" : "Toggle Adaptive Song"}
                >
                  <Music size={12} />
                </button>
                <button
                  type="button"
                  className="hud-cam-btn"
                  style={{ padding: "0.28rem 0.52rem", fontSize: "0.72rem" }}
                  onClick={() => handleChangeLang(l === "pt" ? "en" : "pt")}
                  aria-label="Toggle Language"
                  title={l === "pt" ? "Mudar idioma PT-BR / EN" : "Switch language EN / PT-BR"}
                >
                  <Globe size={12} />
                  <span>{l === "pt" ? "PT" : "EN"}</span>
                </button>
                <button
                  type="button"
                  className="btn-hud-ghost"
                  style={{ padding: "0.28rem 0.52rem", fontSize: "0.74rem" }}
                  onClick={() => {
                    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => {});
                    setViewMode("start");
                  }}
                  aria-label="Start Menu"
                  title={l === "pt" ? "Voltar ao Menu Start" : "Back to Start Menu"}
                >
                  <Home size={13} />
                </button>
                <button
                  type="button"
                  className="btn-hud-ghost"
                  style={{ padding: "0.28rem 0.55rem", fontSize: "0.74rem" }}
                  onClick={() => launchRun(runConfig)}
                  aria-label="Restart Mission (R)"
                  title="Restart Mission (R)"
                >
                  <RotateCcw size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Dynamic Alert Banner in HUD */}
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

          {/* Unified Bottom Dock: Live Rising Curve + 5 Physical Controls inside Viewport */}
          <div className="hud-bottom-dock">
            <LiveMissionChart snapshot={snapshot} lang={l} hudMode={true} />

            <div className="hud-controls-dock">
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
                      ? "Mastro / Amostrar"
                      : "Mast / Sample"
                    : rv.mastRaised
                    ? l === "pt"
                      ? "Abaixar Suspensão"
                      : "Lower Mast"
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
                  {l === "pt" ? "Inclinar 35°" : "Tilt 35°"}
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
                  {l === "pt" ? "Purgar 999999999.0" : "Purge Sentinel"}
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
                  {l === "pt" ? "Acoplar / Enviar" : "Dock / Submit"}
                </button>
              </div>

              {/* Dpad for touch & mouse */}
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
          </div>

          {/* Modal Pop-up 1: Post-Mission Debrief (Failure diagnosis or Victory audit) */}
          {(snapshot.status === "won" || snapshot.status === "lost") && !inGameQuizModuleId && (
            <MissionDebrief
              snapshot={snapshot}
              lang={l}
              labUnlocked={labUnlocked}
              quizPassed={Boolean(profile.mastery?.[snapshot.missionId]?.passed)}
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
              onOpenQuiz={() => setInGameQuizModuleId(snapshot.missionId)}
            />
          )}

          {/* Modal Pop-up 2: In-Game Scientific Quiz directly inside 3D Viewport */}
          {inGameQuizModuleId && (
            <div className="hud-modal-backdrop" role="dialog" aria-modal="true" aria-label="In-Game Mission Quiz">
              <div className="hud-modal-card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <span className="badge sig">
                      <GraduationCap size={14} /> {l === "pt" ? `Questionário In-Game · ${inGameQuizModuleId}` : `In-Game Quiz · ${inGameQuizModuleId}`}
                    </span>
                    <strong style={{ fontSize: "1.05rem" }}>{MISSION_DEFS[inGameQuizModuleId]?.[l]?.title}</strong>
                  </div>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "0.3rem 0.65rem", fontSize: "0.78rem" }}
                    onClick={() => setInGameQuizModuleId(null)}
                  >
                    ✕ {l === "pt" ? "Voltar ao Rover" : "Back to Rover"}
                  </button>
                </div>
                <ModuleRunner
                  mod={getModuleById(inGameQuizModuleId)}
                  profile={profile}
                  onRecordAttempt={handleRecordAttempt}
                  onCompleteModule={handleCompleteModule}
                  onOpenCockpit={onOpenCockpit}
                  onClose={() => setInGameQuizModuleId(null)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* SECTION BELOW 3D VIEWPORT: Learning Metrics, Browser Quiz Option, Merits & Diploma */}
      <div style={{ display: "grid", gap: "1.25rem", marginTop: "0.5rem" }}>
        {/* 1. Learning Metrics & Mission Matrix (3D Mission + Scientific Form Status) */}
        <div className="card">
          <div className="section-header" style={{ marginBottom: "0.85rem" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span className="badge sig"><Award size={14} /> {l === "pt" ? "MATRIZ DE APRENDIZADO & MISSÕES" : "LEARNING METRICS & MISSIONS MATRIX"}</span>
                <span className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-soft)" }}>
                  {completedCount}/5 3D · {Object.values(profile.mastery || {}).filter((m) => m?.passed).length}/5 {l === "pt" ? "Formulários" : "Forms"}
                </span>
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", marginTop: "0.35rem" }}>
                {l === "pt" ? "Progresso Integrado: Pilotagem em Campo 3D & Validação Científica" : "Integrated Progress: 3D Field Piloting & Scientific Validation"}
              </h3>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "0.75rem" }}>
            {MISSION_ORDER.map((id) => {
              const def = MISSION_DEFS[id];
              const rec = gameState.missions?.[id];
              const mastery = profile.mastery?.[id];
              const won3D = Boolean(rec?.won);
              const quizPassed = Boolean(mastery?.passed);

              return (
                <div key={id} className="card-inset" style={{ display: "grid", gap: "0.45rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: "0.92rem", color: "var(--ink)" }}>{id} · {def[l].title.split("·")[1]?.trim() || def[l].title}</strong>
                    <span className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>{def.primaryUnit}</span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                    <span>🎮 {l === "pt" ? "Objetivo 3D:" : "3D Pilot:"}</span>
                    <span className={`badge ${won3D ? "live" : "null"}`} style={{ fontSize: "0.72rem" }}>
                      {won3D ? `✓ ${rec.stars || 1}★` : l === "pt" ? "Pendente" : "Pending"}
                    </span>
                  </div>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.8rem" }}>
                    <span>📋 {l === "pt" ? "Formulário Científico:" : "Science Form:"}</span>
                    <span className={`badge ${quizPassed ? "sig" : "null"}`} style={{ fontSize: "0.72rem" }}>
                      {quizPassed ? `✓ ${Math.round((mastery?.score || 1) * 100)}%` : l === "pt" ? "Pendente" : "Pending"}
                    </span>
                  </div>

                  <div style={{ display: "flex", gap: "0.45rem", marginTop: "0.35rem" }}>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ flex: 1, padding: "0.35rem 0.5rem", fontSize: "0.74rem" }}
                      onClick={() => {
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        launchRun({ missionId: id, planetId: null, depth, severity: "P90", dropoutRate: null, seed: 2026 });
                      }}
                    >
                      <Gamepad2 size={12} /> {l === "pt" ? "Jogar 3D" : "Play 3D"}
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ flex: 1, padding: "0.35rem 0.5rem", fontSize: "0.74rem" }}
                      onClick={() => {
                        setBrowserQuizModuleId(id);
                        setTimeout(() => browserQuizSectionRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
                      }}
                    >
                      <GraduationCap size={12} /> {l === "pt" ? "Questionário" : "Take Quiz"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Optional Browser-based Quiz Runner */}
        <div ref={browserQuizSectionRef}>
          {browserQuizModuleId && (
            <div className="card" style={{ borderLeft: "4px solid var(--biome-se)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className="badge sig"><GraduationCap size={14} /> {l === "pt" ? `Questionário via Navegador · ${browserQuizModuleId}` : `Browser Quiz · ${browserQuizModuleId}`}</span>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem" }}>
                    {MISSION_DEFS[browserQuizModuleId]?.[l]?.title}
                  </h3>
                </div>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "0.3rem 0.65rem", fontSize: "0.76rem" }}
                  onClick={() => setBrowserQuizModuleId(null)}
                >
                  ✕ {l === "pt" ? "Fechar Questionário" : "Close Quiz"}
                </button>
              </div>

              <ModuleRunner
                mod={getModuleById(browserQuizModuleId)}
                profile={profile}
                onRecordAttempt={handleRecordAttempt}
                onCompleteModule={handleCompleteModule}
                onOpenCockpit={onOpenCockpit}
                onClose={() => setBrowserQuizModuleId(null)}
              />
            </div>
          )}
        </div>

        {/* 3. Pilot Profile Card & StarBar */}
        <div ref={profileSectionRef}>
          <StarBar profile={profile} />
          <ProfileCard profile={profile} onSave={onSaveProfile} onForget={onForgetProfile} />
        </div>

        {/* 4. Unified Merits & Badges */}
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
            <div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.12rem", display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
                <Award size={18} color="var(--biome-se)" />
                {l === "pt" ? "Galeria de Méritos & Medalhas Unificadas" : "Unified Merits & Badges Gallery"}
              </h3>
              <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
                {l === "pt"
                  ? "Conquistas desbloqueadas pela pilotagem em campo 3D e maestria nos questionários científicos."
                  : "Achievements unlocked via 3D field piloting and scientific quiz mastery."}
              </div>
            </div>
            <span className="mono" style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
              {(gameState.badges || []).length + (profile.badges || []).length}/{GAME_BADGES.length + BADGES.length} {l === "pt" ? "desbloqueadas" : "unlocked"}
            </span>
          </div>

          <div style={{ display: "grid", gap: "0.85rem" }}>
            <div>
              <strong style={{ fontSize: "0.85rem", color: "var(--biome-n)", display: "block", marginBottom: "0.4rem" }}>
                🎮 {l === "pt" ? "Medalhas de Campo 3D (Simulador Rover):" : "3D Field Badges (Rover Simulator):"}
              </strong>
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

            <div>
              <strong style={{ fontSize: "0.85rem", color: "var(--sig)", display: "block", marginBottom: "0.4rem" }}>
                📋 {l === "pt" ? "Medalhas de Maestria Científica (Questionários):" : "Scientific Mastery Badges (Quizzes):"}
              </strong>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
                {BADGES.map((b) => {
                  const earned = (profile.badges || []).includes(b.id);
                  return (
                    <div
                      key={b.id}
                      className={`badge ${earned ? "sig" : ""}`}
                      style={{ opacity: earned ? 1 : 0.52 }}
                      title={b.description}
                    >
                      <GraduationCap size={12} /> {b.moduleId}: {b.title}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 5. Ranking (Hall of Fame) & Strict Official Diploma */}
        <div className="grid grid-2" style={{ alignItems: "start" }}>
          <HallOfFame rows={hallOfFame} currentName={profile.name} />
          <DiplomaCanvas profile={profile} lang={lang} />
        </div>
      </div>
    </div>
  );
}
