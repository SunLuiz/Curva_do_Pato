import React, { useEffect, useState } from "react";
import { Activity, Compass, Gamepad2, Globe, Settings, Volume2, VolumeX } from "lucide-react";
import { UI_TEXT } from "../content/i18n";
import AudioSettingsMenu from "./AudioSettingsMenu";
import { getTimbreProfile, soundEngine } from "../game/soundEngine";

const NAV_ITEMS = [
  { path: "/", key: "navStory", Icon: Compass },
  { path: "/game", key: "navGame", Icon: Gamepad2 },
  { path: "/cockpit", key: "navCockpit", Icon: Activity },
];

export default function AppShell({ route, onNavigate, lang = "en", setLang, fullBleed = false, children }) {
  const l = lang === "pt" ? "pt" : "en";
  const ui = UI_TEXT[l];
  const [audioMenuOpen, setAudioMenuOpen] = useState(false);
  const [audioSnap, setAudioSnap] = useState(() => soundEngine.getState());

  useEffect(() => {
    setAudioSnap(soundEngine.getState());
    return soundEngine.subscribe(setAudioSnap);
  }, []);

  useEffect(() => {
    if (!audioMenuOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setAudioMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [audioMenuOpen]);

  const activeTimbre = getTimbreProfile(audioSnap.mechanismTimbre);

  const handleRouteClick = (path) => {
    if (path !== route) soundEngine.playActionClick("nav");
    setAudioMenuOpen(false);
    onNavigate(path);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner" style={{ position: "relative" }}>
          <button className="brand" onClick={() => handleRouteClick("/")} type="button">
            <div className="brand-mark" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 16c4-6 7 2 11-5 2.5-4.4 4.5-4 7-3" strokeLinecap="round" />
                <circle cx="21" cy="8" r="2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <span className="brand-title">Cockpit-OMNI · Curve of Duck</span>
              <span className="brand-sub">{ui.brandSub}</span>
            </div>
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
            <nav className="nav-links" aria-label="Primary Navigation">
              {NAV_ITEMS.map(({ path, key, Icon }) => (
                <button
                  key={path}
                  type="button"
                  className={`nav-btn ${route === path ? "active" : ""}`}
                  aria-current={route === path ? "page" : undefined}
                  onClick={() => handleRouteClick(path)}
                >
                  <Icon size={16} /> {ui[key]}
                </button>
              ))}
            </nav>

            {/* Compact Ecosystem Sound Gear Trigger (Closed by default; click opens Timbre & Ringtone Studio) */}
            <button
              type="button"
              className="pill"
              aria-expanded={audioMenuOpen}
              aria-label={l === "pt" ? "Abrir configurações sonoras e timbres" : "Open sound & timbre settings"}
              title={
                l === "pt"
                  ? "Configurações sonoras, timbres e toques do ecossistema"
                  : "Ecosystem sound, mechanism timbre & ringtone settings"
              }
              onClick={() => setAudioMenuOpen((prev) => !prev)}
              style={{
                fontWeight: 700,
                fontSize: "0.78rem",
                background: audioMenuOpen ? "var(--surface-2)" : "var(--surface-1)",
                borderColor: audioMenuOpen ? "var(--biome-n)" : "var(--hairline-strong)",
                color: "var(--ink)",
                cursor: "pointer",
              }}
            >
              <Settings size={14} color="var(--biome-n)" aria-hidden="true" />
              {audioSnap.muted ? (
                <VolumeX size={13} color="var(--danger)" aria-hidden="true" />
              ) : (
                <Volume2 size={13} color="var(--sig)" aria-hidden="true" />
              )}
              <span className="mono" style={{ fontSize: "0.72rem" }}>
                {audioSnap.muted ? (l === "pt" ? "Mudo" : "Muted") : activeTimbre.wave}
              </span>
            </button>

            {setLang && (
              <button
                type="button"
                className="pill"
                aria-label={l === "en" ? "Switch interface language to Portuguese" : "Mudar idioma para inglês"}
                onClick={() => {
                  soundEngine.playActionClick("preset");
                  setLang(l === "en" ? "pt" : "en");
                }}
                style={{
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  background: "var(--surface-1)",
                  borderColor: "var(--hairline-strong)",
                }}
              >
                <Globe size={14} aria-hidden="true" />
                <span>{l === "en" ? "EN | PT-BR" : "PT-BR | EN"}</span>
              </button>
            )}
          </div>

          {audioMenuOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 0.5rem)",
                right: 0,
                width: "min(620px, calc(100vw - 1.5rem))",
                zIndex: 60,
              }}
            >
              <AudioSettingsMenu
                lang={l}
                variant="light"
                compact={true}
                onClose={() => setAudioMenuOpen(false)}
              />
            </div>
          )}
        </div>
      </header>

      <main className={`main-container ${fullBleed ? "story-full" : ""}`}>{children}</main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <strong>Team Curve of Duck (Luiz Antonio Gois Junior) · Built at NASA Space Apps Challenge 2026 — Campinas, SP, Brazil</strong>{" "}
            · No NASA logo or insignia is used; all NASA datasets are cited directly below.
          </div>
          <div>
            Data &amp; Attributions: NASA POWER (MERRA-2 / CERES), NASA FIRMS (VIIRS NOAA-21 NRT), NASA DONKI, NASA Earthdata CMR MCP (C3264430167-LANCEMODIS, NISAR_L2_GUNW_PROVISIONAL_V1),{" "}
            <a href="https://github.com/bilawalsidhu/gods-eye-view" target="_blank" rel="noreferrer">
              God&apos;s Eye View (MIT / TeleGeography CC BY-NC-SA)
            </a>
            , and Academy mastery/memory design inspired by{" "}
            <a href="https://github.com/HKUDS/DeepTutor" target="_blank" rel="noreferrer">
              HKUDS/DeepTutor (Apache-2.0)
            </a>
            .
          </div>
          <div>
            Live demo:{" "}
            <a href="https://frontend-rho-seven-69.vercel.app" target="_blank" rel="noreferrer">
              frontend-rho-seven-69.vercel.app
            </a>
            {" · "}
            Source:{" "}
            <a href="https://github.com/SunLuiz/Curva_do_Pato" target="_blank" rel="noreferrer">
              github.com/SunLuiz/Curva_do_Pato
            </a>
            {" · "}
            License: MIT
          </div>
          <div style={{ color: "var(--ink-faint)" }}>
            Prototype Notice: Trend estimates and attribution summaries are comparative statistical calculations over historical open NASA datasets (1984–2025) and are not certified operational forecasts.
          </div>
        </div>
      </footer>
    </div>
  );
}
