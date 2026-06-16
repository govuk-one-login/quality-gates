import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findMismatchedJobs } from "./mismatched-jobs.js";

const makeData = (checks, jobs) => ({
  manifest: {
    services: [{ serviceTag: "my-service", checks: checks }],
  },
  workflows: [{ name: "ci.yml", jobs }],
});

describe("findMismatchedJobs", () => {
  it("returns empty array when all jobs exist", () => {
    const data = makeData(
      [{ config: { file: ".github/workflows/ci.yml", path: "jobs.build" } }],
      { build: {} }
    );
    assert.deepEqual(findMismatchedJobs(data), []);
  });

  it("returns error for invalid job path", () => {
    const data = makeData(
      [{ config: { file: ".github/workflows/ci.yml", path: "jobs.deploy" } }],
      { build: {}, test: {} }
    );
    const errors = findMismatchedJobs(data);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, "mismatched-job");
    assert.equal(errors[0].details.path, "jobs.deploy");
    assert.equal(errors[0].details.workflow, "ci.yml");
    assert.deepEqual(errors[0].details.available, ["build", "test"]);
  });

  it("returns multiple errors for multiple invalid paths", () => {
    const data = makeData(
      [
        { config: { file: ".github/workflows/ci.yml", path: "jobs.foo" } },
        { config: { file: ".github/workflows/ci.yml", path: "jobs.bar" } },
      ],
      { build: {} }
    );
    assert.equal(findMismatchedJobs(data).length, 2);
  });

  it("skips checks whose workflow file does not exist", () => {
    const data = makeData(
      [{ config: { file: ".github/workflows/missing.yml", path: "jobs.x" } }],
      { build: {} }
    );
    assert.deepEqual(findMismatchedJobs(data), []);
  });

  it("skips checks with no path property", () => {
    const data = makeData(
      [{ config: { file: ".github/workflows/ci.yml" } }],
      { build: {} }
    );
    assert.deepEqual(findMismatchedJobs(data), []);
  });
});
