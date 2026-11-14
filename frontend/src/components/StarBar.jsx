import React from "react";
import { Award, Flame, Star, Zap } from "lucide-react";

export default function StarBar({ profile }) {
  const masteredCount = Object.values(profile.mastery || {}).filter((m) => m?.passed).length;

  return (
    <div
      className="card-inset"
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        marginBottom: "1.25rem",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.15rem", alignItems: "center" }}>
        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <Star size={17} color="var(--biome-ne)" />
          <span className="mono" style={{ fontWeight: 700, color: "var(--ink)" }}>
            {profile.stars || 0}
          </span>
          <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>Stars</span>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <Zap size={17} color="var(--biome-n)" />
          <span className="mono" style={{ fontWeight: 700, color: "var(--ink)" }}>
            {profile.xp || 0}
          </span>
          <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>XP</span>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <Flame size={17} color="var(--danger)" />
          <span className="mono" style={{ fontWeight: 700, color: "var(--ink)" }}>
            {profile.streak || 0}
          </span>
          <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>Unassisted streak</span>
        </div>

        <div style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem" }}>
          <Award size={17} color="var(--sig)" />
          <span className="mono" style={{ fontWeight: 700, color: "var(--ink)" }}>
            {masteredCount}/5
          </span>
          <span style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>Modules mastered</span>
        </div>
      </div>

      <span className="badge ns" style={{ fontSize: "0.73rem" }}>
        Track: {profile.depth}
      </span>
    </div>
  );
}
