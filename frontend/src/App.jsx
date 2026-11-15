import React, { useCallback, useEffect, useState } from "react";
import AppShell from "./components/AppShell";
import AskPanel from "./components/AskPanel";
import StoryPage from "./pages/StoryPage";
import AcademyPage from "./pages/AcademyPage";
import CockpitPage from "./pages/CockpitPage";
import { API_BASE, getFires, getSpaceWeather, verifyTrendLive } from "./api";
import { probeBackend } from "./engine/trend";
import {
  forgetProfile,
  loadHallOfFame,
  loadProfile,
  saveProfile,
} from "./academy/storage";

const VALID_ROUTES = ["/", "/academy", "/cockpit"];
const VALID_TABS = ["trend", "attribution", "sources", "live", "space"];
const ALIAS_MAP = {
  "/trend": "/cockpit?tab=trend",
  "/attribution": "/cockpit?tab=attribution",
};

function parseLocation() {
  if (typeof window === "undefined") {
    return { route: "/", tab: "trend", normalized: null };
  }
  const rawPath = window.location.pathname || "/";
  if (ALIAS_MAP[rawPath]) {
    const target = ALIAS_MAP[rawPath];
    const url = new URL(target, window.location.origin);
    return {
      route: "/cockpit",
      tab: url.searchParams.get("tab") || "trend",
      normalized: target,
    };
  }
  const route = VALID_ROUTES.includes(rawPath) ? rawPath : "/";
  const params = new URLSearchParams(window.location.search);
  const tabParam = params.get("tab");
  const tab = VALID_TABS.includes(tabParam) ? tabParam : "trend";
  return { route, tab, normalized: rawPath !== route ? "/" : null };
}

export default function App() {
  const initial = parseLocation();
  const [route, setRoute] = useState(initial.route);
  const [cockpitTab, setCockpitTab] = useState(initial.tab);
  const [region, setRegion] = useState("campinas");
  const [variable, setVariable] = useState("T2M");
  const [fires, setFires] = useState(null);
  const [spaceWeather, setSpaceWeather] = useState(null);
  const [backendStatus, setBackendStatus] = useState({ live: false, reason: "checking" });
  const [profile, setProfile] = useState(() => loadProfile());
  const [hallOfFame, setHallOfFame] = useState(() => loadHallOfFame());
  const [lang, setLang] = useState("en");

  useEffect(() => {
    if (initial.normalized) {
      window.history.replaceState({}, "", initial.normalized);
    }
  }, []);

  useEffect(() => {
    const onPop = () => {
      const parsed = parseLocation();
      setRoute(parsed.route);
      setCockpitTab(parsed.tab);
      if (parsed.normalized) {
        window.history.replaceState({}, "", parsed.normalized);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    probeBackend(API_BASE).then(setBackendStatus);
    getFires().then(setFires).catch(() => {});
    getSpaceWeather().then(setSpaceWeather).catch(() => {});
  }, []);

  const navigate = useCallback((rawTarget) => {
    const url = new URL(rawTarget, window.location.origin);
    const aliased = ALIAS_MAP[url.pathname];
    if (aliased) {
      const targetUrl = new URL(aliased, window.location.origin);
      window.history.replaceState({}, "", aliased);
      setRoute("/cockpit");
      setCockpitTab(targetUrl.searchParams.get("tab") || "trend");
      window.scrollTo(0, 0);
      return;
    }

    const nextRoute = VALID_ROUTES.includes(url.pathname) ? url.pathname : "/";
    const tabParam = url.searchParams.get("tab");
    const nextTab = VALID_TABS.includes(tabParam) ? tabParam : "trend";
    const fullTarget =
      nextRoute === "/cockpit" && tabParam ? `/cockpit?tab=${nextTab}` : nextRoute;

    if (fullTarget !== `${window.location.pathname}${window.location.search}`) {
      window.history.pushState({}, "", fullTarget);
    }
    setRoute(nextRoute);
    if (nextRoute === "/cockpit") {
      setCockpitTab(nextTab);
    }
    window.scrollTo(0, 0);
  }, []);

  const handleSetTab = useCallback((nextTab) => {
    const valid = VALID_TABS.includes(nextTab) ? nextTab : "trend";
    setCockpitTab(valid);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", `/cockpit?tab=${valid}`);
    }
  }, []);

  const handleCockpitAction = useCallback(
    ({ tab = "trend", region: r, variable: v }) => {
      if (r) setRegion(r);
      if (v) setVariable(v);
      navigate(`/cockpit?tab=${tab}`);
    },
    [navigate]
  );

  const handleVerifyLive = useCallback(async ({ region: r, variable: v }) => {
    const result = await verifyTrendLive({ region: r, variable: v });
    setBackendStatus(
      result.live
        ? { live: true, service: result.service }
        : { live: false, reason: "offline" }
    );
    return result;
  }, []);

  const handleSaveProfile = useCallback((next) => {
    const saved = saveProfile(next);
    setProfile(saved);
    setHallOfFame(loadHallOfFame());
  }, []);

  const handleForgetProfile = useCallback(() => {
    const cleared = forgetProfile(profile.name);
    setProfile(cleared);
    setHallOfFame(loadHallOfFame());
  }, [profile.name]);

  return (
    <AppShell route={route} onNavigate={navigate} lang={lang} setLang={setLang} fullBleed={route === "/"}>
      {route === "/" && <StoryPage onNavigate={navigate} lang={lang} />}

      {route === "/academy" && (
        <AcademyPage
          profile={profile}
          hallOfFame={hallOfFame}
          onSaveProfile={handleSaveProfile}
          onForgetProfile={handleForgetProfile}
          onOpenCockpit={handleCockpitAction}
          lang={lang}
        />
      )}

      {route === "/cockpit" && (
        <CockpitPage
          region={region}
          setRegion={setRegion}
          variable={variable}
          setVariable={setVariable}
          tab={cockpitTab}
          setTab={handleSetTab}
          fires={fires}
          spaceWeather={spaceWeather}
          backendStatus={backendStatus}
          onVerifyLive={handleVerifyLive}
          lang={lang}
        />
      )}

      {(route === "/cockpit" || route === "/academy") && (
        <AskPanel
          profile={profile}
          backendStatus={backendStatus}
          apiBase={API_BASE}
          currentRoute={route}
          onNavigateAction={handleCockpitAction}
          lang={lang}
        />
      )}
    </AppShell>
  );
}
