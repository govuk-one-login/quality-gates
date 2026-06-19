import { suggest } from "../utils/suggest.js";

export function formatJson(errors) {
  const enriched = errors.map((e) => {
    let input, candidates;
    if (e.type === "missing-workflow") {
      input = e.details.file;
      candidates = e.details.available || [];
    } else if (e.type === "mismatched-job") {
      input = e.details.path?.match(/\.jobs[.['"]]*([^.'"\]]+)/)?.[1];
      candidates = e.details.available || [];
    } else if (e.type === "mismatched-step") {
      input = e.details.step?.value;
      candidates = (e.details.available || []).map((a) => a.split(":").slice(1).join(":"));
    } else {
      return e;
    }
    const match = input ? suggest(input, candidates) : null;
    return match ? { ...e, suggestion: match } : e;
  });

  const summary = { total: enriched.length, byType: {} };
  for (const e of enriched) {
    summary.byType[e.type] = (summary.byType[e.type] || 0) + 1;
  }
  return JSON.stringify({ summary, errors: enriched }, null, 2);
}
