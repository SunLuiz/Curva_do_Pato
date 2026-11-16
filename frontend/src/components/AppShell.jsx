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

  const handleRouteClick = (path, event) => {
    if (event) {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
        return;
      }
      event.preventDefault();
    }
    if (path !== route) soundEngine.playActionClick("nav");
    setAudioMenuOpen(false);
    onNavigate(path);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner" style={{ position: "relative" }}>
          <a className="brand" href="/" onClick={(e) => handleRouteClick("/", e)}>
            <div className="brand-mark" aria-hidden="true">
              <svg width="32" height="32" viewBox="0 0 36 36" fill="none">
                {/* Rover solar deck & chassis */}
                <rect x="6" y="21" width="20" height="5" rx="2" fill="var(--surface-1)" stroke="var(--ink)" strokeWidth="1.4" />
                <polygon points="5,19 25,19 27,21 4,21" fill="var(--biome-n)" stroke="var(--ink)" strokeWidth="1.1" />
                {/* Rover NavCam mast */}
                <rect x="25" y="13" width="2.2" height="8" rx="1" fill="var(--ink)" />
                <rect x="23" y="10.5" width="6.5" height="3.5" rx="1.4" fill="var(--surface-1)" stroke="var(--ink)" strokeWidth="1.2" />
                <circle cx="27.4" cy="12.2" r="1" fill="var(--biome-n)" />
                {/* Rover bogie legs & 3 wheels */}
                <line x1="10" y1="26" x2="8.5" y2="29" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="16" y1="26" x2="16" y2="29" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
                <line x1="22" y1="26" x2="23.5" y2="29" stroke="var(--ink)" strokeWidth="1.4" strokeLinecap="round" />
                <circle cx="8.5" cy="30" r="3" fill="var(--ink)" />
                <circle cx="16" cy="30" r="3" fill="var(--ink)" />
                <circle cx="23.5" cy="30" r="3" fill="var(--ink)" />
                <circle cx="8.5" cy="30" r="1.1" fill="var(--surface-2)" />
                <circle cx="16" cy="30" r="1.1" fill="var(--surface-2)" />
                <circle cx="23.5" cy="30" r="1.1" fill="var(--surface-2)" />
                {/* Duck riding on top of the rover */}
                <path
                  d="M8.5 17 C8.5 13.8 12.2 13 15 13 L17.5 13 C19.4 13 20.5 14.5 20.5 16.5 C20.5 18.2 19 19 15 19 L11 19 C9.2 19 8.2 18.3 8.5 17 Z"
                  fill="var(--biome-ne)"
                  stroke="var(--ink)"
                  strokeWidth="1.25"
                />
                <path d="M7.2 15.2 L9.5 16.8 L8.5 18.5 Z" fill="var(--biome-ne)" stroke="var(--ink)" strokeWidth="1" strokeLinejoin="round" />
                <circle cx="17.5" cy="10.2" r="3.6" fill="var(--biome-ne)" stroke="var(--ink)" strokeWidth="1.25" />
                {/* Space visor & duck beak */}
                <rect x="16.2" y="8.6" width="4.2" height="2.2" rx="1.1" fill="var(--biome-n)" stroke="var(--ink)" strokeWidth="0.9" />
                <path d="M20.6 10.6 L24.5 11.4 C24.8 11.8 24.4 12.6 23.6 12.6 L20.4 12.5 Z" fill="var(--danger)" stroke="var(--ink)" strokeWidth="0.9" strokeLinejoin="round" />
                <circle cx="18.6" cy="9.7" r="0.7" fill="var(--surface-1)" />
              </svg>
            </div>
            <div>
              <span className="brand-title">Cockpit-OMNI · Curve of Duck</span>
              <span className="brand-sub">{ui.brandSub}</span>
            </div>
          </a>

          <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", flexWrap: "wrap" }}>
            <nav className="nav-links" aria-label="Primary Navigation">
              {NAV_ITEMS.map(({ path, key, Icon }) => (
                <a
                  key={path}
                  href={path}
                  className={`nav-btn ${route === path ? "active" : ""}`}
                  aria-current={route === path ? "page" : undefined}
                  onClick={(e) => handleRouteClick(path, e)}
                >
                  <Icon size={16} /> {ui[key]}
                </a>
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
                maxHeight: "calc(100dvh - 5.2rem)",
                overflowY: "auto",
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
            <a href="https://www.curveofduck.xyz/" target="_blank" rel="noreferrer">
              www.curveofduck.xyz
            </a>
            {" · "}
            Source:{" "}
            <a href="https://github.com/SunLuiz/Curva_do_Pato" target="_blank" rel="noreferrer">
              github.com/SunLuiz/Curva_do_Pato
            </a>
            {" · "}
            <a href="/science/">Science Monographs</a>
            {" · "}
            <a href="/llms.txt">llms.txt</a>
            {" · "}
            <a href="/llms-full.txt">llms-full.txt</a>
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
