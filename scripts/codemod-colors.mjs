// Idempotent codemod: replaces legacy dark-theme hex colors with CSS custom properties
// across frontend/src/**/*.{jsx,js}. Run: node scripts/codemod-colors.mjs

import fs from "node:fs";
import path from "node:path";

const HEX_MAP = new Map([
  ["#0a0e17", "var(--surface-0)"],
  ["#111827", "var(--surface-1)"],
  ["#131c2e", "var(--surface-1)"],
  ["#182338", "var(--surface-2)"],
  ["#1e293b", "var(--hairline)"],
  ["#2c3e58", "var(--hairline-strong)"],
  ["#f1f5f9", "var(--ink)"],
  ["#cbd5e1", "var(--ink)"],
  ["#94a3b8", "var(--ink-soft)"],
  ["#64748b", "var(--ink-faint)"],
  ["#38bdf8", "var(--biome-se)"],
  ["#0284c7", "var(--biome-se)"],
  ["#0ea5e9", "var(--biome-se)"],
  ["#f59e0b", "var(--biome-ne)"],
  ["#fbbf24", "var(--biome-ne)"],
  ["#22d3ee", "var(--biome-n)"],
  ["#34d399", "var(--sig)"],
  ["#10b981", "var(--sig)"],
  ["#f43f5e", "var(--danger)"],
  ["#fda4af", "var(--danger)"],
  ["#fb7185", "var(--danger)"],
  ["#f472b6", "var(--danger)"],
  ["#a855f7", "var(--roadmap)"],
  ["#c084fc", "var(--roadmap)"],
]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(jsx|js)$/.test(entry.name)) out.push(full);
  }
  return out;
}

const files = walk("frontend/src");
let touched = 0;

for (const file of files) {
  const before = fs.readFileSync(file, "utf8");
  let after = before.replace(/#[0-9a-fA-F]{6}\b/g, (match) => {
    const mapped = HEX_MAP.get(match.toLowerCase());
    return mapped ?? match;
  });

  // Fix legacy alpha suffix concatenation like `${region.accent}55`
  after = after.replace(/`\$\{([^}]+)\.accent\}55`/g, "$1.accent");

  if (after !== before) {
    fs.writeFileSync(file, after, "utf8");
    touched += 1;
    console.log(`Updated ${file}`);
  }
}

console.log(`Codemod complete (${touched} file(s) modified).`);
