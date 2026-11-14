import React from "react";
import { Trophy } from "lucide-react";
import { AVATARS } from "../academy/xp";

export default function HallOfFame({ rows, currentName }) {
  const activeKey = (currentName || "").trim().toLowerCase();

  return (
    <div className="card">
      <div className="section-header" style={{ marginBottom: "0.75rem" }}>
        <div>
          <h3 style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontFamily: "var(--font-display)" }}>
            <Trophy size={18} color="var(--biome-ne)" /> Device Hall of Fame
          </h3>
          <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: "0.2rem" }}>
            This device only — stored in your browser&apos;s localStorage. No account, no server tracking.
          </div>
        </div>
        <span className="badge ns">{rows.length} local detectives</span>
      </div>

      {rows.length === 0 ? (
        <div className="card-inset" style={{ fontSize: "0.86rem", color: "var(--ink-soft)" }}>
          No completed attempts recorded on this browser yet. Enter a codename above and answer any module question to appear here.
        </div>
      ) : (
        <div className="raw-table-wrap">
          <table className="raw-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Detective</th>
                <th>Track</th>
                <th>Mastered</th>
                <th>Stars</th>
                <th>XP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const avatar = AVATARS.find((a) => a.id === r.avatar) || AVATARS[0];
                const isSelf = activeKey && r.name.toLowerCase() === activeKey;
                return (
                  <tr
                    key={`${r.name}-${idx}`}
                    style={isSelf ? { background: "var(--surface-2)", fontWeight: 700 } : undefined}
                  >
                    <td className="mono">{idx + 1}</td>
                    <td>
                      <span
                        className="mono"
                        style={{
                          display: "inline-block",
                          marginRight: "0.45rem",
                          fontSize: "0.72rem",
                          color: `var(${avatar.tone})`,
                        }}
                      >
                        [{avatar.short}]
                      </span>
                      {r.name}
                      {isSelf ? " (you)" : ""}
                    </td>
                    <td>{r.depth}</td>
                    <td className="mono">{r.masteredCount || 0}/5</td>
                    <td className="mono">{r.stars || 0}</td>
                    <td className="mono">{r.xp || 0}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
