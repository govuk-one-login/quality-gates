import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseCheckPath, isValidJsonPath } from "./jsonpath.js";

describe("parseCheckPath", () => {
  it("parses dot-notation job path", () => {
    assert.deepEqual(parseCheckPath("$.jobs.build"), { valid: true, job: "build", step: null });
  });

  it("parses bracket-notation job path", () => {
    assert.deepEqual(parseCheckPath("$.jobs['run-tests']"), { valid: true, job: "run-tests", step: null });
  });

  it("parses dot-notation job with step filter by name", () => {
    assert.deepEqual(parseCheckPath("$.jobs.build.steps[?@.name=='Run tests']"), {
      valid: true, job: "build", step: { by: "name", value: "Run tests" },
    });
  });

  it("parses dot-notation job with step filter by id", () => {
    assert.deepEqual(parseCheckPath("$.jobs.build.steps[?@.id=='run-tests']"), {
      valid: true, job: "build", step: { by: "id", value: "run-tests" },
    });
  });

  it("parses bracket-notation job with step filter", () => {
    assert.deepEqual(parseCheckPath("$.jobs['my-job'].steps[?@.name=='Run tests']"), {
      valid: true, job: "my-job", step: { by: "name", value: "Run tests" },
    });
  });

  it("handles special characters in step names", () => {
    assert.deepEqual(parseCheckPath("$.jobs.pre-commit.steps[?@.name=='✅ Run Pre-commit Hooks']"), {
      valid: true, job: "pre-commit", step: { by: "name", value: "✅ Run Pre-commit Hooks" },
    });
  });

  it("returns invalid for paths without $ prefix", () => {
    assert.deepEqual(parseCheckPath("jobs.build"), { valid: false });
  });

  it("returns invalid for null/undefined", () => {
    assert.deepEqual(parseCheckPath(null), { valid: false });
    assert.deepEqual(parseCheckPath(undefined), { valid: false });
  });

  it("returns invalid for non-GitHub style paths", () => {
    assert.deepEqual(parseCheckPath("$.module.x.parameters.Y"), { valid: false });
    assert.deepEqual(parseCheckPath("$[?@.ParameterKey=='X']"), { valid: false });
  });
});

describe("isValidJsonPath", () => {
  it("returns true for paths starting with $", () => {
    assert.equal(isValidJsonPath("$.jobs.build"), true);
    assert.equal(isValidJsonPath("$.module.x.y"), true);
    assert.equal(isValidJsonPath("$[?@.Key=='X']"), true);
  });

  it("returns false for non-JSONPath strings", () => {
    assert.equal(isValidJsonPath("jobs.build"), false);
    assert.equal(isValidJsonPath(""), false);
  });

  it("returns false for non-strings", () => {
    assert.equal(isValidJsonPath(null), false);
    assert.equal(isValidJsonPath(undefined), false);
  });
});
