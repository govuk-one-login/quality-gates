import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isUrl, resolveSchema } from "./resolve-schema.js";

describe("isUrl", () => {
  it("returns true for https URLs", () => {
    assert.equal(isUrl("https://example.com/schema.json"), true);
  });

  it("returns true for http URLs", () => {
    assert.equal(isUrl("http://example.com/schema.json"), true);
  });

  it("returns false for relative paths", () => {
    assert.equal(isUrl("./schemas/schema.json"), false);
  });

  it("returns false for absolute paths", () => {
    assert.equal(isUrl("/tmp/schema.json"), false);
  });
});

describe("resolveSchema local paths", () => {
  it("resolves relative path against base directory", () => {
    const { schemaPath, cleanup } = resolveSchema("./schemas/schema.json", "/project");
    assert.equal(schemaPath, "/project/schemas/schema.json");
    cleanup();
  });

  it("resolves absolute path as-is", () => {
    const { schemaPath, cleanup } = resolveSchema("/tmp/schema.json", "/project");
    assert.equal(schemaPath, "/tmp/schema.json");
    cleanup();
  });

  it("cleanup is a no-op for local paths", () => {
    const { cleanup } = resolveSchema("./schema.json", "/project");
    assert.doesNotThrow(() => cleanup());
  });
});
