import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

export function loadWorkflows(argv) {
  try {
    const dir = join(argv.directory, ".github", "workflows");
    argv.workflows = readdirSync(dir)
      .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
      .map((name) => ({
        name,
        jobs: YAML.parse(readFileSync(join(dir, name), "utf8")).jobs ?? {},
      }));
  } catch {
    argv.workflows = [];
  }
}
