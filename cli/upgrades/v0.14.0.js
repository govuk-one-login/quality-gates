import { schemaUrl } from "./index.js";

export function transform(manifest) {
  return {
    $schema: schemaUrl("0.14.0"),
    services: (manifest.services || []).map(({ checks, ...rest }) => ({
      ...rest,
      automated: checks || [],
    })),
  };
}
