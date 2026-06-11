import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { suggest } from "./suggest.js";

describe("suggest", () => {
  it("returns closest match when within threshold", () => {
    assert.equal(
      suggest("automated_tests.yaml", ["automated-tests.yaml", "checkov.yaml"]),
      "automated-tests.yaml"
    );
  });

  it("returns null when no candidate is close enough", () => {
    assert.equal(
      suggest("totally-different", ["foo.yml", "bar.yml"]),
      null
    );
  });

  it("returns closest match for job names", () => {
    assert.equal(
      suggest("run-pre-commit", ["pre-commit", "unit-tests"]),
      "pre-commit"
    );
  });

  it("returns null for empty candidates", () => {
    assert.equal(suggest("abc", []), null);
  });
});
