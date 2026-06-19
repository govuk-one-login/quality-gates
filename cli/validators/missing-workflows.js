export function findMissingWorkflows(data) {
  const workflowNames = new Set(data.workflows.map((w) => w.name));
  const available = [...workflowNames];

  return data.manifest.services.flatMap((s) => {
    const service = s.serviceTag || s["service-tag"];
    const checks = s.checks || s.qualityGates || s["quality-gates"] || [];
    return checks
      .filter((g) => g.config.file.startsWith(".github/workflows/"))
      .filter((g) => !workflowNames.has(g.config.file.replace(".github/workflows/", "")))
      .map((g) => ({
        type: "missing-workflow",
        service,
        message: `Workflow file not found: ${g.config.file}`,
        details: {
          file: g.config.file.replace(".github/workflows/", ""),
          available,
        },
      }));
  });
}
