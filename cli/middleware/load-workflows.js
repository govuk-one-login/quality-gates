import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import YAML from "yaml";

export function loadWorkflows(argv) {
  try {
    const dir = join(argv.directory, ".github", "workflows");
    argv.workflows = readdirSync(dir)
      .filter((f) => f.endsWith(".yml") || f.endsWith(".yaml"))
      .map((name) => {
        const parsed = YAML.parse(readFileSync(join(dir, name), "utf8"));
        const jobs = {};
        for (const [key, job] of Object.entries(parsed.jobs ?? {})) {
          jobs[key] = {
            steps: (job.steps ?? []).map(({ id, name }) => {
              const step = {};
              if (id) step.id = id;
              if (name) step.name = name;
              return step;
            }),
          };
        }
        return { name, jobs };
      });
  } catch {
    argv.workflows = [];
  }
}
