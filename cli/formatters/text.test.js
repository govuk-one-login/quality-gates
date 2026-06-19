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
      message: "Job not found: $.jobs.deploy",
      details: { path: "$.jobs.deploy", workflow: "ci.yml", available: ["build", "test"] },
    }]);
    assert.match(output, /Job not found: \$\.jobs\.deploy/);
    assert.match(output, /Workflow: ci\.yml/);
    assert.match(output, /Available jobs: build, test/);
  });

  it("formats mismatched-step errors", () => {
    const output = formatText([{
      type: "mismatched-step",
      service: "my-svc",
      message: "Step not found",
      details: { path: "$.jobs.build.steps[?@.name=='Run tests']", job: "build", step: { by: "name", value: "Run tests" }, workflow: "ci.yml", available: ["name:Checkout", "name:Lint"] },
    }]);
    assert.match(output, /Step not found/);
    assert.match(output, /Job: build/);
    assert.match(output, /Available steps: name:Checkout, name:Lint/);
  });

  it("formats invalid-path-syntax errors", () => {
    const output = formatText([{
      type: "invalid-path-syntax",
      service: "my-svc",
      message: "Invalid JSONPath syntax",
      details: { path: "$.invalid[syntax" },
    }]);
    assert.match(output, /Invalid path syntax: \$\.invalid\[syntax/);
    assert.match(output, /Expected format/);
  });

  it("shows error count in header", () => {
    const errors = [
      { type: "missing-workflow", service: "a", message: "", details: { file: "x.yml", available: [] } },
      { type: "mismatched-job", service: "b", message: "", details: { path: "$.jobs.x", workflow: "y.yml", available: [] } },
    ];
    assert.match(formatText(errors), /Found 2 validation errors/);
  });

  it("shows 'Did you mean' for close workflow match", () => {
    const output = formatText([{
      type: "missing-workflow",
      service: "svc",
      message: "",
      details: { file: "check-pr.yml", available: ["pr-check.yml", "deploy.yml"] },
    }]);
    assert.match(output, /Did you mean: pr-check\.yml\?/);
  });

  it("does not show 'Did you mean' when no close match", () => {
    const output = formatText([{
      type: "missing-workflow",
      service: "svc",
      message: "",
      details: { file: "totally-different.yml", available: ["foo.yml", "bar.yml"] },
    }]);
    assert.doesNotMatch(output, /Did you mean/);
  });

  it("shows 'Did you mean' for close job match", () => {
    const output = formatText([{
      type: "mismatched-job",
      service: "svc",
      message: "",
      details: { path: "$.jobs.run-pre-commit", workflow: "ci.yml", available: ["pre-commit", "unit-tests"] },
    }]);
    assert.match(output, /Did you mean: \$\.jobs\.pre-commit\?/);
  });
});
