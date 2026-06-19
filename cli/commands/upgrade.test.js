import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { handler } from "./upgrade.js";

const TMP = join(tmpdir(), "upgrade-test-" + process.pid);

function createManifest(dir, content) {
  mkdirSync(dir, { recursive: true });
  const file = join(dir, "quality-gate.manifest.json");
  writeFileSync(file, JSON.stringify(content, null, 2));
  return file;
}

beforeEach(() => mkdirSync(TMP, { recursive: true }));
afterEach(() => rmSync(TMP, { recursive: true, force: true }));

describe("upgrade command", () => {
  it("upgrades a v0.1.0 manifest in place", () => {
    const file = createManifest(TMP, {
      $schema: "https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.1.0/schemas/schema.json",
      services: [{
        "service-tag": "svc",
        "quality-gates": [{ "check-types": ["unit"], phase: "pre-merge", provider: "GitHub", config: { file: "a.yml" } }],
      }],
    });

    handler({ path: file, dryRun: false, verbose: false });

    const result = JSON.parse(readFileSync(file, "utf8"));
    assert.equal(result.services[0].serviceTag, "svc");
    assert.equal(result.services[0].promotionType, "securePipelines");
    assert.deepEqual(result.services[0].checks[0].checkTypes, ["unit"]);
    assert.match(result.$schema, /v0\.10\.0/);
  });

  it("does not write files in dry-run mode", () => {
    const file = createManifest(TMP, {
      $schema: "https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.2.0/schemas/schema.json",
      services: [{ "service-tag": "x", "quality-gates": [] }],
    });
    const before = readFileSync(file, "utf8");

    handler({ path: file, dryRun: true, verbose: false });

    assert.equal(readFileSync(file, "utf8"), before);
  });

  it("skips manifests with local $schema", () => {
    const file = createManifest(TMP, {
      $schema: "./schemas/schema.json",
      services: [{ serviceTag: "x", promotionType: "library", checks: [] }],
    });
    const before = readFileSync(file, "utf8");

    handler({ path: file, dryRun: false, verbose: false });

    assert.equal(readFileSync(file, "utf8"), before);
  });

  it("skips manifests already at latest version", () => {
    const file = createManifest(TMP, {
      $schema: "https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.10.0/schemas/schema.json",
      services: [{ serviceTag: "x", promotionType: "securePipelines", checks: [] }],
    });
    const before = readFileSync(file, "utf8");

    handler({ path: file, dryRun: false, verbose: false });

    assert.equal(readFileSync(file, "utf8"), before);
  });

  it("finds manifests recursively in a directory", () => {
    createManifest(join(TMP, "a"), {
      $schema: "https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.4.0/schemas/schema.json",
      services: [{ "quality-gates": [{ "check-types": ["unit"], phase: "pre-merge", provider: "GitHub", config: { file: "a.yml" } }] }],
    });
    createManifest(join(TMP, "b"), {
      $schema: "https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.2.0/schemas/schema.json",
      services: [{ "service-tag": "b", "quality-gates": [] }],
    });

    handler({ path: TMP, dryRun: false, verbose: false });

    const a = JSON.parse(readFileSync(join(TMP, "a", "quality-gate.manifest.json"), "utf8"));
    const b = JSON.parse(readFileSync(join(TMP, "b", "quality-gate.manifest.json"), "utf8"));
    assert.match(a.$schema, /v0\.10\.0/);
    assert.match(b.$schema, /v0\.10\.0/);
    assert.equal(b.services[0].serviceTag, "b");
  });

  it("reports error for non-existent path", () => {
    const prev = process.exitCode;
    handler({ path: "/tmp/nonexistent-path-xyz", dryRun: false, verbose: false });
    assert.equal(process.exitCode, 2);
    process.exitCode = prev;
  });
});
