import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findMismatchedJobs } from "./mismatched-jobs.js";

const makeData = (checks, jobs) => ({
  manifest: {
    services: [{ product: "my-service", component: "api", checks }],
  },
  workflows: [{ name: "ci.yml", jobs }],
});

describe("findMismatchedJobs", () => {
  it("returns empty array when all jobs exist", () => {
    const data = makeData(
      [{ provider: "GitHub", config: { file: ".github/workflows/ci.yml", path: "$.jobs.build" } }],
      { build: { steps: [] } }
    );
    assert.deepEqual(findMismatchedJobs(data), []);
  });

  it("returns error for invalid job path", () => {
    const data = makeData(
      [{ provider: "GitHub", config: { file: ".github/workflows/ci.yml", path: "$.jobs.deploy" } }],
      { build: { steps: [] }, test: { steps: [] } }
    );
    const errors = findMismatchedJobs(data);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, "mismatched-job");
    assert.equal(errors[0].details.path, "$.jobs.deploy");
    assert.deepEqual(errors[0].details.available, ["build", "test"]);
  });

  it("returns multiple errors for multiple invalid paths", () => {
    const data = makeData(
      [
        { provider: "GitHub", config: { file: ".github/workflows/ci.yml", path: "$.jobs.foo" } },
        { provider: "GitHub", config: { file: ".github/workflows/ci.yml", path: "$.jobs.bar" } },
      ],
      { build: { steps: [] } }
    );
    assert.equal(findMismatchedJobs(data).length, 2);
  });

  it("skips checks whose workflow file does not exist", () => {
    const data = makeData(
      [{ provider: "GitHub", config: { file: ".github/workflows/missing.yml", path: "$.jobs.x" } }],
      { build: { steps: [] } }
    );
    assert.deepEqual(findMismatchedJobs(data), []);
  });

  it("skips checks with no path property", () => {
    const data = makeData(
      [{ provider: "GitHub", config: { file: ".github/workflows/ci.yml" } }],
      { build: { steps: [] } }
    );
    assert.deepEqual(findMismatchedJobs(data), []);
  });

  it("skips non-GitHub provider checks", () => {
    const data = makeData(
      [{ provider: "Terraform", config: { file: "terraform/main.tf", path: "$.module.x" } }],
      { build: { steps: [] } }
    );
    assert.deepEqual(findMismatchedJobs(data), []);
  });

  it("returns error for invalid JSONPath syntax", () => {
    const data = makeData(
      [{ provider: "GitHub", config: { file: ".github/workflows/ci.yml", path: "$.invalid[syntax" } }],
      { build: { steps: [] } }
    );
    const errors = findMismatchedJobs(data);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, "invalid-path-syntax");
  });

  it("validates step by name - found", () => {
    const data = makeData(
      [{ provider: "GitHub", config: { file: ".github/workflows/ci.yml", path: "$.jobs.build.steps[?@.name=='Run tests']" } }],
      { build: { steps: [{ name: "Checkout" }, { name: "Run tests" }] } }
    );
    assert.deepEqual(findMismatchedJobs(data), []);
  });

  it("validates step by name - not found", () => {
    const data = makeData(
      [{ provider: "GitHub", config: { file: ".github/workflows/ci.yml", path: "$.jobs.build.steps[?@.name=='Run tests']" } }],
      { build: { steps: [{ name: "Checkout" }, { name: "Lint" }] } }
    );
    const errors = findMismatchedJobs(data);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, "mismatched-step");
    assert.equal(errors[0].details.job, "build");
    assert.ok(errors[0].details.available.includes("name:Checkout"));
    assert.ok(errors[0].details.available.includes("name:Lint"));
  });

  it("validates step by id - found", () => {
    const data = makeData(
      [{ provider: "GitHub", config: { file: ".github/workflows/ci.yml", path: "$.jobs.build.steps[?@.id=='run-tests']" } }],
      { build: { steps: [{ id: "checkout" }, { id: "run-tests", name: "Run tests" }] } }
    );
    assert.deepEqual(findMismatchedJobs(data), []);
  });

  it("validates step by id - not found", () => {
    const data = makeData(
      [{ provider: "GitHub", config: { file: ".github/workflows/ci.yml", path: "$.jobs.build.steps[?@.id=='missing']" } }],
      { build: { steps: [{ id: "checkout" }, { id: "run-tests" }] } }
    );
    const errors = findMismatchedJobs(data);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, "mismatched-step");
    assert.ok(errors[0].details.available.includes("id:checkout"));
    assert.ok(errors[0].details.available.includes("id:run-tests"));
  });
});
