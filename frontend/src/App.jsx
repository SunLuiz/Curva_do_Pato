import React, { useEffect, useState } from "react";
import { Activity, Compass, Layers } from "lucide-react";
import LandingPage from "./pages/LandingPage";
import TrendPage from "./pages/TrendPage";
import AttributionPage from "./pages/AttributionPage";
import { getFires, getSpaceWeather } from "./api";

const ROUTES = ["/", "/trend", "/attribution"];

function normalizeRoute(pathname) {
  return ROUTES.includes(pathname) ? pathname : "/";
}

export default function App() {
  const [route, setRoute] = useState(() => normalizeRoute(window.location.pathname));
  const [region, setRegion] = useState("campinas");
  const [fires, setFires] = useState(null);
  const [spaceWeather, setSpaceWeather] = useState(null);

  useEffect(() => {
    const onPop = () => setRoute(normalizeRoute(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    getFires().then(setFires).catch(() => null);
    getSpaceWeather().then(setSpaceWeather).catch(() => null);
  }, []);

  const navigate = (path) => {
    const clean = normalizeRoute(path);
    if (clean !== window.location.pathname) {
      window.history.pushState({}, "", clean);
    }
    setRoute(clean);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <div className="brand" onClick={() => navigate("/")} role="button" tabIndex={0}>
            <div className="brand-mark" aria-hidden="true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="9" />
                <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-28 12 12)" />
                <circle cx="12" cy="12" r="2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <span className="brand-title">Cockpit-OMNI · Team Curva do Pato</span>
              <span className="brand-sub">Be An Earth System Trend Detective! · Space Apps 2026</span>
            </div>
          </div>

          <nav className="nav-links" aria-label="Primary Navigation">
            <button className={`nav-btn ${route === "/" ? "active" : ""}`} onClick={() => navigate("/")}>
              <Compass size={16} /> Overview
            </button>
            <button className={`nav-btn ${route === "/trend" ? "active" : ""}`} onClick={() => navigate("/trend")}>
              <Activity size={16} /> Trend Engine
            </button>
            <button className={`nav-btn ${route === "/attribution" ? "active" : ""}`} onClick={() => navigate("/attribution")}>
              <Layers size={16} /> Attribution &amp; Sources
            </button>
          </nav>
        </div>
      </header>

      <main className="main-container">
        {route === "/" && (
          <LandingPage onNavigate={navigate} fires={fires} spaceWeather={spaceWeather} />
        )}
        {route === "/trend" && (
          <TrendPage region={region} setRegion={setRegion} onNavigate={navigate} />
        )}
        {route === "/attribution" && (
          <AttributionPage region={region} setRegion={setRegion} />
        )}
      </main>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <strong>Team Curva do Pato (Luiz Antonio Gois Junior) · Built at NASA Space Apps Challenge 2026 — Campinas, SP, Brazil</strong> · No NASA logo or insignia is used; all NASA datasets are cited directly below.
          </div>
          <div>
            Sources: NASA POWER (MERRA-2 / CERES), NASA FIRMS (VIIRS NOAA-21 NRT), NASA DONKI, NASA Earthdata CMR MCP (C3264430167-LANCEMODIS, NISAR_L2_GUNW_PROVISIONAL_V1), and{" "}
            <a href="https://github.com/bilawalsidhu/gods-eye-view" target="_blank" rel="noreferrer">
              God&apos;s Eye View (MIT / TeleGeography CC BY-NC-SA carve-out)
            </a>
            .
          </div>
          <div style={{ color: "#64748b" }}>
            Prototype Notice: Trend estimates and attribution summaries are comparative statistical calculations over historical open NASA datasets (1984–2025) and are not certified operational forecasts.
          </div>
        </div>
      </footer>
    </div>
  );
}
