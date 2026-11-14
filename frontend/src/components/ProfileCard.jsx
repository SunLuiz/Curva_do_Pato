import React, { useState } from "react";
import { Brain, Trash2, UserCheck } from "lucide-react";
import { AVATARS, DEPTH_TRACKS } from "../academy/xp";

export default function ProfileCard({ profile, onSave, onForget }) {
  const [nameInput, setNameInput] = useState(profile.name || "");
  const [showMemory, setShowMemory] = useState(false);

  const selectedAvatar = AVATARS.find((a) => a.id === profile.avatar) || AVATARS[0];

  const handleSubmitName = (e) => {
    e.preventDefault();
    const cleaned = nameInput.trim().slice(0, 32);
    if (!cleaned) return;
    onSave({ ...profile, name: cleaned });
  };

  return (
    <div className="card" style={{ marginBottom: "1.25rem" }}>
      <div className="section-header" style={{ marginBottom: "0.85rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
          <div
            aria-hidden="true"
            style={{
              width: 44,
              height: 44,
              borderRadius: "999px",
              display: "grid",
              placeItems: "center",
              background: `var(${selectedAvatar.tone})`,
              color: "var(--surface-1)",
              fontFamily: "var(--font-mono)",
              fontWeight: 700,
              fontSize: "0.85rem",
              flexShrink: 0,
            }}
          >
            {selectedAvatar.short}
          </div>
          <div>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: "1.15rem" }}>
              {profile.name ? `Detective ${profile.name}` : "Create Your Field Profile"}
            </h3>
            <div style={{ fontSize: "0.82rem", color: "var(--ink-soft)" }}>
              Zero login · Saved only in your browser&apos;s localStorage · {selectedAvatar.label}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.55rem", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setShowMemory((v) => !v)}
            aria-expanded={showMemory}
          >
            <Brain size={15} /> {showMemory ? "Hide memory dossier" : "Inspect 3-layer memory"}
          </button>

          {profile.name && (
            <button
              type="button"
              className="btn-secondary"
              style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
              onClick={() => {
                setNameInput("");
                onForget();
              }}
            >
              <Trash2 size={14} /> Forget me
            </button>
          )}
        </div>
      </div>

      <form
        onSubmit={handleSubmitName}
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.65rem",
          alignItems: "center",
          marginBottom: "1rem",
        }}
      >
        <label htmlFor="detective-name-input" className="stat-label" style={{ marginRight: "0.25rem" }}>
          Codename
        </label>
        <input
          id="detective-name-input"
          type="text"
          maxLength={32}
          value={nameInput}
          onChange={(e) => setNameInput(e.target.value)}
          placeholder="e.g. Ana-Cerrado"
          style={{
            background: "var(--surface-0)",
            color: "var(--ink)",
            border: "1px solid var(--hairline-strong)",
            borderRadius: "var(--radius-sm)",
            padding: "0.48rem 0.8rem",
            fontFamily: "var(--font-sans)",
            fontSize: "0.9rem",
            minWidth: 210,
          }}
        />
        <button type="submit" className="btn-primary" style={{ padding: "0.5rem 0.95rem" }}>
          <UserCheck size={15} /> {profile.name ? "Update name" : "Start as detective"}
        </button>
      </form>

      {/* Avatar selector */}
      <div style={{ marginBottom: "1rem" }}>
        <div className="stat-label" style={{ marginBottom: "0.45rem" }}>
          Biome Emblem
        </div>
        <div className="pill-tabs">
          {AVATARS.map((a) => (
            <button
              key={a.id}
              type="button"
              className={`pill ${profile.avatar === a.id ? "active" : ""}`}
              onClick={() => onSave({ ...profile, avatar: a.id })}
            >
              <span className="mono" style={{ fontSize: "0.74rem", opacity: 0.8 }}>
                {a.short}
              </span>{" "}
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Depth track selector */}
      <div>
        <div className="stat-label" style={{ marginBottom: "0.45rem" }}>
          Reasoning Depth (adapts question framing &amp; AskPanel tone)
        </div>
        <div className="grid grid-3" style={{ gap: "0.65rem" }}>
          {DEPTH_TRACKS.map((t) => {
            const active = profile.depth === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => onSave({ ...profile, depth: t.id })}
                className="card-inset"
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  borderColor: active ? "var(--sig)" : "var(--hairline)",
                  background: active ? "var(--surface-1)" : "var(--surface-2)",
                  boxShadow: active ? "var(--shadow-card)" : "none",
                }}
              >
                <div style={{ fontWeight: 700, fontSize: "0.9rem", color: active ? "var(--sig)" : "var(--ink)" }}>
                  {t.label}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: "0.2rem", lineHeight: 1.4 }}>
                  {t.tagline}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {showMemory && (
        <div className="card-inset" style={{ marginTop: "1rem" }}>
          <div className="stat-label" style={{ marginBottom: "0.35rem" }}>
            Auditable 3-Layer Local Memory (DeepTutor-inspired, localStorage only)
          </div>
          <div className="mono" style={{ fontSize: "0.78rem", color: "var(--ink)", lineHeight: 1.55 }}>
            <div>
              <strong>Layer 3 Synthesis:</strong> {profile.summary}
            </div>
            <div style={{ marginTop: "0.35rem", color: "var(--ink-soft)" }}>
              <strong>Layer 2 Mastery Records:</strong>{" "}
              {Object.keys(profile.mastery || {}).length
                ? Object.entries(profile.mastery)
                    .map(([k, v]) => `${k}:${Math.round((v.score || 0) * 100)}%${v.passed ? "(PASS)" : "(RETRY)"}`)
                    .join(" · ")
                : "No completed modules yet."}
            </div>
            <div style={{ marginTop: "0.35rem", color: "var(--ink-soft)" }}>
              <strong>Layer 1 Event Trace (last {(profile.events || []).length}/20):</strong>{" "}
              {(profile.events || []).length
                ? (profile.events || [])
                    .slice(-5)
                    .map((ev) => `${ev.questionId}(${ev.correct ? "ok" : "miss"}${ev.usedHint ? "+hint" : ""})`)
                    .join(" -> ")
                : "None recorded yet."}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
