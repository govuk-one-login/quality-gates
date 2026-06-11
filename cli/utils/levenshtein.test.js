import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { levenshtein } from "./levenshtein.js";

describe("levenshtein", () => {
  it("returns 0 for identical strings", () => {
    assert.equal(levenshtein("abc", "abc"), 0);
  });

  it("returns length of other string when one is empty", () => {
    assert.equal(levenshtein("", "abc"), 3);
    assert.equal(levenshtein("abc", ""), 3);
  });

  it("counts single substitution", () => {
    assert.equal(levenshtein("cat", "car"), 1);
  });

  it("counts transposition as 2 edits", () => {
    assert.equal(levenshtein("ab", "ba"), 2);
  });

  it("counts insertion/deletion", () => {
    assert.equal(levenshtein("pre-commit", "run-pre-commit"), 4);
  });

  it("handles underscore vs hyphen difference", () => {
    assert.equal(levenshtein("automated_tests", "automated-tests"), 1);
  });
});
