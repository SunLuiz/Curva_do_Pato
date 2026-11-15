import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Globe,
  Maximize2,
  Minimize2,
  Play,
  Settings,
  Sparkles,
  UserCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { validatePilotName } from "../academy/storage";
import AudioSettingsMenu from "../components/AudioSettingsMenu";
import {
  AUDIO_STUDIO_PRESETS,
  SOUND_THEMES,
  getTimbreProfile,
  soundEngine,
} from "./soundEngine";

export default function StartMenuModal({
  lang = "en",
  onChangeLang,
  muted = false,
  onToggleMute,
  volume = 0.78,
  onChangeVolume,
  musicEnabled = true,
  onToggleMusic,
  isFullscreen = false,
  onToggleFullscreen,
  onEnterFullscreen,
  startInFullscreen = false,
  onToggleStartInFullscreen,
  selectedMissionId = "M1",
  pilotName = "",
  onSavePilotName,
  nameGateAlert = false,
  onStartPlay,
  onOpenIntro,
}) {
  const l = lang === "pt" ? "pt" : "en";
  const nameInputRef = useRef(null);
  const launchTimerRef = useRef(null);
  const [nameInput, setNameInput] = useState(pilotName || "");
  const [submittedError, setSubmittedError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [audioSnap, setAudioSnap] = useState(() => soundEngine.getState());
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    return () => {
      if (launchTimerRef.current) {
        clearTimeout(launchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setNameInput(pilotName || "");
  }, [pilotName]);

  useEffect(() => {
    setAudioSnap(soundEngine.getState());
    return soundEngine.subscribe(setAudioSnap);
  }, []);

  useEffect(() => {
    if (nameGateAlert) {
      setSubmittedError(true);
      nameInputRef.current?.focus();
    }
  }, [nameGateAlert]);

  useEffect(() => {
    if (!settingsOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setSettingsOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen]);

  const nameCheck = validatePilotName(nameInput);
  const savedCheck = validatePilotName(pilotName);
  const isVerifiedSaved =
    nameCheck.valid && savedCheck.valid && nameCheck.cleanName === savedCheck.cleanName;

  const preferredSongId = audioSnap.activeSongId || "title";

  // Attempt starting the chosen opening score on Start Menu entry;
  // if browser autoplay suspends Web Audio, arm one-time gesture unlock.
  useEffect(() => {
    if (muted || !musicEnabled) {
      soundEngine.stopMusic();
      return undefined;
    }

    const tryStartTheme = () => {
      const ctx = soundEngine.ensureCtx();
      if (!ctx) return;
      if (ctx.state === "running") {
        soundEngine.playTheme(preferredSongId, { loop: true });
        setAutoplayBlocked(false);
      } else {
        setAutoplayBlocked(true);
      }
    };

    tryStartTheme();

    const unlockOnGesture = () => {
      if (muted || !musicEnabled) return;
      const ctx = soundEngine.ensureCtx();
      if (!ctx) return;
      ctx.resume?.().then(() => {
        if (!soundEngine.getState().activeTheme) {
          soundEngine.playTheme(soundEngine.getState().activeSongId || "title", { loop: true });
          setAutoplayBlocked(false);
        }
      }).catch(() => {});
    };

    window.addEventListener("pointerdown", unlockOnGesture, { once: true });
    window.addEventListener("keydown", unlockOnGesture, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockOnGesture);
      window.removeEventListener("keydown", unlockOnGesture);
      soundEngine.stopMusic();
    };
  }, [muted, musicEnabled, preferredSongId]);

  const ensureVerifiedPilot = () => {
    const check = validatePilotName(nameInput);
    if (!check.valid) {
      setSubmittedError(true);
      soundEngine.playAlertWarning();
      nameInputRef.current?.focus();
      return null;
    }
    setSubmittedError(false);
    if (check.cleanName !== pilotName) {
      onSavePilotName?.(check.cleanName);
    }
    return check.cleanName;
  };

  const handleVerifySubmit = (e) => {
    e.preventDefault();
    if (ensureVerifiedPilot()) {
      soundEngine.playActionClick("dock");
    }
  };

  const handleLaunchClick = () => {
    if (launching) return;
    const cleanName = ensureVerifiedPilot();
    if (!cleanName) return;

    // Must request fullscreen synchronously inside the user-click gesture
    if (startInFullscreen && !isFullscreen) {
      onEnterFullscreen?.();
    }

    soundEngine.stopMusic();
    soundEngine.playLaunchSequence();
    setLaunching(true);

    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const rolloutMs = prefersReduced ? 110 : 880;

    launchTimerRef.current = setTimeout(() => {
      launchTimerRef.current = null;
      onStartPlay?.(cleanName);
    }, rolloutMs);
  };

  const handleIntroClick = () => {
    if (launching) return;
    const cleanName = ensureVerifiedPilot();
    if (!cleanName) return;
    soundEngine.stopMusic();
    soundEngine.playActionClick("dock");
    onOpenIntro?.(cleanName);
  };

  const handleToggleGear = () => {
    const next = !settingsOpen;
    setSettingsOpen(next);
    if (!muted) soundEngine.playActionClick("nav");
  };

  const handleFullscreenClick = () => {
    if (!muted) soundEngine.playActionClick("nav");
    onToggleFullscreen?.();
  };

  const activeTimbre = getTimbreProfile(audioSnap.mechanismTimbre);
  const activeSongMeta = SOUND_THEMES.find((t) => t.id === preferredSongId) || SOUND_THEMES[0];
  const activeStudioPreset = AUDIO_STUDIO_PRESETS.find((p) => p.id === audioSnap.studioPresetId);

  return (
    <section className="start-menu-stage" aria-label="Game Start Menu">
      <div className="start-menu-hero">
        <div className="start-menu-topbar">
          <div className="start-menu-kicker">
            <Sparkles size={13} />
            <span>
              {l === "pt"
                ? "MENU START · ROVER PILOT 3D · ORQUESTRAÇÃO MPTO (7 AGENTES)"
                : "START MENU · ROVER PILOT 3D · 7-AGENT MPTO ORCHESTRATION"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
            {activeStudioPreset && (
              <button
                type="button"
                className="start-gear-chip"
                onClick={handleToggleGear}
                style={{ cursor: "pointer", color: "var(--hud-cyan)" }}
                title={
                  l === "pt"
                    ? "Clique para trocar o Preset Game Studio"
                    : "Click to change Game Studio Audio Preset"
                }
              >
                <span>{l === "pt" ? activeStudioPreset.labelPt : activeStudioPreset.labelEn}</span>
              </button>
            )}

            <button
              type="button"
              className={`hud-cam-btn ${isFullscreen ? "active-green" : "active-cyan"}`}
              onClick={handleFullscreenClick}
              aria-pressed={isFullscreen}
              title={
                isFullscreen
                  ? l === "pt"
                    ? "Sair da Tela Cheia"
                    : "Exit Fullscreen"
                  : l === "pt"
                    ? "Abrir Jogo em Tela Cheia"
                    : "Enter Fullscreen Now"
              }
            >
              {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
              <span>
                {isFullscreen
                  ? l === "pt"
                    ? "Tela Cheia Ativa"
                    : "Fullscreen On"
                  : l === "pt"
                    ? "Tela Cheia"
                    : "Fullscreen"}
              </span>
            </button>
          </div>
        </div>

        <h2 className="start-menu-title">
          {l === "pt"
            ? "Curve of Duck — Sinfonia Planetária & Telemetria Sonora"
            : "Curve of Duck — Planetary Symphony & Sonic Telemetry"}
        </h2>

        <p className="start-menu-desc">
          {l === "pt"
            ? "Controle Rover-01 em tempo real enquanto vento planetário (ρ), sonar de distância e telemetria sonora (Ocarina / 8-Bit / Sawtooth) traduzem em áudio cada subida e descida da curva."
            : "Pilot Rover-01 in real time while atmospheric wind (ρ), proximity sonar, and synthesized telemetry audio (Ocarina / 8-Bit / Sawtooth) turn every curve trend into live sound cues."}
        </p>

        {/* Live Animated Rover Patrol & Launch Sequence Runway */}
        <div
          className={`start-rover-stage ${launching ? "is-launching" : ""}`}
          role="img"
          aria-label={
            launching
              ? l === "pt"
                ? "Rover-01 acelerando pelo pórtico de saída para iniciar a missão"
                : "Rover-01 accelerating through the launch gate to start the mission"
              : l === "pt"
                ? "Rover-01 em patrulha contínua sobre o terreno planetário"
                : "Rover-01 cruising on standby patrol across planetary terrain"
          }
        >
          <div className="start-rover-hud-top">
            <span className="start-rover-hud-badge">
              {launching
                ? l === "pt"
                  ? "IGNIÇÃO ROVER-01 · PARTINDO PARA MISSÃO ▸▸▸"
                  : "ROVER-01 IGNITION · ENGAGING MISSION ▸▸▸"
                : l === "pt"
                  ? `ROVER-01 EM PATRULHA · SETOR ${selectedMissionId}`
                  : `ROVER-01 ON PATROL · SECTOR ${selectedMissionId}`}
            </span>
            <span>
              {launching
                ? "v = 3.8 m/s · LOCK OK"
                : isFullscreen || startInFullscreen
                  ? l === "pt"
                    ? "PISTA EM TELA CHEIA PRONTA"
                    : "FULLSCREEN RUNWAY ARMED"
                  : "0.6 m/s · STANDBY"}
            </span>
          </div>

          {/* Endless Parallax Ridge Horizon */}
          <svg
            className="start-rover-backdrop-svg"
            viewBox="0 0 1200 156"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <g opacity="0.55">
              <circle cx="90" cy="34" r="1.4" fill="var(--cockpit-ink)" />
              <circle cx="210" cy="22" r="1.2" fill="var(--hud-cyan)" />
              <circle cx="340" cy="46" r="1.6" fill="var(--cockpit-ink)" />
              <circle cx="490" cy="26" r="1.2" fill="var(--hud-amber)" />
              <circle cx="690" cy="34" r="1.4" fill="var(--cockpit-ink)" />
              <circle cx="810" cy="22" r="1.2" fill="var(--hud-cyan)" />
              <circle cx="940" cy="46" r="1.6" fill="var(--cockpit-ink)" />
              <circle cx="1090" cy="26" r="1.2" fill="var(--hud-amber)" />
            </g>
            <path
              d="M0 126 L75 94 L155 112 L250 78 L345 108 L455 86 L555 114 L600 126 L675 94 L755 112 L850 78 L945 108 L1055 86 L1155 114 L1200 126 L1200 156 L0 156 Z"
              fill="var(--mars-rust)"
              opacity="0.28"
            />
          </svg>

          <div className="start-rover-ground" aria-hidden="true" />

          {/* Mission Departure Gate on the right */}
          <div className="start-rover-gate" aria-hidden="true">
            <span>{launching ? "GO!" : "GATE"}</span>
            <span className="start-rover-gate-beacon" />
            <span className="start-rover-gate-post" />
          </div>

          {/* 6-Wheel Rocker-Bogie Rover Rig */}
          <div className="start-rover-rig" aria-hidden="true">
            <svg className="start-rover-svg" viewBox="0 0 180 90">
              {/* Cyan Optical LIDAR Scan Beam */}
              <polygon
                className="start-rover-beam"
                points="126,24 178,42 178,76 122,52"
                fill="var(--hud-cyan)"
              />

              {/* Rear Regolith Dust Plumes */}
              <g className="start-rover-dust" fill="var(--mars-dust)">
                <circle cx="24" cy="70" r="4.5" opacity="0.65" />
                <circle cx="13" cy="67" r="6" opacity="0.45" />
                <circle cx="4" cy="64" r="3.5" opacity="0.35" />
              </g>

              {/* High-Torque Departure Thruster Flare (visible on Play click) */}
              <g className="start-rover-thrust">
                <polygon points="34,47 4,41 12,48 2,54 34,53" fill="var(--hud-cyan)" opacity="0.88" />
                <polygon points="34,49 12,47 16,50 11,53 34,51" fill="var(--hud-green)" />
              </g>

              {/* Rocker-Bogie Suspension Struts */}
              <path
                d="M44 68 L62 48 L88 68 M88 68 L112 48 L130 68"
                fill="none"
                stroke="var(--cockpit-soft)"
                strokeWidth="3.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Main Rover Warm Box & Solar Array Deck */}
              <rect
                x="44"
                y="34"
                width="82"
                height="20"
                rx="4"
                fill="var(--cockpit-panel)"
                stroke="var(--hud-cyan)"
                strokeWidth="2"
              />
              <polygon
                points="38,34 114,34 106,27 42,27"
                fill="var(--hud-amber)"
                opacity="0.88"
              />
              <rect x="54" y="38" width="22" height="10" rx="2" fill="var(--mars-rust)" />
              <rect x="82" y="38" width="28" height="10" rx="2" fill="var(--cockpit-bg)" stroke="var(--hud-cyan)" strokeWidth="1.2" />

              {/* Optical Mast & Stereo Camera Head */}
              <line x1="114" y1="34" x2="118" y2="14" stroke="var(--cockpit-ink)" strokeWidth="3.2" strokeLinecap="round" />
              <rect
                x="110"
                y="8"
                width="20"
                height="11"
                rx="3"
                fill="var(--cockpit-panel)"
                stroke="var(--hud-cyan)"
                strokeWidth="1.8"
              />
              <circle cx="125" cy="13.5" r="2.6" fill="var(--hud-green)" />

              {/* High-Gain Dish */}
              <path d="M52 27 Q58 17 65 25" fill="none" stroke="var(--hud-cyan)" strokeWidth="2.2" />

              {/* Three Visible Articulated Wheels with Rotating Spokes (outer g fixes translate; inner g spins around 0,0) */}
              {[44, 88, 130].map((wx) => (
                <g key={wx} transform={`translate(${wx}, 68)`}>
                  <g className="start-rover-wheel">
                    <circle cx="0" cy="0" r="12" fill="var(--cockpit-bg)" stroke="var(--mars-dust)" strokeWidth="3" />
                    <line x1="-9" y1="0" x2="9" y2="0" stroke="var(--hud-cyan)" strokeWidth="1.8" />
                    <line x1="0" y1="-9" x2="0" y2="9" stroke="var(--hud-cyan)" strokeWidth="1.8" />
                    <circle cx="0" cy="0" r="3.2" fill="var(--hud-amber)" />
                  </g>
                </g>
              ))}
            </svg>
          </div>
        </div>

        {/* Step 1: Trainee Name Registration & Verification before Play */}
        <form className="start-identity-box" onSubmit={handleVerifySubmit} noValidate>
          <label className="start-identity-label" htmlFor="pilot-start-name">
            {l === "pt"
              ? "1. IDENTIFICAÇÃO DO PILOTO (LIBERA O TREINAMENTO & CERTIFICADO)"
              : "1. PILOT REGISTRATION (UNLOCKS TRAINING & FINAL CERTIFICATE)"}
          </label>
          <div className="start-identity-row">
            <input
              id="pilot-start-name"
              ref={nameInputRef}
              type="text"
              maxLength={32}
              value={nameInput}
              onChange={(e) => {
                setNameInput(e.target.value);
                if (submittedError) setSubmittedError(false);
              }}
              placeholder={
                l === "pt"
                  ? "Digite seu nome completo ou codinome..."
                  : "Enter your full name or callsign..."
              }
              className={`start-name-input ${
                nameCheck.valid ? "is-valid" : submittedError ? "is-error" : ""
              }`}
              aria-invalid={submittedError && !nameCheck.valid}
            />
            <button
              type="submit"
              className={`hud-cam-btn ${isVerifiedSaved ? "active-green" : "active-cyan"}`}
            >
              <UserCheck size={14} />
              <span>
                {isVerifiedSaved
                  ? l === "pt"
                    ? "Nome Verificado ✓"
                    : "Name Verified ✓"
                  : l === "pt"
                    ? "Verificar Nome"
                    : "Verify Name"}
              </span>
            </button>
          </div>
          <div
            className={`start-identity-status ${
              nameCheck.valid ? "is-ok" : submittedError ? "is-warn" : ""
            }`}
            role={submittedError && !nameCheck.valid ? "alert" : "status"}
          >
            {nameCheck.valid ? <CheckCircle2 size={13} /> : <AlertCircle size={13} />}
            <span>
              {nameCheck.valid || submittedError || nameInput.trim().length > 0
                ? l === "pt"
                  ? nameCheck.messagePt
                  : nameCheck.messageEn
                : l === "pt"
                  ? "Obrigatório antes de iniciar o Play para liberar as missões e o diploma final."
                  : "Required before Play to unlock training missions and your final certificate."}
            </span>
          </div>
        </form>

        {/* Primary Play Action + Start-in-Fullscreen Toggle + Closed-by-default Sound Gear Trigger */}
        <div className="start-menu-action-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn-start-play"
              disabled={launching}
              onClick={handleLaunchClick}
            >
              <Play size={18} />
              <span>
                {launching
                  ? l === "pt"
                    ? "Rover-01 Partindo..."
                    : "Launching Rover-01..."
                  : l === "pt"
                    ? `Jogar Missão ${selectedMissionId}`
                    : `Play Mission ${selectedMissionId}`}
              </span>
            </button>

            <label className={`start-fs-check-pill ${startInFullscreen ? "is-checked" : ""}`}>
              <input
                type="checkbox"
                checked={Boolean(startInFullscreen)}
                onChange={() => {
                  if (!muted) soundEngine.playActionClick("nav");
                  onToggleStartInFullscreen?.();
                }}
              />
              <span>
                {l === "pt" ? "Iniciar em Tela Cheia" : "Start in Fullscreen"}
              </span>
            </label>

            <button
              type="button"
              className="btn-hud-ghost"
              disabled={launching}
              onClick={handleIntroClick}
            >
              <Eye size={15} />
              <span>{l === "pt" ? "História (5 Atos)" : "Story Intro (5 Acts)"}</span>
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
            {/* Compact Gear Button: clicks open the full Sound & Timbre studio */}
            <button
              type="button"
              className={`start-gear-btn ${settingsOpen ? "is-open" : ""}`}
              onClick={handleToggleGear}
              aria-expanded={settingsOpen}
              aria-controls="start-sound-settings-panel"
              title={
                l === "pt"
                  ? "Abrir configurações sonoras, toques e timbres"
                  : "Open sound settings, ringtones & timbres"
              }
            >
              <Settings size={17} className="start-gear-icon" aria-hidden="true" />
              <span>{l === "pt" ? "Som & Timbres" : "Audio & Timbres"}</span>
              <span className="start-gear-chip">
                {muted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                <span>
                  {muted
                    ? l === "pt"
                      ? "Mudo"
                      : "Muted"
                    : `${activeTimbre.wave.toUpperCase()} · ${Math.round(volume * 100)}%`}
                </span>
              </span>
            </button>

            <div className="start-lang-switch" role="group" aria-label="Language Switcher">
              <Globe size={13} />
              <button
                type="button"
                className={`lang-pill-btn ${l === "en" ? "active" : ""}`}
                onClick={() => onChangeLang?.("en")}
              >
                EN
              </button>
              <button
                type="button"
                className={`lang-pill-btn ${l === "pt" ? "active" : ""}`}
                onClick={() => onChangeLang?.("pt")}
              >
                PT-BR
              </button>
            </div>
          </div>
        </div>

        {autoplayBlocked && !muted && musicEnabled && !settingsOpen && (
          <div style={{ fontSize: "0.75rem", color: "var(--hud-amber)", marginTop: "0.2rem" }}>
            {l === "pt"
              ? `💡 Clique na engrenagem (Som & Timbres) ou em qualquer área para iniciar o tema "${activeSongMeta.labelPt}".`
              : `💡 Click the gear (Audio & Timbres) or anywhere to start "${activeSongMeta.labelEn}".`}
          </div>
        )}
      </div>

      {/* Gear-Triggered Expandable Sound Settings Menu (Hidden until user clicks the Gear) */}
      {settingsOpen && (
        <div id="start-sound-settings-panel">
          <AudioSettingsMenu
            lang={l}
            variant="dark"
            compact={false}
            onClose={() => setSettingsOpen(false)}
            onAfterMuteToggle={(nextMuted) => {
              if (nextMuted !== muted) onToggleMute?.();
            }}
            onAfterVolumeChange={(val) => onChangeVolume?.(val)}
            onAfterMusicToggle={(nextMusic) => {
              if (nextMusic !== musicEnabled) onToggleMusic?.();
            }}
          />
        </div>
      )}
    </section>
  );
}
