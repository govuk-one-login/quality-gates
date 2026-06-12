import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { isUrl, resolveSchema, clearCache, cachePathForUrl, CACHE_DIR } from "./resolve-schema.js";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

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
    const { schemaPath } = resolveSchema("./schemas/schema.json", "/project");
    assert.equal(schemaPath, "/project/schemas/schema.json");
  });
  it("resolves absolute path as-is", () => {
    const { schemaPath } = resolveSchema("/tmp/schema.json", "/project");
    assert.equal(schemaPath, "/tmp/schema.json");
  });
});

describe("cachePathForUrl", () => {
  it("different URLs produce different cache paths", () => {
    const path1 = cachePathForUrl("https://example.com/refs/tags/v0.1.0/schema.json");
    const path2 = cachePathForUrl("https://example.com/refs/heads/feat/flatten-structure/schema.json");
    assert.notEqual(path1, path2);
  });
  it("same URL always produces the same cache path", () => {
    const url = "https://example.com/schema.json";
    assert.equal(cachePathForUrl(url), cachePathForUrl(url));
  });
  it("cache path is inside CACHE_DIR", () => {
    const p = cachePathForUrl("https://example.com/schema.json");
    assert.ok(p.startsWith(CACHE_DIR));
  });
});

describe("resolveSchema caching", () => {
  beforeEach(() => clearCache());

  it("returns cached path when file exists", () => {
    const url = "https://example.com/test.json";
    const expected = cachePathForUrl(url);
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(expected, "{}");
    const { schemaPath } = resolveSchema(url, "/project");
    assert.equal(schemaPath, expected);
  });
});

describe("clearCache", () => {
  it("removes the cache directory", () => {
    mkdirSync(CACHE_DIR, { recursive: true });
    writeFileSync(join(CACHE_DIR, "test.json"), "{}");
    clearCache();
    assert.equal(existsSync(CACHE_DIR), false);
  });
  it("does not throw when cache dir does not exist", () => {
    clearCache();
    assert.doesNotThrow(() => clearCache());
  });
});
