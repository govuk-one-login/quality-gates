import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findMismatchedStackOrch } from "./mismatched-stack-orch.js";

const makeData = (checks, stackOrch) => ({
  manifest: {
    services: [{ product: "example-product", component: "backend", checks }],
  },
  stackOrch,
});

const parameters = [
  { ParameterKey: "Environment", ParameterValue: "build" },
  { ParameterKey: "TestImageRepositoryUri", ParameterValue: "123456.dkr.ecr.eu-west-2.amazonaws.com/repo" },
  { ParameterKey: "SAMStackName", ParameterValue: "example-product-deploy" },
];

describe("findMismatchedStackOrch", () => {
  it("returns empty array when parameter key resolves successfully", () => {
    const data = makeData(
      [{ provider: "Stack Orchestration Tool", config: { file: "config/params.json", path: "$[?@.ParameterKey=='TestImageRepositoryUri']" } }],
      { "config/params.json": parameters }
    );
    assert.deepEqual(findMismatchedStackOrch(data), []);
  });

  it("returns error when parameter key does not exist", () => {
    const data = makeData(
      [{ provider: "Stack Orchestration Tool", config: { file: "config/params.json", path: "$[?@.ParameterKey=='NonExistent']" } }],
      { "config/params.json": parameters }
    );
    const errors = findMismatchedStackOrch(data);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, "mismatched-stack-orch-path");
    assert.equal(errors[0].details.failedAt, "NonExistent");
    assert.deepEqual(errors[0].details.available, ["Environment", "TestImageRepositoryUri", "SAMStackName"]);
  });

  it("returns error when file is not found on disk", () => {
    const data = makeData(
      [{ provider: "Stack Orchestration Tool", config: { file: "config/missing.json", path: "$[?@.ParameterKey=='X']" } }],
      {}
    );
    const errors = findMismatchedStackOrch(data);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, "missing-stack-orch-file");
    assert.equal(errors[0].details.file, "config/missing.json");
  });

  it("returns error when file failed to parse", () => {
    const data = makeData(
      [{ provider: "Stack Orchestration Tool", config: { file: "config/bad.json", path: "$[?@.ParameterKey=='X']" } }],
      { "config/bad.json": null }
    );
    const errors = findMismatchedStackOrch(data);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, "stack-orch-parse-error");
  });

  it("skips non-Stack Orchestration Tool providers", () => {
    const data = makeData(
      [{ provider: "GitHub", config: { file: ".github/workflows/ci.yml", path: "$.jobs.build" } }],
      {}
    );
    assert.deepEqual(findMismatchedStackOrch(data), []);
  });

  it("skips non-.json files", () => {
    const data = makeData(
      [{ provider: "Stack Orchestration Tool", config: { file: "config/params.yaml", path: "$[?@.ParameterKey=='X']" } }],
      {}
    );
    assert.deepEqual(findMismatchedStackOrch(data), []);
  });

  it("skips checks with no path", () => {
    const data = makeData(
      [{ provider: "Stack Orchestration Tool", config: { file: "config/params.json" } }],
      { "config/params.json": parameters }
    );
    assert.deepEqual(findMismatchedStackOrch(data), []);
  });

  it("includes service name in results", () => {
    const data = makeData(
      [{ provider: "Stack Orchestration Tool", config: { file: "config/params.json", path: "$[?@.ParameterKey=='Missing']" } }],
      { "config/params.json": parameters }
    );
    const errors = findMismatchedStackOrch(data);
    assert.equal(errors[0].service, "example-product");
  });

  it("returns error for invalid path syntax", () => {
    const data = makeData(
      [{ provider: "Stack Orchestration Tool", config: { file: "config/params.json", path: "$.invalid.path" } }],
      { "config/params.json": parameters }
    );
    const errors = findMismatchedStackOrch(data);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, "mismatched-stack-orch-path");
    assert.equal(errors[0].details.reason, "invalid-syntax");
  });
});
