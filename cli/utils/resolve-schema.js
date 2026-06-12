import { resolve, dirname, join } from "node:path";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const binPath = resolve(__dirname, "..", "node_modules", ".bin", "jsonschema");

export function isUrl(ref) {
  return ref.startsWith("http://") || ref.startsWith("https://");
}

export function resolveSchema(ref, baseDir) {
  if (isUrl(ref)) {
    const tmp = mkdtempSync(join(tmpdir(), "qg-schema-"));
    const schemaPath = join(tmp, "schema.json");
    execFileSync(binPath, ["install", ref, schemaPath], { stdio: "pipe" });
    return { schemaPath, cleanup: () => rmSync(tmp, { recursive: true, force: true }) };
  }
  return { schemaPath: resolve(baseDir, ref), cleanup: () => {} };
}
