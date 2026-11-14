import React from "react";
import { Activity, Compass, GraduationCap } from "lucide-react";

const NAV_ITEMS = [
  { path: "/", label: "Story", Icon: Compass },
  { path: "/academy", label: "Academy", Icon: GraduationCap },
  { path: "/cockpit", label: "Cockpit", Icon: Activity },
];

export default function AppShell({ route, onNavigate, fullBleed = false, children }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="brand" onClick={() => onNavigate("/")} type="button">
            <div className="brand-mark" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 16c4-6 7 2 11-5 2.5-4.4 4.5-4 7-3" strokeLinecap="round" />
                <circle cx="21" cy="8" r="2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <span className="brand-title">Cockpit-OMNI · Curva do Pato</span>
              <span className="brand-sub">Be An Earth System Trend Detective! · Space Apps 2026</span>
            </div>
          </button>

          <nav className="nav-links" aria-label="Primary Navigation">
            {NAV_ITEMS.map(({ path, label, Icon }) => (
              <button
                key={path}
                type="button"
                className={`nav-btn ${route === path ? "active" : ""}`}
                aria-current={route === path ? "page" : undefined}
                onClick={() => onNavigate(path)}
              >
                <Icon size={16} /> {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className={`main-container ${fullBleed ? "story-full" : ""}`}>{children}</main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <strong>Team Curva do Pato (Luiz Antonio Gois Junior) · Built at NASA Space Apps Challenge 2026 — Campinas, SP, Brazil</strong>{" "}
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
