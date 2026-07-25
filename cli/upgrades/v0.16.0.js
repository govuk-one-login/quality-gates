import { schemaUrl } from "./index.js";

const SCOPE_MAP = {
  component: "component",
  product: "product",
  neighbour: "neighbour",
  e2e: "e2e",
  stack: "component",
};

const PURPOSE_SET = new Set(["regression", "new feature", "smoke"]);

function transformChecksArray(checks) {
  const scopeValues = [];
  const purposeValues = [];
  const kept = [];

  for (const check of checks) {
    if (SCOPE_MAP[check.name]) {
      scopeValues.push(SCOPE_MAP[check.name]);
    } else if (PURPOSE_SET.has(check.name)) {
      purposeValues.push(check.name);
    } else {
      kept.push(check);
    }
  }

  if (scopeValues.length === 0 && purposeValues.length === 0) {
    return checks;
  }

  // Determine purpose target: unit > integration > infer integration
  const unitIndex = kept.findIndex((c) => c.name === "unit");
  const integrationIndex = kept.findIndex((c) => c.name === "integration");

  if (unitIndex !== -1 && purposeValues.length > 0) {
    kept[unitIndex] = { ...kept[unitIndex], purpose: purposeValues };
  } else if (integrationIndex !== -1 && purposeValues.length > 0) {
    kept[integrationIndex] = { ...kept[integrationIndex], purpose: purposeValues };
  } else if (purposeValues.length > 0 && scopeValues.length === 0) {
    kept.push({ name: "integration", purpose: purposeValues });
  }

  // Each scope creates an integration entry with purposes (if not already attached to unit)
  for (const scope of scopeValues) {
    const entry = { name: "integration", scope };
    if (purposeValues.length > 0 && unitIndex === -1) {
      entry.purpose = purposeValues;
    }
    // If there's already an integration entry from the kept array, merge scope into it
    const existingIntegration = kept.findIndex(
      (c) => c.name === "integration" && !c.scope
    );
    if (existingIntegration !== -1) {
      kept[existingIntegration] = { ...kept[existingIntegration], scope };
    } else {
      kept.push(entry);
    }
  }

  return kept;
}

export function transform(manifest) {
  return {
    $schema: schemaUrl("0.16.0"),
    services: (manifest.services || []).map((service) => {
      const result = { ...service };

      for (const mode of ["automated", "manual", "outOfBand"]) {
        if (result[mode]) {
          result[mode] = result[mode].map((gate) => ({
            ...gate,
            checks: transformChecksArray(gate.checks || []),
          }));
        }
      }

      if (result.notApplicable) {
        result.notApplicable = result.notApplicable.map((gate) => ({
          ...gate,
          checks: (gate.checks || []).filter(
            (c) => !SCOPE_MAP[c.name] && !PURPOSE_SET.has(c.name)
          ),
        }));
        // Remove empty notApplicable entries
        result.notApplicable = result.notApplicable.filter(
          (gate) => gate.checks.length > 0
        );
        if (result.notApplicable.length === 0) {
          delete result.notApplicable;
        }
      }

      return result;
    }),
  };
}
