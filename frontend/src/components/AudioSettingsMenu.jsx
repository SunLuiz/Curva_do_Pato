import React, { useEffect, useState } from "react";
import { Check, Disc3, Music, Play, Radio, Settings, Sliders, Square, Volume2, VolumeX, X } from "lucide-react";
import {
  AUDIO_STUDIO_PRESETS,
  ECOSYSTEM_AUDIO_AUDIT,
  MECHANISM_TIMBRES,
  OCARINA_N64_PADS,
  SOUND_THEMES,
  getTimbreProfile,
  soundEngine,
} from "../game/soundEngine";

/**
 * Shared Sound, Theme & Mechanism Timbre Studio.
 * Opened exclusively on demand behind a gear icon button across the ecosystem.
 * Zero hex literals — styled strictly via CSS custom variables.
 */
export default function AudioSettingsMenu({
  lang = "en",
  variant = "dark",
  compact = false,
  onClose,
  onAfterMuteToggle,
  onAfterVolumeChange,
  onAfterMusicToggle,
}) {
  const l = lang === "pt" ? "pt" : "en";
  const [audioState, setAudioState] = useState(() => soundEngine.getState());
  const [pressedPad, setPressedPad] = useState(null);

  useEffect(() => {
    setAudioState(soundEngine.getState());
    return soundEngine.subscribe(setAudioState);
  }, []);

  const isDark = variant === "dark";
  const surfaceBg = isDark ? "var(--cockpit-panel)" : "var(--surface-1)";
  const insetBg = isDark ? "var(--cockpit-bg)" : "var(--surface-2)";
  const inkColor = isDark ? "var(--cockpit-ink)" : "var(--ink)";
  const softColor = isDark ? "var(--cockpit-soft)" : "var(--ink-soft)";
  const borderColor = isDark ? "var(--cockpit-border)" : "var(--hairline-strong)";
  const accentColor = isDark ? "var(--hud-cyan)" : "var(--biome-n)";
  const okColor = isDark ? "var(--hud-green)" : "var(--sig)";

  const activeTimbre = getTimbreProfile(audioState.mechanismTimbre);

  const toggleMute = () => {
    const next = !audioState.muted;
    soundEngine.setMuted(next);
    onAfterMuteToggle?.(next);
  };

  const handleVolume = (val) => {
    soundEngine.setVolume(val);
    if (val > 0 && audioState.muted) {
      soundEngine.setMuted(false);
    }
    onAfterVolumeChange?.(val);
  };

  const toggleMusic = () => {
    const next = !audioState.musicEnabled;
    soundEngine.setMusicEnabled(next);
    onAfterMusicToggle?.(next);
  };

  const handleToggleSong = (songId) => {
    if (audioState.activeTheme === songId) {
      soundEngine.stopMusic();
      return;
    }
    if (audioState.muted) soundEngine.setMuted(false);
    if (!audioState.musicEnabled) soundEngine.setMusicEnabled(true);
    soundEngine.playTheme(songId, { loop: !compact });
  };

  const handleSelectTimbre = (timbreId) => {
    soundEngine.setMechanismTimbre(timbreId);
    if (!audioState.muted) {
      soundEngine.playActionClick("quiz_ok");
    }
  };

  const handleApplyStudioPreset = (presetId) => {
    const applied = soundEngine.applyStudioPreset(presetId);
    if (!applied) return;
    if (audioState.muted) {
      soundEngine.setMuted(false);
      onAfterMuteToggle?.(false);
    }
    if (audioState.activeTheme) {
      soundEngine.playTheme(applied.activeSongId, { loop: !compact });
    } else {
      soundEngine.playActionClick("preset");
    }
  };

  const handleTestRingtone = () => {
    if (audioState.muted) soundEngine.setMuted(false);
    soundEngine.playRingtone(audioState.ringtoneId);
  };

  const handlePadPress = (pad) => {
    setPressedPad(pad.id);
    if (audioState.muted) soundEngine.setMuted(false);
    soundEngine.playMechanismNote(pad.freq, 0.48, 0, { gain: 0.24 });
    setTimeout(() => setPressedPad((curr) => (curr === pad.id ? null : curr)), 260);
  };

  return (
    <div
      className="audio-settings-drawer"
      role="region"
      aria-label={l === "pt" ? "Configurações Sonoras e Timbres" : "Sound and Timbre Settings"}
      style={{
        background: surfaceBg,
        color: inkColor,
        border: `1px solid ${borderColor}`,
        borderRadius: "var(--radius-md)",
        padding: compact ? "0.95rem 1.05rem" : "1.15rem 1.25rem",
        display: "grid",
        gap: "0.95rem",
        boxShadow: "var(--shadow-lift)",
      }}
    >
      {/* Header Row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "0.65rem",
          borderBottom: `1px solid ${borderColor}`,
          paddingBottom: "0.6rem",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <Settings size={16} color={accentColor} />
          <strong style={{ fontSize: "0.95rem", fontFamily: "var(--font-display)" }}>
            {l === "pt"
              ? "Estúdio Acústico · Timbres & Toques (Web Audio)"
              : "Acoustic Studio · Timbres & Ringtones (Web Audio)"}
          </strong>
        </div>

        {onClose && (
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            aria-label={l === "pt" ? "Fechar configurações sonoras" : "Close sound settings"}
            style={{
              padding: "0.28rem 0.55rem",
              fontSize: "0.78rem",
              background: insetBg,
              color: inkColor,
              borderColor,
            }}
          >
            <X size={14} /> {l === "pt" ? "Fechar" : "Close"}
          </button>
        )}
      </div>

      {/* Master Controls */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: "0.55rem",
          background: insetBg,
          padding: "0.65rem 0.78rem",
          borderRadius: "var(--radius-sm)",
          border: `1px solid ${borderColor}`,
        }}
      >
        <button
          type="button"
          className={isDark ? `hud-cam-btn ${!audioState.muted ? "active-cyan" : ""}` : "btn-secondary"}
          style={!isDark ? { padding: "0.35rem 0.7rem", fontSize: "0.8rem" } : undefined}
          onClick={toggleMute}
        >
          {audioState.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
          <span>
            {audioState.muted
              ? l === "pt"
                ? "Som: Desligado"
                : "Sound: Muted"
              : l === "pt"
                ? "Som: Ligado"
                : "Sound: On"}
          </span>
        </button>

        <button
          type="button"
          className={isDark ? `hud-cam-btn ${audioState.musicEnabled ? "active-green" : ""}` : "btn-secondary"}
          style={!isDark ? { padding: "0.35rem 0.7rem", fontSize: "0.8rem" } : undefined}
          onClick={toggleMusic}
        >
          <Music size={13} />
          <span>
            {audioState.musicEnabled
              ? l === "pt"
                ? "Melodia: Ativa"
                : "Music: On"
              : l === "pt"
                ? "Melodia: Pausada"
                : "Music: Off"}
          </span>
        </button>

        <label
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.45rem",
            marginLeft: "auto",
            fontSize: "0.78rem",
            color: inkColor,
          }}
        >
          <Sliders size={13} color={accentColor} />
          <span className="mono">{Math.round((audioState.muted ? 0 : audioState.volume) * 100)}%</span>
          <input
            type="range"
            min="0"
            max="100"
            value={audioState.muted ? 0 : Math.round(audioState.volume * 100)}
            onChange={(e) => handleVolume(Number(e.target.value) / 100)}
            aria-label={l === "pt" ? "Volume principal" : "Master volume"}
            style={{ width: 92, accentColor: accentColor, cursor: "pointer" }}
          />
        </label>
      </div>

      {/* 0. Game Studio Presets (One-Click Complete Sound Packages) */}
      <div style={{ display: "grid", gap: "0.48rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.4rem",
          }}
        >
          <strong style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.85rem", color: okColor }}>
            <Disc3 size={14} />
            {l === "pt"
              ? "0. Presets Game Studio (Tema + Timbre + Toque em 1 Clique):"
              : "0. Game Studio Audio Presets (1-Click Theme + Timbre + Ringtone):"}
          </strong>
          <span className="mono" style={{ fontSize: "0.69rem", color: softColor }}>
            {audioState.studioPresetId === "custom"
              ? l === "pt"
                ? "MIX PERSONALIZADO"
                : "CUSTOM STUDIO MIX"
              : audioState.studioPresetId.replace("studio_", "").toUpperCase()}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(195px, 1fr))", gap: "0.45rem" }}>
          {AUDIO_STUDIO_PRESETS.map((preset) => {
            const active = audioState.studioPresetId === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => handleApplyStudioPreset(preset.id)}
                style={{
                  textAlign: "left",
                  padding: "0.52rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  background: active ? insetBg : "transparent",
                  border: `1px solid ${active ? okColor : borderColor}`,
                  color: inkColor,
                  cursor: "pointer",
                  display: "grid",
                  gap: "0.18rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", fontWeight: 700 }}>
                  <span>{l === "pt" ? preset.labelPt : preset.labelEn}</span>
                  {active && <Check size={13} color={okColor} />}
                </div>
                <div className="mono" style={{ fontSize: "0.66rem", color: accentColor }}>
                  {l === "pt" ? preset.badgePt : preset.badgeEn}
                </div>
                <div style={{ fontSize: "0.69rem", color: softColor, lineHeight: 1.3 }}>
                  {l === "pt" ? preset.descPt : preset.descEn}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mechanism Timbre Selector (Waves across UI & Rover Telemetry) */}
      <div style={{ display: "grid", gap: "0.48rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
          <strong style={{ fontSize: "0.85rem", color: accentColor }}>
            {l === "pt"
              ? "1. Timbre de Mecanismo do Ecossistema (Botões, Abas, Ask OMNI, Quiz & Curva):"
              : "1. Ecosystem Mechanism Timbre (Buttons, Tabs, Ask OMNI, Quiz & Live Curve):"}
          </strong>
          <span className="mono" style={{ fontSize: "0.7rem", color: softColor }}>
            osc.type = &apos;{activeTimbre.wave}&apos;
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "0.45rem" }}>
          {MECHANISM_TIMBRES.map((timbre) => {
            const active = audioState.mechanismTimbre === timbre.id;
            return (
              <button
                key={timbre.id}
                type="button"
                onClick={() => handleSelectTimbre(timbre.id)}
                style={{
                  textAlign: "left",
                  padding: "0.52rem 0.65rem",
                  borderRadius: "var(--radius-sm)",
                  background: active ? insetBg : "transparent",
                  border: `1px solid ${active ? accentColor : borderColor}`,
                  color: inkColor,
                  cursor: "pointer",
                  display: "grid",
                  gap: "0.18rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.35rem", fontSize: "0.78rem", fontWeight: 700 }}>
                  <span>{l === "pt" ? timbre.labelPt : timbre.labelEn}</span>
                  {active && <Check size={13} color={okColor} />}
                </div>
                <div style={{ fontSize: "0.7rem", color: softColor, lineHeight: 1.32 }}>
                  {l === "pt" ? timbre.descPt : timbre.descEn}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ringtone + Selectable Opening Songs */}
      <div style={{ display: "grid", gap: "0.55rem" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.55rem",
            background: insetBg,
            padding: "0.58rem 0.72rem",
            borderRadius: "var(--radius-sm)",
            border: `1px solid ${borderColor}`,
          }}
        >
          <div style={{ display: "grid", gap: "0.12rem" }}>
            <strong style={{ fontSize: "0.82rem" }}>
              {l === "pt"
                ? "2. Toque de Conquista / Notificação (Vitória, Quiz, Telemetria):"
                : "2. Ecosystem Achievement / Notification Ringtone:"}
            </strong>
            <span style={{ fontSize: "0.72rem", color: softColor }}>
              {l === "pt"
                ? "Dispara ao vencer missão 3D ou concluir módulo científico."
                : "Plays cleanly on 3D mission victory or scientific quiz mastery."}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
            <select
              value={audioState.ringtoneId}
              onChange={(e) => soundEngine.setRingtoneId(e.target.value)}
              aria-label={l === "pt" ? "Selecionar toque de notificação" : "Select notification ringtone"}
              style={{
                padding: "0.35rem 0.55rem",
                borderRadius: "var(--radius-sm)",
                background: surfaceBg,
                color: inkColor,
                border: `1px solid ${borderColor}`,
                fontSize: "0.78rem",
              }}
            >
              {SOUND_THEMES.map((song) => (
                <option key={song.id} value={song.id}>
                  {l === "pt" ? song.labelPt : song.labelEn}
                </option>
              ))}
            </select>

            <button
              type="button"
              className={isDark ? "hud-cam-btn active-green" : "btn-secondary"}
              style={!isDark ? { padding: "0.35rem 0.65rem", fontSize: "0.76rem" } : undefined}
              onClick={handleTestRingtone}
            >
              <Play size={12} />
              <span>{l === "pt" ? "Testar Toque" : "Test Ringtone"}</span>
            </button>
          </div>
        </div>

        {/* 7 Selectable Opening & Theme Songs */}
        <strong style={{ fontSize: "0.84rem" }}>
          {l === "pt"
            ? "3. Canções de Abertura Clássicas (Ocarina 12 Furos + Chips 8/16-Bit):"
            : "3. Classic Opening Scores (12-Hole Ocarina + 8/16-Bit Consoles):"}
        </strong>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.42rem" }}>
          {SOUND_THEMES.map((song) => {
            const isPlaying = audioState.activeTheme === song.id;
            const isPreferred = audioState.activeSongId === song.id;
            return (
              <button
                key={song.id}
                type="button"
                className={isDark ? `hud-cam-btn ${isPlaying || isPreferred ? "active-cyan" : ""}` : "btn-secondary"}
                style={
                  !isDark
                    ? {
                        padding: "0.35rem 0.62rem",
                        fontSize: "0.76rem",
                        borderColor: isPlaying || isPreferred ? accentColor : undefined,
                      }
                    : undefined
                }
                onClick={() => handleToggleSong(song.id)}
                title={l === "pt" ? song.chipPt : song.chipEn}
              >
                {isPlaying ? <Square size={11} /> : <Play size={11} />}
                <span>{l === "pt" ? song.labelPt : song.labelEn}</span>
                <small className="mono" style={{ opacity: 0.75, fontSize: "0.66rem" }}>
                  · {song.wave}
                </small>
              </button>
            );
          })}
        </div>
      </div>

      {/* Full Game Start Menu Panels: Interactive Notes + Ecosystem Coverage Summary */}
      {!compact && (
        <div className="start-menu-grid">
          <div className="start-card-panel">
            <strong style={{ fontSize: "0.86rem", color: accentColor }}>
              {l === "pt"
                ? `Teclado Sintetizador Ao Vivo (${activeTimbre.wave.toUpperCase()})`
                : `Live Synth Pad (${activeTimbre.wave.toUpperCase()})`}
            </strong>
            <p style={{ fontSize: "0.78rem", color: softColor, lineHeight: 1.42 }}>
              {l === "pt"
                ? "Clique nos 5 botões para testar imediatamente como o timbre escolhido (Ocarina senoidal vs Quadrada 8-bit vs Sawtooth) muda a textura sonora:"
                : "Press any of the 5 pads below to compare how Ocarina sine vs 8-bit square vs sawtooth brass shapes the timbre:"}
            </p>
            <div className="ocarina-pad-row" role="group" aria-label="Interactive Synth Pads">
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
          </div>

          <div className="start-card-panel">
            <strong style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontSize: "0.86rem", color: okColor }}>
              <Radio size={14} />
              {l === "pt" ? "Cobertura Sonora no Ecossistema" : "Ecosystem Acoustic Coverage"}
            </strong>
            <div style={{ display: "grid", gap: "0.42rem" }}>
              {ECOSYSTEM_AUDIO_AUDIT.map((row) => (
                <div
                  key={row.surface}
                  style={{
                    padding: "0.42rem 0.55rem",
                    borderRadius: "var(--radius-sm)",
                    background: insetBg,
                    border: `1px solid ${borderColor}`,
                    fontSize: "0.74rem",
                    lineHeight: 1.38,
                  }}
                >
                  <div className="mono" style={{ fontWeight: 700, color: accentColor }}>
                    {row.surface}
                  </div>
                  <div style={{ color: inkColor }}>
                    {l === "pt" ? row.mechanismsPt : row.mechanismsEn}
                  </div>
                  <div style={{ color: okColor, fontSize: "0.69rem" }}>
                    {l === "pt" ? row.modePt : row.modeEn}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
