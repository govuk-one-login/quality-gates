import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { loadStackOrch } from "./load-stack-orch.js";

describe("loadStackOrch", () => {
  it("sets argv.stackOrch to {} when no Stack Orchestration Tool checks exist", () => {
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
    loadStackOrch(argv);
    assert.deepEqual(argv.stackOrch, {});
  });

  it("sets argv.stackOrch to {} when manifest is null", () => {
    const argv = { directory: ".", manifest: null };
    loadStackOrch(argv);
    assert.deepEqual(argv.stackOrch, {});
  });

  it("does not include non-.json files", () => {
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
            provider: "Stack Orchestration Tool",
            config: { file: "config/params.yaml", path: "$[?@.ParameterKey=='X']" },
          }],
        }],
      },
    };
    loadStackOrch(argv);
    assert.deepEqual(argv.stackOrch, {});
  });

  it("skips files that do not exist on disk", () => {
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
            provider: "Stack Orchestration Tool",
            config: { file: "missing/parameters.json", path: "$[?@.ParameterKey=='X']" },
          }],
        }],
      },
    };
    loadStackOrch(argv);
    assert.deepEqual(argv.stackOrch, {});
  });

  it("loads and parses a valid JSON file", () => {
    const dir = mkdtempSync(join(tmpdir(), "stack-orch-test-"));
    const relPath = "ci/config/parameters.json";
    const fullDir = join(dir, "ci", "config");
    mkdirSync(fullDir, { recursive: true });

    const parameters = [
      { ParameterKey: "Environment", ParameterValue: "build" },
      { ParameterKey: "TestImageRepositoryUri", ParameterValue: "123456.dkr.ecr.eu-west-2.amazonaws.com/repo" },
    ];
    writeFileSync(join(dir, relPath), JSON.stringify(parameters));

    const argv = {
      directory: dir,
      manifest: {
        services: [{
          product: "example-product",
          component: "backend",
          promotionType: "securePipelines",
          checks: [{
            checkTypes: ["product"],
            phase: "build",
            provider: "Stack Orchestration Tool",
            config: { file: relPath, path: "$[?@.ParameterKey=='TestImageRepositoryUri']" },
          }],
        }],
      },
    };

    loadStackOrch(argv);
    assert.ok(Array.isArray(argv.stackOrch[relPath]));
    assert.equal(argv.stackOrch[relPath].length, 2);
    assert.ok(argv.stackOrch[relPath].some((p) => p.ParameterKey === "TestImageRepositoryUri"));

    rmSync(dir, { recursive: true, force: true });
  });
});
