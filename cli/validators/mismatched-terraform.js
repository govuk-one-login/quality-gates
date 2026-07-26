import { resolveTerraformPath } from "../utils/terraform-path.js";

export function findMismatchedTerraform(data) {
  return data.manifest.services.flatMap((s) => {
    const service = s.product;
    return [...(s.automated ?? []), ...(s.outOfBand ?? [])].flatMap((check) => {
      if (check.provider !== "Terraform") return [];
      if (!check.file?.endsWith(".tf")) return [];

      // Binary not found — emit a warning per Terraform check
      if (data.terraform === null) {
        return [{
          type: "terraform-binary-missing",
          service,
          message: `Cannot verify Terraform reference: hcl2json not installed (${check.file} → ${check.path || "no path"})`,
          details: { file: check.file, path: check.path },
          severity: "warning",
        }];
      }

      const file = check.file;
      const parsed = data.terraform[file];

      if (parsed === undefined) {
        return [{
          type: "missing-terraform-file",
          service,
          message: `Terraform file not found: ${file}`,
          details: { file },
        }];
      }

      if (parsed === null) {
        return [{
          type: "terraform-parse-error",
          service,
          message: `Failed to parse Terraform file: ${file}`,
          details: { file },
        }];
      }

      if (!check.path) return [];

      const resolved = resolveTerraformPath(parsed, check.path);
      if (!resolved.found) {
        return [{
          type: "mismatched-terraform-path",
          service,
          message: `Path not found: ${check.path}`,
          details: { file, path: check.path, ...resolved.context },
        }];
      }

      return [];
    });
  });
}
