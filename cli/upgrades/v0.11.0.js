import { schemaUrl } from "./index.js";

export function transform(manifest) {
  return {
    $schema: schemaUrl("0.11.0"),
    services: (manifest.services || []).map((service) => ({
      ...service,
      checks: (service.checks || []).map(({ config, ...rest }) => {
        const { name, jobName, ...cleanConfig } = config;
        if (cleanConfig.path && !cleanConfig.path.startsWith("$")) {
          cleanConfig.path = `$.${cleanConfig.path}`;
        }
        return { ...rest, config: cleanConfig };
      }),
    })),
  };
}
