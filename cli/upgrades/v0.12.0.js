import { schemaUrl } from "./index.js";

export function transform(manifest) {
  const { $schema, ...rest } = manifest;
  return { $schema: schemaUrl("0.12.0"), ...rest };
}
