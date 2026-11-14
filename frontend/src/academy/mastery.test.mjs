import test from "node:test";
import assert from "node:assert/strict";
import { gate, creditFor, masteryScore } from "./mastery.js";

const item = (o = {}) => ({
  credit: 1,
  critical: false,
  solvedUnassisted: true,
  attempts: 1,
  ...o,
});

test("perfect 5-item module passes", () => {
  const result = gate(Array.from({ length: 5 }, () => item()));
  assert.equal(result.passed, true);
  assert.equal(result.score, 1);
  assert.equal(result.earned, 5);
  assert.equal(result.total, 5);
});

test("all second-try fails", () => {
  const result = gate(
    Array.from({ length: 5 }, () =>
      item({ credit: 0.5, solvedUnassisted: false, attempts: 2 })
    )
  );
  assert.equal(result.passed, false);
  assert.equal(result.reasons.thresholdMet, false);
  assert.ok(Math.abs(result.score - 0.5) < 1e-9);
});

test("four items can never pass", () => {
  const result = gate(Array.from({ length: 4 }, () => item()));
  assert.equal(result.passed, false);
  assert.equal(result.reasons.enoughItems, false);
});

test("hinted critical item blocks the gate even if weighted score passes", () => {
  const items = Array.from({ length: 5 }, () => item());
  items[0] = item({ critical: true, solvedUnassisted: false, credit: 0, attempts: 1 });
  // Even with unweighted/weighted score: items[0] weight 1, others weight 1.25+1.5+1.75+2.0 = 6.5 / 7.5 = 0.867 >= 0.8
  const result = gate(items);
  assert.ok(result.score >= 0.8);
  assert.equal(result.reasons.thresholdMet, true);
  assert.equal(result.reasons.criticalOk, false);
  assert.equal(result.passed, false);
});

test("hint gives zero credit", () => {
  assert.equal(creditFor(1, true), 0);
  assert.equal(creditFor(2, true), 0);
  assert.equal(creditFor(1, false), 1);
  assert.equal(creditFor(2, false), 0.5);
  assert.equal(creditFor(3, false), 0);
});

test("masteryScore weights later items twice as heavy as first item", () => {
  assert.equal(masteryScore([]), 0);
  const score = masteryScore([
    item({ credit: 0 }),
    item({ credit: 1 }),
  ]);
  // weights: [1, 2], num = 2, den = 3 -> 2/3
  assert.ok(Math.abs(score - 2 / 3) < 1e-9);
});

test("five items with one second-try passes at ~0.91", () => {
  const items = Array.from({ length: 5 }, () => item());
  items[1] = item({ credit: 0.5, solvedUnassisted: false, attempts: 2 });
  const result = gate(items);
  assert.equal(result.passed, true);
  assert.ok(result.score > 0.85 && result.score < 0.95);
});
