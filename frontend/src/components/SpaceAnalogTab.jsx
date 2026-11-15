import React, { useEffect, useMemo, useState } from "react";
import { Database, Gamepad2, Leaf, Orbit, Radio, ShieldCheck } from "lucide-react";
import { getSpaceAnalog } from "../api";
import GlossaryTooltip from "./GlossaryTooltip";
import {
  buildGameDeepLink,
  computeUnifiedMPTO,
  defaultParamsForPlanet,
  enrichFrontiersWithLiveState,
} from "../engine/mptoEngine";
import PrecedingExplanation from "./space/PrecedingExplanation";
import PlanetaryVectorSelector from "./space/PlanetaryVectorSelector";
import MPTOUnifiedSimulator from "./space/MPTOUnifiedSimulator";
import GeotechnicalSlipPanel from "./space/GeotechnicalSlipPanel";
import WindStressDecisionPanel from "./space/WindStressDecisionPanel";
import OpticalQualityPanel from "./space/OpticalQualityPanel";
import AgentOrchestrationPanel from "./space/AgentOrchestrationPanel";

const FRONTIER_TO_MISSION = {
  1: "M1",
  2: "M5",
  3: "M5",
  4: "M5",
  5: "M3",
  6: "M2",
  7: "M3",
};

/**
 * Tab 5: Space Analog & Multi-Physics Thermodynamic Orchestration (MPTO).
 * Unifies live/cached zero-key NASA feeds (DSN Now, OSDR OSD-615, CelesTrak GP) with
 * the shared Rover Pilot 3D physics core (planetaryPhysics.js via mptoEngine.js) and
 * provides preceding explanations above every visualization and simulation block.
 * Zero hex literals in JSX.
 */
