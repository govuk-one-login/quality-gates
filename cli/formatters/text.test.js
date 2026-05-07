import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatText } from "./text.js";

describe("formatText", () => {
  it("returns success message when no errors", () => {
    assert.match(formatText([]), /No validation errors found/);
  });

  it("formats missing-workflow errors", () => {
    const output = formatText([{
      type: "missing-workflow",
      service: "my-svc",
      message: "Workflow file not found: .github/workflows/ci.yml",
      details: { file: "ci.yml", available: ["pr.yml", "deploy.yml"] },
    }]);
    assert.match(output, /Missing workflow file: ci\.yml/);
    assert.match(output, /Service: my-svc/);
    assert.match(output, /Available workflows: pr\.yml, deploy\.yml/);
  });

  it("formats mismatched-job errors", () => {
    const output = formatText([{
      type: "mismatched-job",
      service: "my-svc",
      message: "Job not found: jobs.deploy",
      details: { path: "jobs.deploy", workflow: "ci.yml", available: ["build", "test"] },
    }]);
    assert.match(output, /Invalid job path: jobs\.deploy/);
    assert.match(output, /Workflow: ci\.yml/);
    assert.match(output, /Available jobs: build, test/);
  });

  it("shows error count in header", () => {
    const errors = [
      { type: "missing-workflow", service: "a", message: "", details: { file: "x.yml", available: [] } },
      { type: "mismatched-job", service: "b", message: "", details: { path: "jobs.x", workflow: "y.yml", available: [] } },
    ];
    assert.match(formatText(errors), /Found 2 validation errors/);
  });
});
