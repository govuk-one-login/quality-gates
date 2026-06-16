import { schemaUrl } from "./index.js";

export function transform(manifest) {
  return {
    $schema: schemaUrl("0.11.0"),
    services: (manifest.services || []).map(({ qualityGates, ...rest }) => ({
      ...rest,
      checks: qualityGates,
    })),
  };
}
