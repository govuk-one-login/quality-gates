import { resolve, join } from "node:path";
import { existsSync, mkdirSync, rmSync } from "node:fs";
import { homedir } from "node:os";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

export const CACHE_DIR = join(homedir(), ".cache", "quality-gate-tools");

export function isUrl(ref) {
  return ref.startsWith("http://") || ref.startsWith("https://");
}

export function cachePathForUrl(url) {
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 16);
  return join(CACHE_DIR, hash + ".json");
}

export function resolveSchema(ref, baseDir, { force = false } = {}) {
  if (isUrl(ref)) {
    const cached = cachePathForUrl(ref);
    if (!force && existsSync(cached)) {
      return { schemaPath: cached, cleanup: () => {} };
    }
    mkdirSync(CACHE_DIR, { recursive: true });
    execFileSync("curl", ["-fsSL", "-o", cached, ref], { stdio: "pipe" });
    return { schemaPath: cached, cleanup: () => {} };
  }
  return { schemaPath: resolve(baseDir, ref), cleanup: () => {} };
}

export function clearCache() {
  if (existsSync(CACHE_DIR)) {
    rmSync(CACHE_DIR, { recursive: true, force: true });
  }
}
