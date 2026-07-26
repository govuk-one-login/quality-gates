export function findMissingWorkflows(data) {
  const workflowNames = new Set(data.workflows.map((w) => w.name));
  const available = [...workflowNames];

  return data.manifest.services.flatMap((s) => {
    const service = s.product || s.serviceTag || s["service-tag"];
    const checks = [...(s.automated || []), ...(s.outOfBand || [])];
    return checks
      .filter((g) => g.file.startsWith(".github/workflows/"))
      .filter((g) => !workflowNames.has(g.file.replace(".github/workflows/", "")))
      .map((g) => ({
        type: "missing-workflow",
        service,
        message: `Workflow file not found: ${g.file}`,
        details: {
          file: g.file.replace(".github/workflows/", ""),
          available,
        },
      }));
  });
}
