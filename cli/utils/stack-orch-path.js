/**
 * Parses and resolves JSONPath filter expressions against
 * Stack Orchestration Tool parameter arrays.
 *
 * Expected format: $[?@.ParameterKey=='<value>']
 * Target structure: [{ "ParameterKey": "...", "ParameterValue": "..." }, ...]
 */

const FILTER_PATTERN = /^\$\[\?@\.ParameterKey=='(.+)'\]$/;

export function parseStackOrchPath(path) {
  if (!path) return { valid: false };
  const match = path.match(FILTER_PATTERN);
  if (!match) return { valid: false };
  return { valid: true, parameterKey: match[1] };
}

export function resolveStackOrchPath(json, path) {
  const parsed = parseStackOrchPath(path);
  if (!parsed.valid) {
    return { found: false, context: { reason: "invalid-syntax" } };
  }

  if (!Array.isArray(json)) {
    return { found: false, context: { reason: "not-array" } };
  }

  const entry = json.find((p) => p.ParameterKey === parsed.parameterKey);
  if (!entry) {
    const available = json.map((p) => p.ParameterKey);
    return { found: false, context: { failedAt: parsed.parameterKey, available } };
  }

  return { found: true, value: entry.ParameterValue };
}
