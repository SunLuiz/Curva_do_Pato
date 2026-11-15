// Generates docs/pitch_deck.html directly from frontend/src/content/story.js
// Run: node scripts/build_deck.mjs

import fs from "node:fs";
import path from "node:path";
import { STORY, smoothCurvePath } from "../frontend/src/content/story.js";

const DECK_SLIDES = STORY.filter((s) => s.deck);

function esc(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function slideBodyHtml(slide) {
  const cols =
    slide.highlights.length >= 4
      ? "grid-2"
      : slide.highlights.length === 3
        ? "grid-3"
        : "grid-2";

  const cards = slide.highlights
    .map(
      (h) => `
      <div class="card">
        <div class="mono label">${esc(h.label)}</div>
        <div class="value">${esc(h.value)}</div>
      </div>`
    )
    .join("");

  return `<div class="${cols}">${cards}</div>`;
}

function slideFooter(idx, total, slide) {
  let left = "Team Curva do Pato (Luiz Antonio Gois Junior) · NASA Space Apps Challenge 2026 — Campinas, SP";
  if (slide.id === "future_space" || slide.id === "legacy") {
    left = "Built at Espaço Plasma, Unicamp — Campinas, SP, Brazil · MIT License · No NASA logo used";
  } else if (slide.id === "trends_human" || slide.id === "evidence-campinas") {
    left = "Deterministic stats: pymannkendall (period=12) + scipy.stats.theilslopes (95% CI)";
  } else if (slide.id === "attribution" || slide.id === "evidence-verdicts") {
    left = "Scientific honesty: every vector declares live, frozen snapshot, or parametric model status";
  }
  return `
    <div class="footer">
      <span>${esc(left)}</span>
      <span class="mono">Slide ${idx + 1} / ${total}</span>
    </div>`;
}

const slidesHtml = DECK_SLIDES.map((slide, idx) => {
  const d = smoothCurvePath(slide.curvePoints);
  const toneVar = `var(${slide.tone})`;
  const titleTag = idx === 0 ? "h1" : "h2";
  const extraLinks =
    slide.id === "future_space" || slide.id === "legacy"
      ? `<div class="links-bar mono">
          <span>Live Demo: <a href="https://frontend-rho-seven-69.vercel.app">frontend-rho-seven-69.vercel.app</a></span>
          <span>Source: <a href="https://github.com/SunLuiz/Curva_do_Pato">github.com/SunLuiz/Curva_do_Pato</a></span>
          <span>Sources: NASA POWER · FIRMS · DONKI · CMR MCP · DSN · OSDR · CelesTrak</span>
        </div>`
      : "";

  return `
  <!-- SLIDE ${idx + 1}: ${esc(slide.id)} -->
  <section class="slide" style="background-color: ${esc(slide.bgTint)};">
    <svg class="curve-bg" viewBox="0 0 1200 600" preserveAspectRatio="none" aria-hidden="true">
      <path d="${d}" fill="none" stroke="${toneVar}" stroke-width="4" stroke-opacity="0.22" />
      <path d="${d}" fill="none" stroke="${toneVar}" stroke-width="1.5" stroke-opacity="0.45" stroke-dasharray="6 6" />
    </svg>
    <div class="slide-head">
      <span class="tag" style="color: ${toneVar}; border-color: ${toneVar};">${esc(slide.kicker)}</span>
      <${titleTag}>${esc(slide.title)}</${titleTag}>
      <p class="lead">${esc(slide.body)}</p>
    </div>
    <div class="slide-body">
      ${slideBodyHtml(slide)}
      ${extraLinks}
    </div>
    ${slideFooter(idx, DECK_SLIDES.length, slide)}
  </section>`;
}).join("\n");

const html = `<!doctype html>
<!-- GENERATED from frontend/src/content/story.js — do not edit manually; run: node scripts/build_deck.mjs -->
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Cockpit-OMNI — ${DECK_SLIDES.length}-Slide Pitch Deck (NASA Space Apps 2026)</title>
  <style>
    :root {
      --surface-0: #FAF7F2;
      --surface-1: #FFFFFF;
      --surface-2: #F3EEE5;
      --hairline: #E4DCCF;
      --hairline-strong: #CFC4B2;
      --ink: #1C1B19;
      --ink-soft: #6B6760;
      --ink-faint: #6C6759;
      --biome-se: #2A7047;
      --biome-ne: #8F5D15;
      --biome-n: #1F6F8B;
      --null-ink: #736446;
      --danger: #B23A2A;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: #E9E2D4;
      color: var(--ink);
      font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 24px;
      padding: 24px;
    }
    .controls {
      position: fixed;
      bottom: 16px;
      right: 16px;
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid var(--hairline-strong);
      padding: 8px 16px;
      border-radius: 999px;
      font-size: 12px;
      color: var(--ink-soft);
      z-index: 50;
      box-shadow: 0 6px 20px rgba(28, 27, 25, 0.08);
    }
    .slide {
      width: 1120px;
      height: 630px;
      background: var(--surface-0);
      border: 1px solid var(--hairline-strong);
      border-radius: 26px;
      padding: 44px 54px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
      page-break-after: always;
    }
    .curve-bg {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 0;
    }
    .slide-head, .slide-body, .footer {
      position: relative;
      z-index: 1;
    }
    .tag {
      display: inline-block;
      font-family: ui-monospace, monospace;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      padding: 4px 14px;
      border-radius: 999px;
      border: 1px solid var(--hairline-strong);
      background: var(--surface-1);
      margin-bottom: 14px;
    }
    h1 {
      font-family: Georgia, serif;
      font-size: 48px;
      line-height: 1.08;
      letter-spacing: -0.03em;
      color: var(--ink);
      max-width: 20ch;
    }
    h2 {
      font-family: Georgia, serif;
      font-size: 36px;
      line-height: 1.12;
      letter-spacing: -0.02em;
      color: var(--ink);
      margin-bottom: 10px;
    }
    p.lead {
      font-size: 18px;
      color: var(--ink-soft);
      max-width: 66ch;
      margin-top: 10px;
      line-height: 1.48;
    }
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; }
    .card {
      background: rgba(255, 255, 255, 0.92);
      border: 1px solid var(--hairline-strong);
      border-radius: 18px;
      padding: 18px 20px;
    }
    .mono { font-family: ui-monospace, SFMono-Regular, monospace; }
    .label {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ink-soft);
      margin-bottom: 6px;
    }
    .value {
      font-size: 15px;
      font-weight: 600;
      color: var(--ink);
      line-height: 1.45;
    }
    .links-bar {
      margin-top: 14px;
      padding: 10px 16px;
      border-radius: 14px;
      background: var(--surface-1);
      border: 1px solid var(--hairline);
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--ink-soft);
    }
    .links-bar a { color: var(--biome-n); text-decoration: none; font-weight: 600; }
    .footer {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: var(--ink-faint);
      border-top: 1px solid var(--hairline);
      padding-top: 12px;
    }
    @media print {
      @page { size: 1120px 630px; margin: 0; }
      body { padding: 0; gap: 0; background: var(--surface-0); }
      .controls { display: none; }
      .slide { border: none; border-radius: 0; }
    }
  </style>
</head>
<body>
  <div class="controls">${DECK_SLIDES.length} Slides · Press Ctrl+P → Save as PDF (16:9)</div>
${slidesHtml}
</body>
</html>
`;

const outPath = path.resolve("docs/pitch_deck.html");
fs.writeFileSync(outPath, html, "utf8");
console.log(`Generated ${outPath} with ${DECK_SLIDES.length} slides.`);
