import { schemaUrl } from "./index.js";

function flattenConfig(gate) {
  const { config, ...rest } = gate;
  if (!config) return gate;
  const result = { ...rest, file: config.file };
  if (config.path) result.path = config.path;
  return result;
}

export function transform(manifest) {
  return {
    $schema: schemaUrl("0.17.0"),
    services: (manifest.services || []).map((service) => {
      const result = { ...service };

      for (const mode of ["automated", "outOfBand"]) {
        if (result[mode]) {
          result[mode] = result[mode].map(flattenConfig);
        }
      }

      return result;
    }),
  };
}
