export function findMissingWorkflows(data) {
  const workflowNames = new Set(data.workflows.entries.map((e) => e.name));
  const available = [...workflowNames];

  return data.manifest.text.services.flatMap((s) => {
    const service = s.serviceTag || s["service-tag"];
    const gates = s.qualityGates || s["quality-gates"] || [];
    return gates
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
