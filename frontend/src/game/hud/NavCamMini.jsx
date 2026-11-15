import React from "react";
import { ARENA_HALF } from "../sim/terrainField";

export default function NavCamMini({ snapshot, lang = "en" }) {
  const l = lang === "pt" ? "pt" : "en";
  if (!snapshot) return null;

  const { rover, resources, telemetry, planet, zones = [], alert } = snapshot;
  const deltaPct = Math.round((resources.frameDelta || 0) * 100);
  const stillFlag = Math.abs(rover.speed) < 0.25 ? 1 : 0;
  const tau = telemetry.currentPoint?.tau ?? 0.4;

  // Map [-ARENA_HALF, ARENA_HALF] -> [8, 88] inside 96x96 radar
  const mapCoord = (v) => 48 + (v / ARENA_HALF) * 40;

  return (
    <div className="navcam-mini" aria-label="NavCam and Radar HUD">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.4rem" }}>
        <span>NAVCAM t-1→t</span>
        <span>{stillFlag === 1 ? "STILL=1" : "MOV=0"}</span>
      </div>

      <div className="navcam-meter-track" title="Frame difference |I_t - I_t-1|">
        <div
          className={`navcam-meter-fill ${deltaPct >= 62 || telemetry.sentinelPending ? "hot" : ""}`}
          style={{ width: `${Math.min(100, deltaPct)}%` }}
        />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.66rem", opacity: 0.88 }}>
        <span>ΔI {(resources.frameDelta || 0).toFixed(2)}</span>
        <span>τ={tau.toFixed(2)}</span>
        <span>g={planet.g}</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.65rem", opacity: 0.92, marginTop: "0.18rem" }}>
        <span>SLIP {Math.round(rover.wheelSlipPct ?? 6)}%</span>
        <span style={{ color: (rover.energyCostMult || 1) > 1.1 ? "var(--hud-red)" : "var(--hud-green)", fontWeight: 700 }}>
          {(rover.energyCostMult || 1).toFixed(1)}× Wh/km
        </span>
      </div>

      {/* Tactical 2D Radar showing zones vs rover position */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.35rem" }}>
        <svg width="74" height="74" viewBox="0 0 96 96" aria-label="Tactical radar">
          <rect x="2" y="2" width="92" height="92" rx="10" fill="none" stroke="rgba(255,255,255,0.2)" />
          <line x1="48" y1="4" x2="48" y2="92" stroke="rgba(255,255,255,0.1)" />
          <line x1="4" y1="48" x2="92" y2="48" stroke="rgba(255,255,255,0.1)" />
          {zones.map((z) => {
            const color =
              z.kind === "hazard"
                ? "var(--hud-red)"
                : z.id === alert.targetZoneId
                ? "var(--hud-green)"
                : "var(--hud-cyan)";
            return (
              <circle
                key={z.id}
                cx={mapCoord(z.x)}
                cy={mapCoord(z.z)}
                r={z.id === alert.targetZoneId ? 5 : 3.5}
                fill={color}
                opacity={z.id === alert.targetZoneId ? 1 : 0.68}
              />
            );
          })}
          <circle cx={mapCoord(rover.x)} cy={mapCoord(rover.z)} r="4" fill="var(--hud-amber)" />
        </svg>
        <div style={{ fontSize: "0.64rem", lineHeight: 1.32, opacity: 0.9 }}>
          <div>ρ={planet.rho} kg/m³</div>
          <div>τc={rover.tauC_Pa ?? 85} Pa · {rover.grainSizeUm ?? 40} μm</div>
          <div>{l === "pt" ? "Poeira:" : "Dust:"} {Math.round(resources.soiling)}%</div>
          <div>{l === "pt" ? "Alvo:" : "Goal:"} {alert.targetZoneId || "—"}</div>
        </div>
      </div>
    </div>
  );
}
