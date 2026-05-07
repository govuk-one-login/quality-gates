import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findMissingWorkflows } from "./missing-workflows.js";

describe("findMissingWorkflows", () => {
  it("returns empty array when all workflows exist", () => {
    const data = {
      manifest: {
        text: {
          services: [{
            serviceTag: "my-service",
            qualityGates: [{ config: { file: ".github/workflows/test.yml" } }],
          }],
        },
      },
      workflows: { entries: [{ name: "test.yml", object: { text: {} } }] },
    };
    assert.deepEqual(findMissingWorkflows(data), []);
  });

  it("returns error for missing workflow file", () => {
    const data = {
      manifest: {
        text: {
          services: [{
            serviceTag: "my-service",
            qualityGates: [{ config: { file: ".github/workflows/missing.yml" } }],
          }],
        },
      },
      workflows: { entries: [{ name: "other.yml", object: { text: {} } }] },
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
        text: {
          services: [{
            serviceTag: "svc",
            qualityGates: [
              { config: { file: ".github/workflows/a.yml" } },
              { config: { file: ".github/workflows/b.yml" } },
            ],
          }],
        },
      },
      workflows: { entries: [{ name: "c.yml", object: { text: {} } }] },
    };
    assert.equal(findMissingWorkflows(data).length, 2);
  });
});
