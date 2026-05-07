export function formatJson(errors) {
  const summary = {
    total: errors.length,
    byType: {},
  };
  for (const e of errors) {
    summary.byType[e.type] = (summary.byType[e.type] || 0) + 1;
  }
  return JSON.stringify({ summary, errors }, null, 2);
}
