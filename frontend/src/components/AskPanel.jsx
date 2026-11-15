import React, { useEffect, useRef, useState } from "react";
import { Compass, Loader2, MessageSquare, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { formatPersonalNote } from "../content/faq";
import { UI_TEXT } from "../content/i18n";
import { answerEcosystemQuestion } from "../engine/askEngine";

export default function AskPanel({
  profile,
  cockpitContext = {},
  onNavigateAction,
  lang = "en",
}) {
  const l = lang === "pt" ? "pt" : "en";
  const ui = UI_TEXT[l];
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [asking, setAsking] = useState(false);
  const [messages, setMessages] = useState([]);
  const logRef = useRef(null);

  const personalNote = formatPersonalNote(profile);
  const activeRegionLabel = cockpitContext?.region || "campinas";
  const activeVarLabel = cockpitContext?.variable || "T2M";

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages, asking, open]);

  async function submitQuestion() {
    const q = question.trim();
    if (!q || asking) return;
    setQuestion("");
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, role: "user", text: q }]);
    setAsking(true);
    try {
      const result = await answerEcosystemQuestion(q, {
        context: cockpitContext,
        lang: l,
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: result.answer,
          sourceBadge: result.sourceBadge,
          action: result.action,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          text:
            l === "pt"
              ? "Nao foi possivel concluir a consulta nos dados abertos agora. Tente novamente."
              : "Could not complete this open telemetry query right now. Please try again.",
          sourceBadge: l === "pt" ? "Aviso Local" : "Local Notice",
          action: null,
        },
      ]);
    } finally {
      setAsking(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    submitQuestion();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submitQuestion();
    }
  }

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
          aria-label={l === "pt" ? "Assistente Aberto em Linguagem Natural" : "Open Natural-Language NASA Ecosystem Assistant"}
        >
          <div className="ask-header">
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Sparkles size={16} />
              <strong>{ui.askTitle}</strong>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
              {messages.length > 0 && (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "0.28rem 0.55rem", fontSize: "0.75rem" }}
                  onClick={() => setMessages([])}
                  aria-label={l === "pt" ? "Limpar conversa" : "Clear conversation"}
                  title={l === "pt" ? "Limpar conversa" : "Clear conversation"}
                >
                  <RotateCcw size={13} />
                </button>
              )}
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "0.28rem 0.55rem" }}
                onClick={() => setOpen(false)}
                aria-label={l === "pt" ? "Fechar painel" : "Close assistant drawer"}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          <div className="ask-meta-bar">
            <span className="badge" style={{ fontSize: "0.7rem" }}>
              {ui.askFallbackBadge}
            </span>
            <span className="mono" style={{ fontSize: "0.72rem", color: "var(--ink-soft)" }}>
              {activeRegionLabel} · {activeVarLabel}
            </span>
          </div>

          {personalNote && (
            <div className="ask-profile-note">{personalNote}</div>
          )}

          <div ref={logRef} className="ask-log" role="log" aria-live="polite">
            {messages.length === 0 ? (
              <div className="ask-welcome">
                <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: "0.35rem" }}>
                  {l === "pt"
                    ? "Consulta aberta por linguagem natural (sem chaves ou backend)"
                    : "Open Natural-Language Query (Zero Keys · No Backend Required)"}
                </div>
                <p style={{ margin: 0, lineHeight: 1.5, color: "var(--ink-soft)" }}>
                  {l === "pt"
                    ? "Pergunte livremente sobre tendencias climaticas (1984-2025, recortes de anos/meses ou qualquer coordenada lat, lon), atribuicao nuvens vs queimadas, focos FIRMS por raio em km, alertas solares DONKI, colecoes Earthdata CMR, analogo espacial MPTO/DSN/OSDR/CelesTrak e glossario cientifico."
                    : "Ask freely about climate trends (1984-2025, custom year/month slices, or any lat, lon coordinate), cloud vs fire attribution, FIRMS 24h fire radius in km, DONKI space weather, open Earthdata CMR catalog queries, Space Analog MPTO/DSN/OSDR/CelesTrak, and methodology terms."}
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={msg.role === "user" ? "ask-msg ask-msg-user" : "ask-msg ask-msg-assistant"}
                >
                  {msg.role === "assistant" && msg.sourceBadge && (
                    <div className="ask-msg-source">{msg.sourceBadge}</div>
                  )}
                  <div style={{ whiteSpace: "pre-line", lineHeight: 1.5 }}>{msg.text}</div>
                  {msg.action && (
                    <div style={{ marginTop: "0.55rem" }}>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: "0.32rem 0.65rem", fontSize: "0.78rem" }}
                        onClick={() => onNavigateAction?.(msg.action)}
                      >
                        <Compass size={13} />{" "}
                        {l === "pt" ? "Ver no Cockpit" : "Inspect in Cockpit"}
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}

            {asking && (
              <div className="ask-msg ask-msg-assistant" style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
                <Loader2 size={14} className="spin" />
                <span>{ui.askThinking}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="ask-composer">
            <textarea
              className="ask-textarea"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={ui.askPlaceholder}
              aria-label={l === "pt" ? "Pergunta em linguagem natural" : "Natural-language question"}
            />
            <div className="ask-composer-footer">
              <span className="mono" style={{ fontSize: "0.7rem", color: "var(--ink-soft)" }}>
                {l === "pt"
                  ? "Enter envia · Shift+Enter quebra linha"
                  : "Enter to send · Shift+Enter for newline"}
              </span>
              <button
                type="submit"
                className="btn-primary"
                style={{ padding: "0.48rem 0.85rem", fontSize: "0.84rem" }}
                disabled={asking || !question.trim()}
              >
                <Send size={14} /> {ui.askSend}
              </button>
            </div>
          </form>
        </aside>
      )}
    </>
  );
}
