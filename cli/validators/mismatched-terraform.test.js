import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { findMismatchedTerraform } from "./mismatched-terraform.js";

const makeData = (automated, terraform) => ({
  manifest: {
    services: [{ product: "example-product", component: "infra", automated }],
  },
  terraform,
});

const hclJson = {
  module: {
    "example-product-deploy": [{
      source: "git@github.com:org/repo.git//module?ref=v1.0.0",
      parameters: [{
        TestImageRepositoryUri: "123456789.dkr.ecr.eu-west-2.amazonaws.com/repo",
        SAMStackName: "example-product-app",
      }],
    }],
  },
};

describe("findMismatchedTerraform", () => {
  it("returns empty array when path resolves successfully", () => {
    const data = makeData(
      [{ provider: "Terraform", file: "terraform/main.tf", path: "$.module.example-product-deploy.parameters.TestImageRepositoryUri" }],
      { "terraform/main.tf": hclJson }
    );
    assert.deepEqual(findMismatchedTerraform(data), []);
  });

  it("returns error when module does not exist", () => {
    const data = makeData(
      [{ provider: "Terraform", file: "terraform/main.tf", path: "$.module.non-existent.parameters.X" }],
      { "terraform/main.tf": hclJson }
    );
    const errors = findMismatchedTerraform(data);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, "mismatched-terraform-path");
    assert.equal(errors[0].details.path, "$.module.non-existent.parameters.X");
  });

  it("returns error when parameter does not exist", () => {
    const data = makeData(
      [{ provider: "Terraform", file: "terraform/main.tf", path: "$.module.example-product-deploy.parameters.NonExistent" }],
      { "terraform/main.tf": hclJson }
    );
    const errors = findMismatchedTerraform(data);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, "mismatched-terraform-path");
    assert.equal(errors[0].details.failedAt, "NonExistent");
  });

  it("returns error when terraform file is not found on disk", () => {
    const data = makeData(
      [{ provider: "Terraform", file: "terraform/missing.tf", path: "$.module.x" }],
      {}
    );
    const errors = findMismatchedTerraform(data);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, "missing-terraform-file");
    assert.equal(errors[0].details.file, "terraform/missing.tf");
  });

  it("returns error when terraform file failed to parse", () => {
    const data = makeData(
      [{ provider: "Terraform", file: "terraform/bad.tf", path: "$.module.x" }],
      { "terraform/bad.tf": null }
    );
    const errors = findMismatchedTerraform(data);
    assert.equal(errors.length, 1);
    assert.equal(errors[0].type, "terraform-parse-error");
  });

  it("returns warning per check when hcl2json binary is missing", () => {
    const data = makeData(
      [
        { provider: "Terraform", file: "terraform/main.tf", path: "$.module.x.parameters.Y" },
        { provider: "Terraform", file: "terraform/other.tf", path: "$.module.z" },
      ],
      null
    );
    const results = findMismatchedTerraform(data);
    assert.equal(results.length, 2);
    assert.equal(results[0].type, "terraform-binary-missing");
    assert.equal(results[0].severity, "warning");
    assert.equal(results[1].type, "terraform-binary-missing");
    assert.equal(results[1].severity, "warning");
  });

  it("skips non-Terraform providers", () => {
    const data = makeData(
      [{ provider: "GitHub", file: ".github/workflows/ci.yml", path: "$.jobs.build" }],
      {}
    );
    assert.deepEqual(findMismatchedTerraform(data), []);
  });

  it("skips non-.tf files", () => {
    const data = makeData(
      [{ provider: "Terraform", file: "some-file.json", path: "$.x" }],
      {}
    );
    assert.deepEqual(findMismatchedTerraform(data), []);
  });

  it("skips checks with no path", () => {
    const data = makeData(
      [{ provider: "Terraform", file: "terraform/main.tf" }],
      { "terraform/main.tf": hclJson }
    );
    assert.deepEqual(findMismatchedTerraform(data), []);
  });

  it("includes service name in results", () => {
    const data = makeData(
      [{ provider: "Terraform", file: "terraform/main.tf", path: "$.module.missing" }],
      { "terraform/main.tf": hclJson }
    );
    const errors = findMismatchedTerraform(data);
    assert.equal(errors[0].service, "example-product");
  });
});
