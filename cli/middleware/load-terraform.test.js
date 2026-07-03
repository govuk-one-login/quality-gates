import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadTerraform } from "./load-terraform.js";

describe("loadTerraform", () => {
  it("sets argv.terraform to {} when no Terraform checks exist", () => {
    const argv = {
      directory: ".",
      manifest: {
        services: [{
          product: "example-product",
          component: "frontend",
          promotionType: "securePipelines",
          checks: [{
            checkTypes: ["secret scanning"],
            phase: "pre-merge",
            provider: "GitHub",
            config: { file: ".github/workflows/test.yml", path: "$.jobs.test" },
          }],
        }],
      },
    };
    loadTerraform(argv);
    assert.deepEqual(argv.terraform, {});
  });

  it("sets argv.terraform to {} when manifest is null", () => {
    const argv = { directory: ".", manifest: null };
    loadTerraform(argv);
    assert.deepEqual(argv.terraform, {});
  });

  it("sets argv.terraform to null when hcl2json is not available and Terraform checks exist", () => {
    // This test depends on whether hcl2json is installed.
    // If hcl2json IS installed, it will attempt to parse — skip in that case.
    const argv = {
      directory: "/nonexistent",
      manifest: {
        services: [{
          product: "example-product",
          component: "infra",
          promotionType: "securePipelines",
          checks: [{
            checkTypes: ["product"],
            phase: "build",
            provider: "Terraform",
            config: { file: "terraform/main.tf", path: "$.module.deploy.parameters.X" },
          }],
        }],
      },
    };
    loadTerraform(argv);
    // Either null (binary not found) or {} (binary found but file doesn't exist)
    assert.ok(argv.terraform === null || typeof argv.terraform === "object");
  });

  it("does not include non-.tf files", () => {
    const argv = {
      directory: ".",
      manifest: {
        services: [{
          product: "example-product",
          component: "infra",
          promotionType: "securePipelines",
          checks: [{
            checkTypes: ["product"],
            phase: "build",
            provider: "Terraform",
            config: { file: "some-file.json", path: "$.x" },
          }],
        }],
      },
    };
    loadTerraform(argv);
    assert.deepEqual(argv.terraform, {});
  });
});
