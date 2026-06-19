export function findMismatchedJobs(data) {
  const workflowJobs = new Map(
    data.workflows.map(({ name, jobs }) => [name, Object.keys(jobs)])
  );

  return data.manifest.services.flatMap((s) => {
    const service = s.serviceTag || s["service-tag"];
    const checks = s.checks || s.qualityGates || s["quality-gates"] || [];
    return checks
      .filter((g) => {
        const jobKey = g.config.path?.split(".")[1];
        const filename = g.config.file.replace(".github/workflows/", "");
        if (!jobKey) return false;
        if (!workflowJobs.has(filename)) return false;
        return !workflowJobs.get(filename).includes(jobKey);
      })
      .map((g) => {
        const filename = g.config.file.replace(".github/workflows/", "");
        return {
          type: "mismatched-job",
          service,
          message: `Job not found: ${g.config.path}`,
          details: {
            path: g.config.path,
            workflow: filename,
            available: workflowJobs.get(filename) || [],
          },
        };
      });
  });
}
