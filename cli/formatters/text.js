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
      const jobKey = error.details.path.split(".")[1];
      lines.push(`❌ Invalid job path: ${error.details.path}`);
      lines.push(`   Service: ${error.service}`);
      lines.push(`   Workflow: ${error.details.workflow}`);
      const match = suggest(jobKey, error.details.available);
      if (match) lines.push(`   Did you mean: jobs.${match}?`);
      lines.push(`   Available jobs: ${error.details.available.join(", ")}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
