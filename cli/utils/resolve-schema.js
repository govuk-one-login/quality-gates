import { resolve, join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

export function isUrl(ref) {
  return ref.startsWith("http://") || ref.startsWith("https://");
}

export function resolveSchema(ref, baseDir) {
  if (isUrl(ref)) {
    const tmp = mkdtempSync(join(tmpdir(), "qg-schema-"));
    const schemaPath = join(tmp, "schema.json");
    execFileSync("curl", ["-fsSL", "-o", schemaPath, ref], { stdio: "pipe" });
    return { schemaPath, cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
  }
  return { schemaPath: resolve(baseDir, ref), cleanup: () => {} };
}
