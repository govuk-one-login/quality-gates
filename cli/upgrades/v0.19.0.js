import { schemaUrl } from "./index.js";

export function transform(manifest) {
  const { $schema, ...rest } = manifest;
  return { $schema: schemaUrl("0.19.0"), ...rest };
}
