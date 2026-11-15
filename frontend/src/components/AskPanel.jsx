import React, { useMemo, useState } from "react";
import { Compass, MessageSquare, Send, Sparkles, X } from "lucide-react";
import { FAQ_ITEMS, formatPersonalNote } from "../content/faq";
import { UI_TEXT } from "../content/i18n";

export default function AskPanel({
  profile,
  backendStatus,
  apiBase = "",
  currentRoute,
  onNavigateAction,
  lang = "en",
}) {
  const l = lang === "pt" ? "pt" : "en";
  const ui = UI_TEXT[l];
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(FAQ_ITEMS[0].id);
  const [filterText, setFilterText] = useState("");
  const [freeQuestion, setFreeQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [liveReply, setLiveReply] = useState(null);
  const [liveError, setLiveError] = useState(null);

  const isLive = Boolean(backendStatus?.live);
  const activeFaq = FAQ_ITEMS.find((f) => f.id === selectedId) || FAQ_ITEMS[0];

  const filteredFaqs = useMemo(() => {
    const q = filterText.trim().toLowerCase();
    if (!q) return FAQ_ITEMS;
    return FAQ_ITEMS.filter(
      (f) =>
        f.question.toLowerCase().includes(q) ||
        f.answer.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q)
    );
  }, [filterText]);

  const personalNote = formatPersonalNote(profile);

  const handleAskLive = async (e) => {
    e.preventDefault();
    const prompt = freeQuestion.trim();
    if (!prompt || !isLive) return;
    setAsking(true);
    setLiveError(null);
    try {
      const base = (apiBase || "").replace(/\/$/, "");
      const res = await fetch(`${base}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: prompt,
          name: profile?.name || "Visitor",
          depth: profile?.depth || "explorer",
          summary: profile?.summary || "",
          route: currentRoute,
          lang: l,
        }),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.detail || `HTTP ${res.status}`);
      }
      const data = await res.json();
      setLiveReply(data);
    } catch (err) {
      setLiveError(err.message || "Backend ask request failed.");
    } finally {
      setAsking(false);
    }
  };

  return (
    <>
      <div className="ask-fab">
        <button
          type="button"
          className="btn-primary"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="ask-detective-drawer"
          style={{ boxShadow: "var(--shadow-lift)" }}
        >
          {open ? <X size={16} /> : <MessageSquare size={16} />}
          {open ? (l === "pt" ? "Fechar Guia" : "Close Guide") : ui.askFloating}
        </button>
      </div>

      {open && (
        <aside
          id="ask-detective-drawer"
          className="ask-drawer"
          aria-label="Curve of Duck Data Detective Assistant"
        >
          <div
            style={{
              padding: "0.85rem 1.05rem",
              borderBottom: "1px solid var(--hairline)",
              background: "var(--surface-2)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              gap: "0.75rem",
            }}
          >
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontWeight: 700, fontSize: "0.95rem" }}>
                <Sparkles size={15} color="var(--biome-se)" /> {ui.askTitle}
              </div>
              <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)", marginTop: "0.15rem" }}>
                {personalNote ||
                  (l === "pt"
                    ? "10 perguntas verificadas nos dados (100% offline)"
                    : "10 cache-verified questions (works 100% offline)")}
              </div>
            </div>
            <button
              type="button"
              className="btn-ghost"
              style={{ padding: "0.25rem 0.45rem" }}
              onClick={() => setOpen(false)}
              aria-label="Close Ask panel"
            >
              <X size={16} />
            </button>
          </div>

          <div style={{ padding: "0.85rem 1.05rem", overflowY: "auto", display: "flex", flexDirection: "column", gap: "0.8rem" }}>
            <input
              type="search"
              placeholder="Filter verified questions (e.g. wind, Manaus, NISAR)..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              aria-label="Filter canonical questions"
              style={{ width: "100%" }}
            />

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {filteredFaqs.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={`pill ${selectedId === item.id ? "active" : ""}`}
                  style={{ fontSize: "0.75rem", padding: "0.3rem 0.65rem", textAlign: "left" }}
                  onClick={() => {
                    setSelectedId(item.id);
                    setLiveReply(null);
                  }}
                >
                  {item.question}
                </button>
              ))}
            </div>

            {activeFaq && (
              <div className="card-inset" style={{ background: "var(--surface-0)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.5rem" }}>
                  <span className="badge sig" style={{ fontSize: "0.68rem" }}>
                    Verified FAQ · {activeFaq.category}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: "0.9rem", marginTop: "0.45rem", color: "var(--ink)" }}>
                  {activeFaq.question}
                </div>
                <p style={{ fontSize: "0.84rem", color: "var(--ink-soft)", marginTop: "0.35rem", lineHeight: 1.55 }}>
                  {activeFaq.answer}
                </p>
                {activeFaq.action && (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ marginTop: "0.65rem", padding: "0.4rem 0.8rem", fontSize: "0.78rem" }}
                    onClick={() => {
                      onNavigateAction(activeFaq.action);
                      setOpen(false);
                    }}
                  >
                    <Compass size={13} /> Inspect in Cockpit
                  </button>
                )}
              </div>
            )}

            {/* Level 2: Free-text LLM input ONLY mounted when backend /healthz is live */}
            {isLive ? (
              <div className="card-inset">
                <div className="stat-label" style={{ marginBottom: "0.35rem", color: "var(--sig)" }}>
                  Live Tutor Q&amp;A (Server-Grounded)
                </div>
                <form onSubmit={handleAskLive} style={{ display: "flex", gap: "0.45rem" }}>
                  <input
                    type="text"
                    value={freeQuestion}
                    onChange={(e) => setFreeQuestion(e.target.value)}
                    placeholder={ui.askPlaceholder}
                    maxLength={280}
                    style={{
                      flex: 1,
                      background: "var(--surface-1)",
                      color: "var(--ink)",
                      border: "1px solid var(--hairline-strong)",
                      borderRadius: "var(--radius-sm)",
                      padding: "0.45rem 0.65rem",
                      fontSize: "0.84rem",
                    }}
                  />
                  <button type="submit" className="btn-primary" disabled={asking} style={{ padding: "0.45rem 0.75rem" }}>
                    <Send size={14} />
                  </button>
                </form>

                {liveError && (
                  <p style={{ fontSize: "0.78rem", color: "var(--danger)", marginTop: "0.4rem" }}>
                    {liveError}
                  </p>
                )}
                {liveReply && (
                  <div style={{ marginTop: "0.6rem", fontSize: "0.83rem", color: "var(--ink)", lineHeight: 1.5 }}>
                    <div className="mono" style={{ fontSize: "0.7rem", color: "var(--ink-soft)", marginBottom: "0.2rem" }}>
                      {liveReply.provider} · {liveReply.model}
                    </div>
                    {liveReply.answer}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "0.76rem", color: "var(--ink-soft)", borderTop: "1px solid var(--hairline)", paddingTop: "0.55rem" }}>
                {l === "pt"
                  ? "Modo snapshot estático/offline: chat aberto desativado sem servidor ativo, mas todas as 10 perguntas ancoradas nos dados rodam no navegador."
                  : "Running offline/static snapshot mode: free-form AI chat is hidden because no live backend is attached, while all 10 telemetry-backed Q&As run locally in browser memory."}
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
