import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findMissingWorkflows } from "./missing-workflows.js";

describe("findMissingWorkflows", () => {
  it("returns empty array when all workflows exist", () => {
    const data = {
      manifest: {
        services: [{
          serviceTag: "my-service",
          checks: [{ config: { file: ".github/workflows/test.yml" } }],
        }],
      },
      workflows: [{ name: "test.yml", jobs: {} }],
    };
    assert.deepEqual(findMissingWorkflows(data), []);
  });

  it("returns error for missing workflow file", () => {
    const data = {
      manifest: {
        services: [{
          serviceTag: "my-service",
          checks: [{ config: { file: ".github/workflows/missing.yml" } }],
        }],
      },
      workflows: [{ name: "other.yml", jobs: {} }],
    };
    const errors = findMissingWorkflows(data);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, "missing-workflow");
    assert.equal(errors[0].service, "my-service");
    assert.equal(errors[0].details.file, "missing.yml");
    assert.deepEqual(errors[0].details.available, ["other.yml"]);
  });

  it("returns multiple errors for multiple missing files", () => {
    const data = {
      manifest: {
        services: [{
          serviceTag: "svc",
          checks: [
            { config: { file: ".github/workflows/a.yml" } },
            { config: { file: ".github/workflows/b.yml" } },
          ],
        }],
      },
      workflows: [{ name: "c.yml", jobs: {} }],
    };
    assert.equal(findMissingWorkflows(data).length, 2);
  });
});
