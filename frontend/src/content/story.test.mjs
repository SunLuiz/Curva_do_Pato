import test from "node:test";
import assert from "node:assert/strict";
import { STORY, localizeSlide, interpolatePoints, smoothCurvePath } from "./story.js";

test("story has exactly 7 public deck slides in EN and PT", () => {
  const pub = STORY.filter((s) => !s.evidence);
  const deck = STORY.filter((s) => s.deck);
  assert.equal(STORY.length, 7);
  assert.equal(pub.length, 7);
  assert.equal(deck.length, 7);

  for (const slide of STORY) {
    assert.ok(slide.en?.title && slide.en?.kicker && slide.en?.highlights?.length >= 3);
    assert.ok(slide.pt?.title && slide.pt?.kicker && slide.pt?.highlights?.length >= 3);
    const localizedPt = localizeSlide(slide, "pt");
    assert.equal(localizedPt.title, slide.pt.title);
  }
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
