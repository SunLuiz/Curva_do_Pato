/**
 * Cross-checks every numeric/verdict claim in Academy questions.js and AskPanel faq.js
 * against the frozen NASA POWER / FIRMS / CMR / manifest cache files.
 *
 * Usage: node scripts/verify_answers.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const CACHE_DIR = path.join(ROOT, "frontend", "public", "cache");

const { MODULES } = await import(
  pathToFileURL(path.join(ROOT, "frontend", "src", "academy", "questions.js")).href
);
const { FAQ_ITEMS } = await import(
  pathToFileURL(path.join(ROOT, "frontend", "src", "content", "faq.js")).href
);

function readJson(filename) {
  return JSON.parse(fs.readFileSync(path.join(CACHE_DIR, filename), "utf8"));
}

function approxEqual(actual, expected, tol = 1e-4) {
  if (typeof actual !== "number" || typeof expected !== "number") return actual === expected;
  return Math.abs(actual - expected) <= Math.max(tol, Math.abs(expected) * 1e-3);
}

const failures = [];
let checkedCount = 0;

function verifyTrendCheck(ownerId, cacheCheck) {
  const filename = `trend_${cacheCheck.region}_${cacheCheck.variable}.json`;
  const data = readJson(filename);
  const stats = data.stats;

  for (const [key, expected] of Object.entries(cacheCheck.asserts || {})) {
    checkedCount += 1;
    const actual = stats[key];
    if (Array.isArray(expected)) {
      if (
        !Array.isArray(actual) ||
        actual.length !== expected.length ||
        expected.some((v, i) => !approxEqual(actual[i], v))
      ) {
        failures.push(`${ownerId} [${filename} -> stats.${key}]: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
      }
    } else if (typeof expected === "number") {
      if (!approxEqual(actual, expected)) {
        failures.push(`${ownerId} [${filename} -> stats.${key}]: expected ${expected}, got ${actual}`);
      }
    } else if (actual !== expected) {
      failures.push(`${ownerId} [${filename} -> stats.${key}]: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
    }
  }
}

function verifyCustomCheck(ownerId, cacheCheck) {
  const data = readJson(cacheCheck.customFile);
  for (const [key, expected] of Object.entries(cacheCheck)) {
    if (key === "customFile") continue;
    checkedCount += 1;
    if (data[key] !== expected) {
      failures.push(`${ownerId} [${cacheCheck.customFile} -> ${key}]: expected ${JSON.stringify(expected)}, got ${JSON.stringify(data[key])}`);
    }
  }
  if (cacheCheck.customFile === "cmr_evidence.json") {
    checkedCount += 1;
    const nisar = JSON.stringify(data.queries?.geothermal_nisar || {});
    if (!nisar.includes("NISAR_L2_GUNW_PROVISIONAL_V1")) {
      failures.push(`${ownerId}: NISAR_L2_GUNW_PROVISIONAL_V1 missing from cmr_evidence.json`);
    }
  }
}

for (const mod of MODULES) {
  if (mod.questions.length < 5) {
    failures.push(`Module ${mod.id} has ${mod.questions.length} questions (< 5 minimum for mastery gate).`);
  }
  for (const q of mod.questions) {
    if (!q.cacheCheck) {
      failures.push(`${mod.id}/${q.id} is missing cacheCheck.`);
      continue;
    }
    if (q.cacheCheck.customFile) verifyCustomCheck(`${mod.id}/${q.id}`, q.cacheCheck);
    else verifyTrendCheck(`${mod.id}/${q.id}`, q.cacheCheck);
  }
}

for (const item of FAQ_ITEMS) {
  if (!item.cacheCheck) {
    failures.push(`FAQ ${item.id} is missing cacheCheck.`);
    continue;
  }
  if (item.cacheCheck.customFile) verifyCustomCheck(`FAQ:${item.id}`, item.cacheCheck);
  else verifyTrendCheck(`FAQ:${item.id}`, item.cacheCheck);
}

console.log(`Checked ${checkedCount} ground-truth assertions across ${MODULES.length} modules and ${FAQ_ITEMS.length} FAQs.`);
if (failures.length > 0) {
  console.error("VERIFICATION FAILED:");
  for (const f of failures) console.error("  -", f);
  process.exit(1);
}
console.log("0 divergences against frozen cache.");
