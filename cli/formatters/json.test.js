import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatJson } from "./json.js";

describe("formatJson", () => {
  it("returns valid JSON with summary and errors", () => {
    const errors = [
      { type: "missing-workflow", service: "svc", message: "m", details: { file: "x.yml", available: [] } },
      { type: "mismatched-job", service: "svc", message: "m", details: { path: "$.jobs.x", workflow: "ci.yml", available: [] } },
      { type: "mismatched-job", service: "svc", message: "m", details: { path: "$.jobs.y", workflow: "ci.yml", available: [] } },
    ];
    const result = JSON.parse(formatJson(errors));
    assert.equal(result.summary.total, 3);
    assert.equal(result.summary.byType["missing-workflow"], 1);
    assert.equal(result.summary.byType["mismatched-job"], 2);
    assert.equal(result.errors.length, 3);
  });

  it("returns zero totals for empty errors", () => {
    const result = JSON.parse(formatJson([]));
    assert.equal(result.summary.total, 0);
    assert.deepEqual(result.errors, []);
  });

  it("includes suggestion field when close match exists", () => {
    const errors = [{
      type: "missing-workflow",
      service: "svc",
      message: "",
      details: { file: "check-pr.yml", available: ["pr-check.yml", "deploy.yml"] },
    }];
    const result = JSON.parse(formatJson(errors));
    assert.equal(result.errors[0].suggestion, "pr-check.yml");
  });

  it("omits suggestion field when no close match", () => {
    const errors = [{
      type: "missing-workflow",
      service: "svc",
      message: "",
      details: { file: "totally-different.yml", available: ["foo.yml", "bar.yml"] },
    }];
    const result = JSON.parse(formatJson(errors));
    assert.equal(result.errors[0].suggestion, undefined);
  });

  it("counts new error types in summary", () => {
    const errors = [
      { type: "mismatched-step", service: "svc", message: "m", details: { path: "$.jobs.build.steps[?@.name=='X']", job: "build", step: { by: "name", value: "X" }, workflow: "ci.yml", available: ["name:Y"] } },
      { type: "invalid-path-syntax", service: "svc", message: "m", details: { path: "bad" } },
    ];
    const result = JSON.parse(formatJson(errors));
    assert.equal(result.summary.total, 2);
    assert.equal(result.summary.byType["mismatched-step"], 1);
    assert.equal(result.summary.byType["invalid-path-syntax"], 1);
  });
});
