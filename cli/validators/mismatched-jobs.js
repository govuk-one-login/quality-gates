import { parseCheckPath } from "../utils/jsonpath.js";

export function findMismatchedJobs(data) {
  const workflowJobs = new Map(
    data.workflows.map(({ name, jobs }) => [name, jobs])
  );

  return data.manifest.services.flatMap((s) => {
    const service = s.product || s.serviceTag || s["service-tag"];
    const checks = [...(s.automated || []), ...(s.outOfBand || [])];
    return checks.flatMap((g) => {
      if (g.provider !== "GitHub") return [];
      if (!g.path) return [];

      const filename = g.file.replace(".github/workflows/", "");
      if (!workflowJobs.has(filename)) return [];

      const parsed = parseCheckPath(g.path);
      if (!parsed.valid) {
        return [{ type: "invalid-path-syntax", service, message: `Invalid JSONPath syntax: ${g.path}`, details: { path: g.path } }];
      }

      const jobs = workflowJobs.get(filename);
      const jobKeys = Object.keys(jobs);
      if (!jobKeys.includes(parsed.job)) {
        return [{ type: "mismatched-job", service, message: `Job not found: ${g.path}`, details: { path: g.path, workflow: filename, available: jobKeys } }];
      }

      if (parsed.step) {
        const steps = jobs[parsed.job].steps || [];
        const match = steps.some((st) => st[parsed.step.by] === parsed.step.value);
        if (!match) {
          const available = steps.flatMap((st) => {
            const items = [];
            if (st.id) items.push(`id:${st.id}`);
            if (st.name) items.push(`name:${st.name}`);
            if (st.run) items.push(`run:${st.run}`);
            return items;
          });
          return [{ type: "mismatched-step", service, message: `Step not found: ${g.path}`, details: { path: g.path, job: parsed.job, step: parsed.step, workflow: filename, available } }];
        }
      }

      return [];
    });
  });
}
