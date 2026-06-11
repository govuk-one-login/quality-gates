import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadManifest } from "./load-manifest.js";

describe("loadManifest", () => {
  it("sets argv.manifest to parsed JSON when file exists", () => {
    const argv = { directory: ".." };
    loadManifest(argv);
    assert.ok(argv.manifest);
    assert.ok(Array.isArray(argv.manifest.services));
  });

  it("sets argv.manifest to null when file does not exist", () => {
    const argv = { directory: "/nonexistent" };
    loadManifest(argv);
    assert.equal(argv.manifest, null);
  });
});
