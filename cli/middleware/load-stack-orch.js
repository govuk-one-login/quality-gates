import { readFileSync } from "node:fs";
import { join } from "node:path";
import { existsSync } from "node:fs";

export function loadStackOrch(argv) {
  const files = new Set();
  for (const service of argv.manifest?.services ?? []) {
    for (const check of service.checks ?? []) {
      if (check.provider === "Stack Orchestration Tool" && check.config?.file?.endsWith(".json")) {
        files.add(check.config.file);
      }
    }
  }

  argv.stackOrch = {};
  for (const file of files) {
    const fullPath = join(argv.directory, file);
    if (!existsSync(fullPath)) continue;
    try {
      argv.stackOrch[file] = JSON.parse(readFileSync(fullPath, "utf8"));
    } catch {
      argv.stackOrch[file] = null;
    }
  }
}
