import React from "react";
import { Globe, HardDrive, RefreshCw, Trophy } from "lucide-react";
import { AVATARS } from "../academy/xp";

function storageLabel(storage, lang) {
  if (storage === "github_gist") return "GitHub Gist";
  if (storage === "github_repo") return "GitHub Branch";
  if (storage === "upstash_redis") return "Redis";
  if (storage === "unconfigured") {
    return lang === "pt" ? "Aguardando token Vercel" : "Awaiting Vercel token";
  }
  return lang === "pt" ? "Cache local" : "Browser cache";
}

export default function HallOfFame({
  rows = [],
  currentName = "",
  currentPilotId = "",
  lang = "en",
  rankingStatus = { mode: "local_only", storage: "browser_local", syncing: false, syncedAt: null },
  onRefreshRanking,
}) {
  const l = lang === "pt" ? "pt" : "en";
  const activeKey = (currentName || "").trim().toLowerCase();
  const isGlobal = rankingStatus?.mode === "global_live";
  const isSyncing = Boolean(rankingStatus?.syncing);
  const storeTag = storageLabel(rankingStatus?.storage, l);

  return (
    <div className="card">
      <div className="section-header" style={{ marginBottom: "0.75rem", gap: "0.65rem", flexWrap: "wrap" }}>
        <div>
          <h3 style={{ display: "inline-flex", alignItems: "center", gap: "0.45rem", fontFamily: "var(--font-display)" }}>
            <Trophy size={18} color="var(--biome-ne)" />
            {isGlobal
              ? l === "pt"
                ? "Hall da Fama Mundial"
                : "World Hall of Fame"
              : l === "pt"
                ? "Hall da Fama (Global & Cache Local)"
                : "Hall of Fame (Global Sync & Local)"}
          </h3>
          <div style={{ fontSize: "0.8rem", color: "var(--ink-soft)", marginTop: "0.2rem", lineHeight: 1.38 }}>
            {isGlobal
              ? l === "pt"
                ? `Ranking compartilhado globalmente (${storeTag}) — jogadores no site oficial ou rodando o projeto localmente conectam no mesmo placar.`
                : `Shared worldwide leaderboard (${storeTag}) — players on the live web app or running locally share the same ranking.`
              : rankingStatus?.storage === "unconfigured"
                ? l === "pt"
                  ? "Salvando neste navegador. Defina GITHUB_RANKING_TOKEN (+ Gist/Branch) ou Redis na Vercel para persistência mundial."
                  : "Saving on this browser. Configure GITHUB_RANKING_TOKEN (+ Gist/Branch) or Redis on Vercel to enable worldwide persistence."
                : l === "pt"
                  ? "Salvando localmente neste navegador; sincroniza com o ranking mundial assim que conectado ao endpoint público."
                  : "Saved in your browser localStorage; automatically merges with the worldwide ranking when connected."}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", flexWrap: "wrap" }}>
          <span className={`badge ${isGlobal ? "live" : "cached"}`}>
            {isGlobal ? <Globe size={12} /> : <HardDrive size={12} />}
            {isGlobal ? `GLOBAL LIVE · ${storeTag}` : `LOCAL CACHE · ${storeTag}`}
          </span>
          <span className="badge ns">
            {rows.length} {l === "pt" ? (rows.length === 1 ? "piloto" : "pilotos") : rows.length === 1 ? "pilot" : "pilots"}
          </span>
          {onRefreshRanking && (
            <button
              type="button"
              className="btn-secondary"
              onClick={onRefreshRanking}
              disabled={isSyncing}
              style={{ padding: "0.28rem 0.6rem", fontSize: "0.75rem" }}
              title={l === "pt" ? "Sincronizar ranking mundial" : "Sync worldwide leaderboard"}
            >
              <RefreshCw size={12} />
              <span>{isSyncing ? (l === "pt" ? "Sincronizando..." : "Syncing...") : l === "pt" ? "Atualizar" : "Sync"}</span>
            </button>
          )}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="card-inset" style={{ fontSize: "0.86rem", color: "var(--ink-soft)" }}>
          {l === "pt"
            ? "Nenhum piloto pontuou ainda nesta sessão. Conclua uma missão 3D ou questão científica para entrar no ranking mundial."
            : "No pilots scored yet. Complete any 3D Rover mission or module question to enter the leaderboard."}
        </div>
      ) : (
        <div className="raw-table-wrap">
          <table className="raw-table hof-table">
            <thead>
              <tr>
                <th>#</th>
                <th>{l === "pt" ? "Piloto" : "Pilot"}</th>
                <th>XP</th>
                <th>★</th>
                <th>{l === "pt" ? "3D/Mód" : "3D/Mod"}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => {
                const avatar = AVATARS.find((a) => a.id === r.avatar) || AVATARS[0];
                const isSelf =
                  currentPilotId && r.pilotId && !String(r.pilotId).startsWith("legacy:")
                    ? r.pilotId === currentPilotId
                    : Boolean(activeKey) && String(r.name || "").trim().toLowerCase() === activeKey;
                return (
                  <tr
                    key={`${r.pilotId || r.name}-${idx}`}
                    style={isSelf ? { background: "var(--surface-2)", fontWeight: 700 } : undefined}
                  >
                    <td className="mono">{idx + 1}</td>
                    <td>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.08rem" }}>
                        <span>
                          {r.name}
                          {isSelf ? (l === "pt" ? " (você)" : " (you)") : ""}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: "0.69rem",
                            color: `var(${avatar.tone})`,
                            fontWeight: 600,
                          }}
                        >
                          [{avatar.short}] · {r.depth || "explorer"}
                        </span>
                      </div>
                    </td>
                    <td className="mono" style={{ fontWeight: 700 }}>{r.xp || 0}</td>
                    <td className="mono">{r.stars || 0}</td>
                    <td className="mono" style={{ whiteSpace: "nowrap" }}>
                      {r.missionsWon || 0}/5 · {r.masteredCount || 0}/5
                    </td>
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
