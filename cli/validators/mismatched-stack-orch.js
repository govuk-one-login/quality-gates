import { resolveStackOrchPath } from "../utils/stack-orch-path.js";

export function findMismatchedStackOrch(data) {
  return data.manifest.services.flatMap((s) => {
    const service = s.product;
    return (s.checks ?? []).flatMap((check) => {
      if (check.provider !== "Stack Orchestration Tool") return [];
      if (!check.config?.file?.endsWith(".json")) return [];

      const file = check.config.file;
      const parsed = data.stackOrch[file];

      if (parsed === undefined) {
        return [{
          type: "missing-stack-orch-file",
          service,
          message: `Stack Orchestration file not found: ${file}`,
          details: { file },
        }];
      }

      if (parsed === null) {
        return [{
          type: "stack-orch-parse-error",
          service,
          message: `Failed to parse Stack Orchestration file: ${file}`,
          details: { file },
        }];
      }

      if (!check.config.path) return [];

      const resolved = resolveStackOrchPath(parsed, check.config.path);
      if (!resolved.found) {
        return [{
          type: "mismatched-stack-orch-path",
          service,
          message: `Parameter not found: ${check.config.path}`,
          details: { file, path: check.config.path, ...resolved.context },
        }];
      }

      return [];
    });
  });
}
