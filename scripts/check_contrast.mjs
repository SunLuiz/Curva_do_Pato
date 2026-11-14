// Contrast audit script (WCAG 2.1 AA: >= 4.5:1 for normal text).
// Usage:
//   node scripts/check_contrast.mjs '{"--ink":"#1C1B19",...}'
//   node scripts/check_contrast.mjs --css frontend/src/styles.css

import fs from "node:fs";

const lum = (hex) => {
  const clean = hex.trim();
  const full =
    clean.length === 4
      ? `#${clean[1]}${clean[1]}${clean[2]}${clean[2]}${clean[3]}${clean[3]}`
      : clean;
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(full.slice(i, i + 2), 16) / 255);
  const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
};

const ratio = (a, b) => {
  const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

const NON_INK_KEYS = new Set([
  "--surface-0",
  "--surface-1",
  "--surface-2",
  "--hairline",
  "--hairline-strong",
  "--null",
]);

function parseTokensFromCss(cssPath) {
  const css = fs.readFileSync(cssPath, "utf8");
  const rootMatch = css.match(/:root\s*\{([\s\S]*?)\}/);
  if (!rootMatch) throw new Error(`No :root block found in ${cssPath}`);
  const tokens = {};
  for (const m of rootMatch[1].matchAll(/(--[a-z0-9-]+)\s*:\s*(#[0-9a-fA-F]{3,6})\s*;/g)) {
    tokens[m[1]] = m[2];
  }
  return tokens;
}

let tokens;
const arg = process.argv[2];
if (arg === "--css") {
  tokens = parseTokensFromCss(process.argv[3] || "frontend/src/styles.css");
} else if (arg) {
  tokens = JSON.parse(arg);
} else {
  tokens = parseTokensFromCss("frontend/src/styles.css");
}

const surfaces = [
  tokens["--surface-0"] || "#FAF7F2",
  tokens["--surface-1"] || "#FFFFFF",
  tokens["--surface-2"] || "#F3EEE5",
];

const inks = Object.keys(tokens).filter((k) => !NON_INK_KEYS.has(k));
let bad = 0;

for (const ink of inks) {
  for (const s of surfaces) {
    const r = ratio(tokens[ink], s);
    const ok = r >= 4.5;
    if (!ok) bad += 1;
    console.log(`${ok ? "PASS" : "FAIL"} ${ink} ${tokens[ink]} on ${s} = ${r.toFixed(2)}:1`);
  }
}

if (bad) {
  console.error(`\n${bad} contrast pair(s) failed WCAG AA (4.5:1).`);
  process.exit(1);
}
console.log(`\nAll ${inks.length * surfaces.length} contrast pairs passed >= 4.5:1.`);
