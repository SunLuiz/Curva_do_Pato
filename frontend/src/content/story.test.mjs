import test from "node:test";
import assert from "node:assert/strict";
import { STORY, interpolatePoints, smoothCurvePath } from "./story.js";

test("story has 12 public slides and 2 evidence slides", () => {
  const pub = STORY.filter((s) => !s.evidence);
  const ev = STORY.filter((s) => s.evidence);
  assert.equal(pub.length, 12);
  assert.equal(ev.length, 2);
});

test("pitch deck filter selects exactly 7 slides including all evidence slides", () => {
  const deck = STORY.filter((s) => s.deck);
  assert.equal(deck.length, 7);
  assert.equal(STORY.filter((s) => s.evidence && !s.deck).length, 0);
});

test("every slide has exactly 8 finite curvePoints and interpolates cleanly", () => {
  for (const slide of STORY) {
    assert.equal(slide.curvePoints.length, 8, `slide ${slide.id} must have 8 points`);
    for (const [x, y] of slide.curvePoints) {
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
    }
  }
  const mid = interpolatePoints(STORY[0].curvePoints, STORY[1].curvePoints, 0.5);
  assert.equal(mid.length, 8);
  const path = smoothCurvePath(mid);
  assert.ok(path.startsWith("M") && path.includes("C") && !path.includes("NaN"));
});
