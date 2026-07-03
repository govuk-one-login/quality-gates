/**
 * Resolves a JSONPath-style expression against hcl2json output.
 *
 * hcl2json wraps block values in arrays (since HCL allows repeated blocks),
 * so this resolver transparently unwraps single-element arrays at each level.
 *
 * Example path: "$.module.build-example-product-app-deploy.parameters.TestImageRepositoryUri"
 * Navigates: obj.module["build-example-product-app-deploy"][0].parameters[0].TestImageRepositoryUri
 */

export function parsePath(path) {
  if (!path || !path.startsWith("$")) return [];
  const rest = path.slice(2); // remove "$."
  if (!rest) return [];
  return rest.split(".");
}

export function resolveTerraformPath(hclJson, path) {
  const segments = parsePath(path);
  if (segments.length === 0) {
    return { found: false, context: { reason: "empty-path" } };
  }

  let current = hclJson;

  for (const segment of segments) {
    if (current === undefined || current === null) {
      return { found: false, context: { failedAt: segment } };
    }
    // hcl2json wraps blocks in arrays — unwrap first element transparently
    if (Array.isArray(current)) {
      current = current[0];
    }
    if (current === undefined || current === null) {
      return { found: false, context: { failedAt: segment } };
    }
    current = current[segment];
  }

  // Final unwrap if result is a single-element array
  if (Array.isArray(current)) {
    current = current[0];
  }

  return current !== undefined
    ? { found: true, value: current }
    : { found: false, context: { failedAt: segments[segments.length - 1] } };
}
