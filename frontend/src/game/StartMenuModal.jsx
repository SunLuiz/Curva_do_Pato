import React, { useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Eye,
  Globe,
  Music,
  Play,
  Sliders,
  Sparkles,
  Square,
  UserCheck,
  Volume2,
  VolumeX,
} from "lucide-react";
import { validatePilotName } from "../academy/storage";
import { OCARINA_N64_PADS, soundEngine } from "./soundEngine";

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
  const [activeSong, setActiveSong] = useState("title");
  const [themePlaying, setThemePlaying] = useState(false);
  const [pressedPad, setPressedPad] = useState(null);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);

  useEffect(() => {
    setNameInput(pilotName || "");
  }, [pilotName]);

  useEffect(() => {
    if (nameGateAlert) {
      setSubmittedError(true);
      nameInputRef.current?.focus();
    }
  }, [nameGateAlert]);

  const nameCheck = validatePilotName(nameInput);
  const savedCheck = validatePilotName(pilotName);
  const isVerifiedSaved =
    nameCheck.valid && savedCheck.valid && nameCheck.cleanName === savedCheck.cleanName;

  // Attempt starting the Ocarina Title Theme on Start Menu entry;
  // if browser autoplay suspends Web Audio, arm one-time gesture unlock.
  useEffect(() => {
    if (muted || !musicEnabled) {
      soundEngine.stopMusic();
      setThemePlaying(false);
      return undefined;
    }

    const tryStartTheme = () => {
      const ctx = soundEngine.ensureCtx();
      if (!ctx) return;
      if (ctx.state === "running") {
        const ok = soundEngine.playOcarinaSequence(activeSong || "title", { loop: true });
        setThemePlaying(Boolean(ok));
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
          const ok = soundEngine.playOcarinaSequence(activeSong || "title", { loop: true });
          setThemePlaying(Boolean(ok));
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
  }, [muted, musicEnabled, activeSong]);

  const handleSelectSong = (songKey) => {
    if (themePlaying && activeSong === songKey) {
      soundEngine.stopMusic();
      setThemePlaying(false);
      return;
    }
    setActiveSong(songKey);
    const ok = soundEngine.playOcarinaSequence(songKey, { loop: true });
    setThemePlaying(Boolean(ok));
    setAutoplayBlocked(false);
  };

  const handlePadPress = (pad) => {
    setPressedPad(pad.id);
    if (muted) onToggleMute?.();
    soundEngine.playOcarinaNote(pad.freq, 0.52, 0, { gain: 0.28, vibratoHz: 5.5, withBreath: true });
    setTimeout(() => setPressedPad((curr) => (curr === pad.id ? null : curr)), 260);
  };

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

  return (
    <section className="start-menu-stage" aria-label="Game Start Menu and Audio Configuration">
      <div className="start-menu-hero">
        <div className="start-menu-kicker">
          <Sparkles size={13} />
          <span>
            {l === "pt"
              ? "MENU START · ROVER PILOT 3D · MOTOR ACÚSTICO WEB AUDIO API"
              : "START MENU · ROVER PILOT 3D · WEB AUDIO API ACOUSTIC ENGINE"}
          </span>
        </div>

        <h2 className="start-menu-title">
          {l === "pt"
            ? "Curve of Duck — Sinfonia Planetária & Telemetria Sonora"
            : "Curve of Duck — Planetary Symphony & Sonic Telemetry"}
        </h2>

        <p className="start-menu-desc">
          {l === "pt"
            ? "Controle Rover-01 em tempo real enquanto a música em Ocarina (Ressonador de Helmholtz), o vento planetário (ρ) e o sonar de distância traduzem em som cada subida e descida da curva."
            : "Pilot Rover-01 in real time while the Helmholtz-resonator Ocarina score, atmospheric wind (ρ), and proximity sonar turn every telemetry curve rise and fall into live audio cues."}
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

        {/* Primary Play Action + Inline Settings Right Beside Play */}
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

          {/* Settings Right Beside Play: Volume On/Off + Slider + PT/EN Language */}
          <div className="start-settings-cluster" role="group" aria-label="Game Audio and Language Settings">
            <div className="start-setting-item">
              <Sliders size={14} />
              <span className="mono" style={{ fontSize: "0.74rem", opacity: 0.85 }}>
                {l === "pt" ? "CONFIG:" : "SETTINGS:"}
              </span>
            </div>

            <button
              type="button"
              className={`hud-cam-btn ${!muted ? "active-cyan" : ""}`}
              onClick={onToggleMute}
              aria-label={muted ? "Unmute Audio" : "Mute Audio"}
            >
              {muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              <span>{muted ? (l === "pt" ? "Som: Desligado" : "Sound: Off") : (l === "pt" ? "Som: Ligado" : "Sound: On")}</span>
            </button>

            <label className="start-vol-slider" title={l === "pt" ? "Volume principal" : "Master volume"}>
              <span className="mono" style={{ fontSize: "0.7rem" }}>
                {Math.round(volume * 100)}%
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={muted ? 0 : Math.round(volume * 100)}
                onChange={(e) => onChangeVolume?.(Number(e.target.value) / 100)}
                aria-label="Master Volume"
              />
            </label>

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
      </div>

      {/* Lower Split: Acoustic Radar Explanation + Interactive 12-Hole Ocarina N64 Pad */}
      <div className="start-menu-grid">
        <div className="start-card-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <strong style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontSize: "0.94rem" }}>
              <Music size={15} color="var(--hud-cyan)" />
              {l === "pt"
                ? "Ocarina de 12 Furos · Síntese Física (Sem MP3)"
                : "12-Hole Ocarina · Physical Synth (Zero MP3)"}
            </strong>
            <button
              type="button"
              className="hud-cam-btn"
              onClick={onToggleMusic}
              title={l === "pt" ? "Ativar/Desativar melodia" : "Enable/Disable music score"}
            >
              {musicEnabled ? <Music size={13} /> : <Square size={12} />}
              <span>{musicEnabled ? (l === "pt" ? "Música: On" : "Music: On") : (l === "pt" ? "Música: Off" : "Music: Off")}</span>
            </button>
          </div>

          <p style={{ fontSize: "0.82rem", color: "var(--cockpit-soft)", lineHeight: 1.48 }}>
            {l === "pt"
              ? "Ressonador de Helmholtz (senoide pura + triângulo de sopro + LFO vibrato 5,5 Hz + harpa). Clique nos 5 botões para soprar ou escute os temas:"
              : "Helmholtz resonator (sine core + fipple triangle + 5.5 Hz breath LFO + harp). Press the 5 notes below or trigger the opening score:"}
          </p>

          <div className="ocarina-pad-row" role="group" aria-label="Interactive Ocarina Notes">
            {OCARINA_N64_PADS.map((pad) => (
              <button
                key={pad.id}
                type="button"
                className={`ocarina-note-btn variant-${pad.variant} ${pressedPad === pad.id ? "pressed" : ""}`}
                onPointerDown={() => handlePadPress(pad)}
              >
                <span>{pad.id === "A" ? "A" : pad.labelPt.split("·")[0].trim()}</span>
                <small>{l === "pt" ? pad.labelPt.split("·")[1]?.trim() : pad.labelEn.split("·")[1]?.trim()}</small>
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.45rem" }}>
            {[
              { id: "title", labelPt: "Title Theme (Abertura)", labelEn: "Title Theme (Opening)" },
              { id: "lullaby", labelPt: "Zelda's Lullaby", labelEn: "Zelda's Lullaby" },
              { id: "time", labelPt: "Song of Time", labelEn: "Song of Time" },
            ].map((song) => {
              const isPlaying = themePlaying && activeSong === song.id;
              return (
                <button
                  key={song.id}
                  type="button"
                  className={`hud-cam-btn ${isPlaying ? "active-cyan" : ""}`}
                  onClick={() => handleSelectSong(song.id)}
                >
                  {isPlaying ? <Square size={11} /> : <Play size={11} />}
                  <span>{l === "pt" ? song.labelPt : song.labelEn}</span>
                </button>
              );
            })}
          </div>

          {autoplayBlocked && !muted && musicEnabled && (
            <div style={{ fontSize: "0.75rem", color: "var(--hud-amber)" }}>
              {l === "pt"
                ? "💡 Clique em qualquer lugar ou no botão ▶ acima para liberar o áudio do navegador."
                : "💡 Click anywhere or press ▶ above to unlock browser Web Audio playback."}
            </div>
          )}
        </div>

        <div className="start-card-panel">
          <strong style={{ fontSize: "0.94rem", color: "var(--hud-green)" }}>
            {l === "pt" ? "Sonificação da Jogabilidade em Tempo Real" : "Real-Time Gameplay Sonification"}
          </strong>
          <ul className="start-sonic-list">
            <li>
              <strong>{l === "pt" ? "📈 Curva Subindo/Descendo → Ritmo & Altura:" : "📈 Rising/Falling Curve → BPM & Pitch:"}</strong>{" "}
              {l === "pt"
                ? "Quanto mais o gráfico sobe e se aproxima do limiar, maior o BPM (92→232), o brilho e o volume da melodia em Ré Dórico."
                : "As telemetry rises toward critical thresholds, tempo accelerates (92→232 BPM), Dorian pitch rises, and timbre brightens."}
            </li>
            <li>
              <strong>{l === "pt" ? "💨 Vento Planetário (ρ × windMs):" : "💨 Planetary Wind (ρ × windMs):"}</strong>{" "}
              {l === "pt"
                ? "Uivo filtrado pela atmosfera real (mais leve em Marte, silêncio absoluto no vácuo lunar, atenuado em 72% dentro do abrigo)."
                : "Bandpass wind scaled by density ρ (audible gusts on Mars/Earth, zero sound in Moon vacuum, 72% quieter inside shelter)."}
            </li>
            <li>
              <strong>{l === "pt" ? "📡 Sonar de Distância & Tração:" : "📡 Distance Sonar & Wheel Traction:"}</strong>{" "}
              {l === "pt"
                ? "Pulsos aceleram ao se aproximar do alvo; rodas patinando (>30% slip) emitem alerta granuloso de atrito."
                : "Proximity pings speed up as you approach the objective; wheel slip (>30%) triggers tactile gravel rumble."}
            </li>
          </ul>
        </div>
      </div>
    </section>
  );
}
