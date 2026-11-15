import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTE_META, SITE_ORIGIN, getRouteMeta } from "./routeMeta.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FRONTEND_DIR = path.resolve(__dirname, "../..");
const PUBLIC_DIR = path.join(FRONTEND_DIR, "public");

test("ROUTE_META exposes unique canonical URLs and bilingual titles for /, /cockpit, and /game", () => {
  const routes = ["/", "/cockpit", "/game"];
  const canonicals = new Set();
  const titles = new Set();
  for (const r of routes) {
    assert.ok(ROUTE_META[r], `Missing route metadata for ${r}`);
    const en = getRouteMeta(r, "en");
    const pt = getRouteMeta(r, "pt");
    assert.ok(en.title.length > 20 && en.description.length > 60);
    assert.ok(pt.title.length > 20 && pt.description.length > 60);
    assert.ok(en.canonical.startsWith(SITE_ORIGIN));
    canonicals.add(en.canonical);
    titles.add(en.title);
  }
  assert.equal(canonicals.size, 3);
  assert.equal(titles.size, 3);
});

test("GEO and SEO public artifacts exist with non-empty verified content", () => {
  const requiredFiles = [
    "robots.txt",
    "sitemap.xml",
    "llms.txt",
    "llms-full.txt",
    "og-cover.png",
    "apple-touch-icon.png",
    "favicon-48.png",
    "site.webmanifest",
    "404.html",
    "science/index.html",
    "science/brazilian-biomes-solar-brightening-1984-2025/index.html",
    "science/northeast-brazil-solar-irradiance-clouds-vs-aerosols/index.html",
    "science/duck-curve-to-mars-wind-ramp-limits/index.html",
  ];
  for (const rel of requiredFiles) {
    const full = path.join(PUBLIC_DIR, rel);
    assert.ok(fs.existsSync(full), `Missing public asset: ${rel}`);
    assert.ok(fs.statSync(full).size > 100, `Empty public asset: ${rel}`);
  }

  const robots = fs.readFileSync(path.join(PUBLIC_DIR, "robots.txt"), "utf8");
  assert.match(robots, /OAI-SearchBot/);
  assert.match(robots, /PerplexityBot/);
  assert.match(robots, /ClaudeBot/);
  assert.match(robots, /Sitemap:\s+https:\/\/www\.curveofduck\.xyz\/sitemap\.xml/);

  const llmsFull = fs.readFileSync(path.join(PUBLIC_DIR, "llms-full.txt"), "utf8");
  assert.match(llmsFull, /\+0\.4091/);
  assert.match(llmsFull, /-0\.9647/);
  assert.match(llmsFull, /-0\.8552/);
  assert.match(llmsFull, /0\.4890/);
});
