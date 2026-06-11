import { readFileSync } from "node:fs";
import { join } from "node:path";

export function loadManifest(argv) {
  try {
    const path = join(argv.directory, "quality-gate.manifest.json");
    argv.manifest = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    argv.manifest = null;
  }
}
