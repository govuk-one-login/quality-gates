import { parseCheckPath } from "../utils/jsonpath.js";

export function findMismatchedJobs(data) {
  const workflowJobs = new Map(
    data.workflows.map(({ name, jobs }) => [name, jobs])
  );

  return data.manifest.services.flatMap((s) => {
    const service = s.product || s.serviceTag || s["service-tag"];
    const checks = s.checks || s.qualityGates || s["quality-gates"] || [];
    return checks.flatMap((g) => {
      if (g.provider !== "GitHub") return [];
      if (!g.config.path) return [];

      const filename = g.config.file.replace(".github/workflows/", "");
      if (!workflowJobs.has(filename)) return [];

      const parsed = parseCheckPath(g.config.path);
      if (!parsed.valid) {
        return [{ type: "invalid-path-syntax", service, message: `Invalid JSONPath syntax: ${g.config.path}`, details: { path: g.config.path } }];
      }

      const jobs = workflowJobs.get(filename);
      const jobKeys = Object.keys(jobs);
      if (!jobKeys.includes(parsed.job)) {
        return [{ type: "mismatched-job", service, message: `Job not found: ${g.config.path}`, details: { path: g.config.path, workflow: filename, available: jobKeys } }];
      }

      if (parsed.step) {
        const steps = jobs[parsed.job].steps || [];
        const match = steps.some((st) => st[parsed.step.by] === parsed.step.value);
        if (!match) {
          const available = steps.flatMap((st) => {
            const items = [];
            if (st.id) items.push(`id:${st.id}`);
            if (st.name) items.push(`name:${st.name}`);
            return items;
          });
          return [{ type: "mismatched-step", service, message: `Step not found: ${g.config.path}`, details: { path: g.config.path, job: parsed.job, step: parsed.step, workflow: filename, available } }];
        }
      }

      return [];
    });
  });
}
