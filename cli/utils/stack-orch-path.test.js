import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseStackOrchPath, resolveStackOrchPath } from "./stack-orch-path.js";

describe("parseStackOrchPath", () => {
  it("parses a valid filter expression", () => {
    assert.deepEqual(
      parseStackOrchPath("$[?@.ParameterKey=='TestImageRepositoryUri']"),
      { valid: true, parameterKey: "TestImageRepositoryUri" }
    );
  });

  it("parses a filter with spaces in the value", () => {
    assert.deepEqual(
      parseStackOrchPath("$[?@.ParameterKey=='Some Parameter']"),
      { valid: true, parameterKey: "Some Parameter" }
    );
  });

  it("returns invalid for null/undefined", () => {
    assert.deepEqual(parseStackOrchPath(null), { valid: false });
    assert.deepEqual(parseStackOrchPath(undefined), { valid: false });
  });

  it("returns invalid for non-filter paths", () => {
    assert.deepEqual(parseStackOrchPath("$.jobs.build"), { valid: false });
    assert.deepEqual(parseStackOrchPath("$.module.x.y"), { valid: false });
  });

  it("returns invalid for malformed filter", () => {
    assert.deepEqual(parseStackOrchPath("$[?@.ParameterKey==TestImage]"), { valid: false });
    assert.deepEqual(parseStackOrchPath("$[?@.WrongKey=='X']"), { valid: false });
  });
});

describe("resolveStackOrchPath", () => {
  const parameters = [
    { ParameterKey: "Environment", ParameterValue: "build" },
    { ParameterKey: "TestImageRepositoryUri", ParameterValue: "123456.dkr.ecr.eu-west-2.amazonaws.com/repo" },
    { ParameterKey: "SAMStackName", ParameterValue: "example-product-deploy" },
  ];

  it("resolves a matching parameter key", () => {
    const result = resolveStackOrchPath(parameters, "$[?@.ParameterKey=='TestImageRepositoryUri']");
    assert.deepEqual(result, {
      found: true,
      value: "123456.dkr.ecr.eu-west-2.amazonaws.com/repo",
    });
  });

  it("resolves a different parameter key", () => {
    const result = resolveStackOrchPath(parameters, "$[?@.ParameterKey=='Environment']");
    assert.deepEqual(result, { found: true, value: "build" });
  });

  it("returns not found for a non-existent parameter key", () => {
    const result = resolveStackOrchPath(parameters, "$[?@.ParameterKey=='NonExistent']");
    assert.equal(result.found, false);
    assert.equal(result.context.failedAt, "NonExistent");
    assert.deepEqual(result.context.available, ["Environment", "TestImageRepositoryUri", "SAMStackName"]);
  });

  it("returns not found with reason when json is not an array", () => {
    const result = resolveStackOrchPath({ key: "value" }, "$[?@.ParameterKey=='X']");
    assert.equal(result.found, false);
    assert.equal(result.context.reason, "not-array");
  });

  it("returns not found with reason for invalid path syntax", () => {
    const result = resolveStackOrchPath(parameters, "$.invalid.path");
    assert.equal(result.found, false);
    assert.equal(result.context.reason, "invalid-syntax");
  });

  it("returns not found for null json", () => {
    const result = resolveStackOrchPath(null, "$[?@.ParameterKey=='X']");
    assert.equal(result.found, false);
    assert.equal(result.context.reason, "not-array");
  });

  it("handles empty array", () => {
    const result = resolveStackOrchPath([], "$[?@.ParameterKey=='X']");
    assert.equal(result.found, false);
    assert.deepEqual(result.context.available, []);
  });
});
