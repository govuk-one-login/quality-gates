import { suggest } from "../utils/suggest.js";

export function formatText(errors) {
  if (!errors.length) return "✅ No validation errors found.";

  const lines = [`Found ${errors.length} validation error${errors.length > 1 ? "s" : ""}:\n`];

  for (const error of errors) {
    if (error.type === "missing-workflow") {
      lines.push(`❌ Missing workflow file: ${error.details.file}`);
      lines.push(`   Service: ${error.service}`);
      const match = suggest(error.details.file, error.details.available);
      if (match) lines.push(`   Did you mean: ${match}?`);
      lines.push(`   Available workflows: ${error.details.available.join(", ")}`);
    } else if (error.type === "mismatched-job") {
      lines.push(`❌ Job not found: ${error.details.path}`);
      lines.push(`   Service: ${error.service}`);
      lines.push(`   Workflow: ${error.details.workflow}`);
      const jobKey = error.details.path.match(/\.jobs[.['"]]*([^.'"\]]+)/)?.[1];
      const match = jobKey ? suggest(jobKey, error.details.available) : null;
      if (match) lines.push(`   Did you mean: $.jobs.${match}?`);
      lines.push(`   Available jobs: ${error.details.available.join(", ")}`);
    } else if (error.type === "mismatched-step") {
      lines.push(`❌ Step not found: ${error.details.path}`);
      lines.push(`   Service: ${error.service}`);
      lines.push(`   Workflow: ${error.details.workflow}`);
      lines.push(`   Job: ${error.details.job}`);
      const stepValue = error.details.step.value;
      const candidates = error.details.available.map((a) => a.split(":").slice(1).join(":"));
      const match = suggest(stepValue, candidates);
      if (match) lines.push(`   Did you mean: ${match}?`);
      lines.push(`   Available steps: ${error.details.available.join(", ")}`);
    } else if (error.type === "invalid-path-syntax") {
      lines.push(`❌ Invalid path syntax: ${error.details.path}`);
      lines.push(`   Service: ${error.service}`);
      lines.push(`   Expected format: $.jobs.<name> or $.jobs.<name>.steps[?@.name=='<step>']`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
