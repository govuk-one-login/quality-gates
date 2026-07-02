import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parsePath, resolveTerraformPath } from "./terraform-path.js";

describe("parsePath", () => {
  it("parses a module parameter path", () => {
    assert.deepEqual(
      parsePath("$.module.example-deploy.parameters.TestImageRepositoryUri"),
      ["module", "example-deploy", "parameters", "TestImageRepositoryUri"]
    );
  });

  it("returns empty array for null/undefined", () => {
    assert.deepEqual(parsePath(null), []);
    assert.deepEqual(parsePath(undefined), []);
  });

  it("returns empty array for paths not starting with $", () => {
    assert.deepEqual(parsePath("module.x.y"), []);
  });

  it("returns empty array for bare $", () => {
    assert.deepEqual(parsePath("$"), []);
  });

  it("handles single segment", () => {
    assert.deepEqual(parsePath("$.module"), ["module"]);
  });
});

describe("resolveTerraformPath", () => {
  const hclJson = {
    module: {
      "example-product-deploy": [{
        source: "git@github.com:org/repo.git//module?ref=v1.0.0",
        parameters: [{
          TestImageRepositoryUri: "123456789.dkr.ecr.eu-west-2.amazonaws.com/repo",
          SAMStackName: "example-product-app",
        }],
      }],
      "example-product-config-deploy": [{
        source: "git@github.com:org/repo.git//module?ref=v1.0.0",
        parameters: [{
          TestImageRepositoryUri: "none",
        }],
      }],
    },
  };

  it("resolves a valid module parameter path", () => {
    const result = resolveTerraformPath(hclJson, "$.module.example-product-deploy.parameters.TestImageRepositoryUri");
    assert.deepEqual(result, {
      found: true,
      value: "123456789.dkr.ecr.eu-west-2.amazonaws.com/repo",
    });
  });

  it("resolves a different parameter in the same module", () => {
    const result = resolveTerraformPath(hclJson, "$.module.example-product-deploy.parameters.SAMStackName");
    assert.deepEqual(result, { found: true, value: "example-product-app" });
  });

  it("resolves a path to a different module", () => {
    const result = resolveTerraformPath(hclJson, "$.module.example-product-config-deploy.parameters.TestImageRepositoryUri");
    assert.deepEqual(result, { found: true, value: "none" });
  });

  it("returns not found for a non-existent module", () => {
    const result = resolveTerraformPath(hclJson, "$.module.non-existent.parameters.X");
    assert.equal(result.found, false);
    assert.equal(result.context.failedAt, "parameters");
  });

  it("returns not found for a non-existent parameter", () => {
    const result = resolveTerraformPath(hclJson, "$.module.example-product-deploy.parameters.NonExistent");
    assert.equal(result.found, false);
    assert.equal(result.context.failedAt, "NonExistent");
  });

  it("returns not found for an empty path", () => {
    const result = resolveTerraformPath(hclJson, "$");
    assert.equal(result.found, false);
    assert.equal(result.context.reason, "empty-path");
  });

  it("returns not found for null input", () => {
    const result = resolveTerraformPath(null, "$.module.x");
    assert.equal(result.found, false);
  });

  it("handles non-array wrapped values", () => {
    const simple = { module: { "my-mod": { key: "value" } } };
    const result = resolveTerraformPath(simple, "$.module.my-mod.key");
    assert.deepEqual(result, { found: true, value: "value" });
  });

  it("resolves to an object when path stops at a block level", () => {
    const result = resolveTerraformPath(hclJson, "$.module.example-product-deploy.parameters");
    assert.equal(result.found, true);
    assert.equal(result.value.TestImageRepositoryUri, "123456789.dkr.ecr.eu-west-2.amazonaws.com/repo");
  });
});
