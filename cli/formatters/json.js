import { suggest } from "../utils/suggest.js";

export function formatJson(errors) {
  const enriched = errors.map((e) => {
    const input = e.type === "missing-workflow"
      ? e.details.file
      : e.details.path?.split(".")[1];
    const match = input ? suggest(input, e.details.available || []) : null;
    return match ? { ...e, suggestion: match } : e;
  });

  const summary = { total: enriched.length, byType: {} };
  for (const e of enriched) {
    summary.byType[e.type] = (summary.byType[e.type] || 0) + 1;
  }
  return JSON.stringify({ summary, errors: enriched }, null, 2);
}
