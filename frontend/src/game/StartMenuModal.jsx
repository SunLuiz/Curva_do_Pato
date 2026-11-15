import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Globe,
  Play,
  Settings,
  Sparkles,
  UserCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { validatePilotName } from "../academy/storage";
import AudioSettingsMenu from "../components/AudioSettingsMenu";
import { SOUND_THEMES, getTimbreProfile, soundEngine } from "./soundEngine";

export default function StartMenuModal({
  lang = "en",
  onChangeLang,
  muted = false,
  onToggleMute,
  volume = 0.78,
  onChangeVolume,
  musicEnabled = true,
  onToggleMusic,
  selectedMissionId = "M1",
  pilotName = "",
  onSavePilotName,
  nameGateAlert = false,
  onStartPlay,
  onOpenIntro,
}) {
  const l = lang === "pt" ? "pt" : "en";
  const nameInputRef = useRef(null);
  const [nameInput, setNameInput] = useState(pilotName || "");
  const [submittedError, setSubmittedError] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [audioSnap, setAudioSnap] = useState(() => soundEngine.getState());
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

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
    const cleanName = ensureVerifiedPilot();
    if (!cleanName) return;
    soundEngine.stopMusic();
    soundEngine.playActionClick("dock");
    onStartPlay?.(cleanName);
  };

  const handleIntroClick = () => {
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

  const activeTimbre = getTimbreProfile(audioSnap.mechanismTimbre);
  const activeSongMeta = SOUND_THEMES.find((t) => t.id === preferredSongId) || SOUND_THEMES[0];

  return (
    <section className="start-menu-stage" aria-label="Game Start Menu">
      <div className="start-menu-hero">
        <div className="start-menu-kicker">
          <Sparkles size={13} />
          <span>
            {l === "pt"
              ? "MENU START · ROVER PILOT 3D · ORQUESTRAÇÃO MPTO (7 AGENTES)"
              : "START MENU · ROVER PILOT 3D · 7-AGENT MPTO ORCHESTRATION"}
          </span>
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

        {/* Primary Play Action + Closed-by-default Sound Gear Trigger */}
        <div className="start-menu-action-bar">
          <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
            <button type="button" className="btn-start-play" onClick={handleLaunchClick}>
              <Play size={18} />
              <span>
                {l === "pt" ? `Jogar Missão ${selectedMissionId}` : `Play Mission ${selectedMissionId}`}
              </span>
            </button>

            <button type="button" className="btn-hud-ghost" onClick={handleIntroClick}>
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
