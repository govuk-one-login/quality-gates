import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cli = resolve(__dirname, "..", "index.js");
const projectRoot = resolve(__dirname, "..", "..");

function run(args) {
  return spawnSync("node", [cli, "validate", ...args], {
    encoding: "utf8",
    cwd: projectRoot,
  });
}

describe("validate command", () => {
  it("validates successfully with local schema from $schema field", () => {
    const result = run(["."]);
    assert.equal(result.status, 0);
  });

  it("validates successfully with explicit --schema override", () => {
    const result = run([".", "--schema", "schemas/schema.json"]);
    assert.equal(result.status, 0);
  });

  it("validates a direct file path", () => {
    const result = run(["quality-gate.manifest.json"]);
    assert.equal(result.status, 0);
  });

  it("errors when manifest file not found", () => {
    const result = run(["/tmp/nonexistent-dir"]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Manifest not found/);
  });

  it("errors when $schema field is missing and no --schema provided", () => {
    const tmp = mkdtempSync(join(tmpdir(), "qg-validate-test-"));
    writeFileSync(join(tmp, "quality-gate.manifest.json"), JSON.stringify({ services: [] }));
    const result = run([tmp]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /No schema specified/);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("reports validation errors for an invalid manifest", () => {
    const tmp = mkdtempSync(join(tmpdir(), "qg-validate-test-"));
    writeFileSync(join(tmp, "quality-gate.manifest.json"), JSON.stringify({
      $schema: resolve(projectRoot, "schemas/schema.json"),
      services: [{ bad: "data" }],
    }));
    const result = run([tmp]);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /validation failure/i);
    rmSync(tmp, { recursive: true, force: true });
  });

  it("validates a remote manifest (ipv-cri-uk-passport-api)", { timeout: 30000 }, () => {
    const tmp = mkdtempSync(join(tmpdir(), "qg-validate-remote-"));
    const url = "https://raw.githubusercontent.com/govuk-one-login/ipv-cri-uk-passport-api/refs/heads/main/quality-gate.manifest.json";
    // Download the manifest
    const curl = spawnSync("curl", ["-fsSL", "-o", join(tmp, "manifest.json"), url]);
    if (curl.status !== 0) {
      rmSync(tmp, { recursive: true, force: true });
      assert.fail("Could not download remote manifest — skipping (network unavailable)");
    }
    const result = run([join(tmp, "manifest.json")]);
    assert.equal(result.status, 0, `Expected valid manifest but got: ${result.stderr}`);
    rmSync(tmp, { recursive: true, force: true });
  });
});