export default function SpaceAnalogTab({ lang = "en", onNavigate }) {
  const l = lang === "pt" ? "pt" : "en";
  const [payload, setPayload] = useState(null);
  const [status, setStatus] = useState("loading");
  const [params, setParams] = useState(() => defaultParamsForPlanet("mars_jezero"));

  useEffect(() => {
    let cancelled = false;
    getSpaceAnalog()
      .then((res) => {
        if (!cancelled) {
          setPayload(res);
          setStatus("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const unified = useMemo(() => computeUnifiedMPTO(params), [params]);

  const handleSelectPlanet = (planetId) => {
    setParams(defaultParamsForPlanet(planetId));
  };

  const handleResetNominal = () => {
    setParams(defaultParamsForPlanet(params.planetId));
  };

  const handleChangeParam = (key, value) => {
    setParams((prev) => ({ ...prev, [key]: value }));
  };

  const handleLaunchGame = (missionId) => {
    const targetUrl = buildGameDeepLink({
      missionId: missionId || params.recommendedMission || "M5",
      planetId: params.planetId,
      depth: "specialist",
      tau: params.tau,
    });
    if (typeof onNavigate === "function") {
      onNavigate(targetUrl);
    } else if (typeof window !== "undefined") {
      window.location.assign(targetUrl);
    }
  };

  if (status === "loading") {
    return (
      <div className="card">
        {l === "pt"
          ? "Carregando telemetria aberta NASA DSN, OSDR (OSD-615) e CelesTrak..."
          : "Loading open NASA DSN Now, OSDR (OSD-615), and CelesTrak telemetry..."}
      </div>
    );
  }

  if (status === "error" || !payload) {
    return (
      <div className="card" style={{ color: "var(--danger)" }}>
        {l === "pt"
          ? "Não foi possível carregar o cache análogo espacial."
          : "Could not load space analog cache snapshot."}
      </div>
    );
  }

  const dsn = payload.dsn || {};
  const osdr = payload.osdr || {};
  const cel = payload.celestrak || {};
  const statuses = payload.feed_statuses || {};
  const liveFrontiers = enrichFrontiersWithLiveState(payload.mpto_frontiers || [], unified, l);

  return (
    <div style={{ display: "grid", gap: "1.35rem" }}>
      {/* Intro & Honest Provenance */}
      <div className="card" style={{ borderLeft: "4px solid var(--biome-n)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <Orbit size={18} color="var(--biome-n)" aria-hidden="true" />
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem" }}>
              {l === "pt"
                ? "Análogo Espacial & Orquestração Multifísica Consolidada (MPTO)"
                : "Space Analog & Unified Multi-Physics Orchestration (MPTO)"}
            </h2>
          </div>
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            <span className="badge sig">
              {l === "pt" ? "3 Feeds Abertos + Motor Único 3D" : "3 Open Feeds + Shared 3D Engine"}
            </span>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: "0.35rem 0.85rem", fontSize: "0.78rem" }}
              onClick={() => handleLaunchGame(params.recommendedMission || "M5")}
            >
              <Gamepad2 size={14} />
              {l === "pt" ? "Simular no Jogo 3D" : "Simulate in 3D Game"}
            </button>
          </div>
        </div>
        <p style={{ fontSize: "0.88rem", color: "var(--ink-soft)", marginTop: "0.45rem", maxWidth: "82ch", lineHeight: 1.55 }}>
          {l === "pt" ? (
            <>
              Esta aba consolida as equações determinísticas de <strong>planetaryPhysics.js</strong> no Cockpit operacional:
              eletricidade solar Beer-Lambert, radiador <GlossaryTooltip termKey="mpto" lang={l}>T⁴ (MPTO)</GlossaryTooltip>,
              inversão geotécnica a 64 m, estresse eólico, qualidade óptica (999999999.0) e reserva fotossintética{" "}
              <GlossaryTooltip termKey="soc_bio" lang={l}>SoC_bio</GlossaryTooltip>. Cada bloco abaixo inicia com a{" "}
              <strong>explicação física antecedente</strong> separando dados reais NASA dos cálculos paramétricos.
            </>
          ) : (
            <>
              This tab consolidates the exact deterministic engine of <strong>planetaryPhysics.js</strong> inside the Cockpit:
              Beer-Lambert PV, <GlossaryTooltip termKey="mpto" lang={l}>T⁴ radiation rejection</GlossaryTooltip>, 64 m
              geotechnical slip inversion, wind stress, optical quality (999999999.0), and{" "}
              <GlossaryTooltip termKey="soc_bio" lang={l}>SoC_bio</GlossaryTooltip> biomass reserve. Every block opens with a{" "}
              <strong>preceding physical explanation</strong> distinguishing verified open NASA telemetry from model exploration.
            </>
          )}
        </p>
      </div>

      {/* Block 1: Open Telemetry Feeds Preceded by Explanation */}
      <section style={{ display: "grid", gap: "0.75rem" }}>
        <PrecedingExplanation
          stepLabel={l === "pt" ? "Bloco 1 · Telemetria Aberta NASA & Contexto Orbital" : "Block 1 · Verified Open NASA Telemetry"}
          title={
            l === "pt"
              ? "Antenas DSN, Eclipses Orbitais (CelesTrak), Estufa OSD-615 e Fontes Planetárias"
              : "DSN Tracking, Orbital Eclipses (CelesTrak), OSD-615 Biomass & Planetary Adapters"
          }
          badge={l === "pt" ? "Dados Reais Sem Chave de API" : "Zero-Key Open Telemetry"}
          tone="--biome-n"
          lang={l}
          whyItMatters={
            l === "pt"
              ? "Antes de parametrizar o simulador, estes 4 cartões exibem telemetria observacional congelada/ao vivo: janelas de eclipse orbital do CelesTrak (~35% de sombra que exige bateria), links ativos da Deep Space Network, biologia vegetal da estação orbital (OSDR OSD-615) e conectores MEDA/JPL Horizons."
              : "Before sweeping parametric models, these 4 panels display verified observational baselines: CelesTrak orbital eclipse fraction (~35% shadow driving battery survival), live Deep Space Network tracking links, crop cell-wall physiology (NASA OSDR OSD-615), and Mars 2020 MEDA / JPL Horizons adapters."
          }
        />

        <div className="grid-2">
          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: 700 }}>
                <Radio size={16} color="var(--biome-se)" /> {dsn.source || "NASA Deep Space Network Now"}
              </span>
              <span className="badge live">{statuses.dsn === "live" ? "live / snapshot" : "frozen snapshot"}</span>
            </div>
            <div style={{ marginTop: "0.55rem", fontSize: "0.88rem", color: "var(--ink)" }}>
              <strong>{dsn.stations?.join(" · ") || "Goldstone · Madrid · Canberra"}</strong> —{" "}
              {dsn.active_dishes_count ?? 14}/{dsn.total_dishes ?? 14}{" "}
              {l === "pt" ? "antenas ativas" : "active dishes"}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.55rem" }}>
              {(dsn.sample_active || []).slice(0, 6).map((d) => (
                <span key={d.name} className="badge" style={{ fontSize: "0.72rem" }}>
                  {d.name} -&gt; {(d.targets || []).join(", ") || "DSN"}
                  {d.down_band ? ` (${d.down_band})` : ""}
                </span>
              ))}
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: 700 }}>
                <Orbit size={16} color="var(--biome-n)" /> {cel.source || "CelesTrak NORAD GP"}
              </span>
              <span className="badge live">{statuses.celestrak === "live" ? "live / snapshot" : "frozen snapshot"}</span>
            </div>
            <div style={{ marginTop: "0.55rem", fontSize: "0.88rem" }}>
              <strong>{cel.object_name || "ISS (ZARYA)"}</strong> · {cel.objects_count ?? 17}{" "}
              {l === "pt" ? "estações rastreadas" : "tracked station objects"}
            </div>
            <div className="mono" style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: "0.4rem" }}>
              {l === "pt" ? "Período orbital:" : "Orbital period:"} {cel.orbital_period_min} min ·{" "}
              {l === "pt" ? "Eclipse solar ~" : "Orbital eclipse ~"} {cel.approx_eclipse_min} min ({cel.approx_eclipse_pct}%) · Inc {cel.inclination_deg}°
            </div>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: 700 }}>
                <Leaf size={16} color="var(--sig)" /> NASA OSDR {osdr.study_id || "OSD-615"}
              </span>
              <span className="badge sig">verified dataset</span>
            </div>
            <div style={{ fontWeight: 600, fontSize: "0.86rem", marginTop: "0.45rem", color: "var(--ink)" }}>
              {osdr.title}
            </div>
            <p style={{ fontSize: "0.79rem", color: "var(--ink-soft)", marginTop: "0.3rem", lineHeight: 1.45 }}>
              {osdr.biological_role}
            </p>
          </div>

          <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", fontWeight: 700 }}>
                <Database size={16} color="var(--roadmap)" /> JPL Horizons &amp; Mars 2020 MEDA
              </span>
              <span className="badge roadmap">API client wired</span>
            </div>
            <ul style={{ marginTop: "0.5rem", paddingLeft: "1.1rem", fontSize: "0.82rem", color: "var(--ink-soft)", lineHeight: 1.55 }}>
              {(payload.existing_clients || []).map((c) => (
                <li key={c.id}>
                  <strong>{c.label}</strong> — <span className="mono">{c.status}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Block 2: Planetary Context Vector Θ Selector */}
      <PlanetaryVectorSelector
        activePlanetId={params.planetId}
        onSelectPlanet={handleSelectPlanet}
        onResetNominal={handleResetNominal}
        lang={l}
      />

      {/* Block 3: Coupled MPTO Simulator + 3D Game Deep Link */}
      <MPTOUnifiedSimulator
        params={params}
        unified={unified}
        onChangeParam={handleChangeParam}
        onLaunchGame={handleLaunchGame}
        lang={l}
      />

      {/* Block 4: 64 m Impulse-Response Inversion & Wheel Slip Matrix */}
      <GeotechnicalSlipPanel
        unified={unified}
        terrainProfile={params.terrainProfile}
        slope={params.slope}
        onChangeTerrainProfile={(val) => handleChangeParam("terrainProfile", val)}
        onChangeSlope={(val) => handleChangeParam("slope", val)}
        lang={l}
      />

      {/* Block 5: Aerodynamic Wind Stress & Cleaning Window */}
      <WindStressDecisionPanel
        params={params}
        unified={unified}
        onChangeParam={handleChangeParam}
        lang={l}
      />

      {/* Block 6: Optical Frame Derivative (t-1 -> t) & Sentinel 999999999.0 */}
      <OpticalQualityPanel
        params={params}
        unified={unified}
        onChangeParam={handleChangeParam}
        lang={l}
      />

      {/* Block 7: Live-Bound 7 Frontiers Matrix */}
      <section style={{ display: "grid", gap: "0.75rem" }}>
        <PrecedingExplanation
          stepLabel={l === "pt" ? "Bloco 7 · As 7 Fronteiras Físicas em Tempo Real" : "Block 7 · Live-Bound 7 MPTO Frontiers"}
          title={
            l === "pt"
              ? "Integração Operacional das 7 Fronteiras do Despacho Multifísico"
              : "Operational Binding of All 7 Off-World MPTO Dispatch Frontiers"
          }
          badge="NOMINAL / WATCH / CRITICAL"
          tone="--biome-se"
          lang={l}
          whyItMatters={
            l === "pt"
              ? "Cada uma das 7 fronteiras físicas da arquitetura MPTO está vinculada ao vetor Θ e aos controles que você ajustou acima. Valores fora da envoltória segura mudam automaticamente para WATCH (âmbar) ou CRITICAL (vermelho) e oferecem salto direto para a missão 3D correspondente."
              : "Each of the 7 physical MPTO boundaries is bound live to vector Θ and the actuator states above. Threshold excursions automatically transition cards to WATCH or CRITICAL and link straight to the matching 3D Rover scenario."
          }
        />

        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.45rem", marginBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
              <ShieldCheck size={17} color="var(--biome-se)" />
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.1rem" }}>
                {l === "pt"
                  ? "Estado Vivo das 7 Fronteiras MPTO"
                  : "Live Status of the 7 MPTO Dispatch Frontiers"}
              </h3>
            </div>
            <span className="mono" style={{ fontSize: "0.76rem", color: "var(--ink-soft)" }}>
              {l === "pt" ? unified.planet.labelPt : unified.planet.labelEn}
            </span>
          </div>

          <div className="grid-2">
            {liveFrontiers.map((f) => {
              const targetMission = FRONTIER_TO_MISSION[f.id] || "M5";
              const statusBadgeClass =
                f.liveLevel === "critical" ? "cached" : f.liveLevel === "watch" ? "cached" : "live";
              return (
                <div
                  key={f.id}
                  className="card-inset"
                  style={{
                    background: "var(--surface-0)",
                    borderColor: f.liveLevel === "critical" ? "var(--danger)" : "var(--hairline)",
                    display: "grid",
                    gap: "0.4rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                    <span className="badge" style={{ fontSize: "0.7rem" }}>
                      #{f.id} · {f.layer}
                    </span>
                    <span className={`badge ${statusBadgeClass}`} style={{ fontSize: "0.68rem", color: f.liveTone }}>
                      {f.liveLevel.toUpperCase()} · {f.liveMetric}
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--ink)" }}>
                    {l === "pt" ? f.title_pt : f.title_en}
                  </div>
                  <p style={{ fontSize: "0.79rem", color: "var(--ink-soft)", lineHeight: 1.45 }}>
                    {l === "pt" ? f.detail_pt : f.detail_en}
                  </p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.45rem", flexWrap: "wrap", paddingTop: "0.25rem", borderTop: "1px dashed var(--hairline)" }}>
                    <span className="mono" style={{ fontSize: "0.73rem", color: f.liveTone, fontWeight: 600 }}>
                      {f.liveNote}
                    </span>
                    <button
                      type="button"
                      className="btn-ghost"
                      style={{ padding: "0.2rem 0.55rem", fontSize: "0.73rem" }}
                      onClick={() => handleLaunchGame(targetMission)}
                    >
                      <Gamepad2 size={12} /> {targetMission} 3D -&gt;
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Block 8: 7-Agent + Statistical Auditor + VCE/FPGA Orchestration */}
      <AgentOrchestrationPanel unified={unified} lang={l} />
    </div>
  );
}
