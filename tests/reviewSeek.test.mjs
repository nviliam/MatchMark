import assert from "node:assert/strict";
import { test } from "node:test";
import { REVIEW_LEAD_IN_SECONDS } from "../src/config/review.ts";
import { getReviewSeekTime } from "../src/utils/review.ts";

test("Review lead-in subtracts context and clamps near-start timestamps without rounding", () => {
  assert.equal(REVIEW_LEAD_IN_SECONDS, 3);
  for (const [timestamp, expected] of [[12, 9], [3, 0], [1.5, 0], [1.8, 0], [0, 0], [40, 37]]) {
    assert.equal(getReviewSeekTime(timestamp, REVIEW_LEAD_IN_SECONDS), expected);
  }
  assert(Math.abs(getReviewSeekTime(3.1, 3) - 0.1) < 1e-12);
  assert(Math.abs(getReviewSeekTime(12.4, 3) - 9.4) < 1e-12);
  assert.equal(getReviewSeekTime(12.125, 3), 9.125);
});

test("lead-in is a parameter, ready for future configuration without changing seek logic", () => {
  for (const leadIn of [0, 1, 3, 5, 10]) {
    assert.equal(getReviewSeekTime(12, leadIn), 12 - leadIn);
  }
  assert.equal(getReviewSeekTime(12, 20), 0);
});

test("invalid timestamps safely target zero and invalid lead-ins never seek forward", () => {
  for (const timestamp of [-5, NaN, Infinity, -Infinity]) assert.equal(getReviewSeekTime(timestamp, 3), 0);
  for (const leadIn of [-3, NaN, Infinity, -Infinity]) assert.equal(getReviewSeekTime(12, leadIn), 12);
});
