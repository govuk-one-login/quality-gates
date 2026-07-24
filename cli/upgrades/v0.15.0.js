import { schemaUrl } from "./index.js";

function transformChecks(checkTypes) {
  return (checkTypes || []).map((name) => ({ name }));
}

export function transform(manifest) {
  return {
    $schema: schemaUrl("0.15.0"),
    services: (manifest.services || []).map(({ notApplicable, ...rest }) => {
      const service = { ...rest };

      for (const mode of ["automated", "manual", "outOfBand"]) {
        if (service[mode]) {
          service[mode] = service[mode].map(({ checkTypes, ...item }) => ({
            ...item,
            checks: transformChecks(checkTypes),
          }));
        }
      }

      if (notApplicable) {
        service.notApplicable = [{
          checks: (notApplicable.checkTypes || []).map((name, i) => ({
            name,
            details: [notApplicable.details?.[i] || "Not applicable"],
          })),
        }];
      }

      return service;
    }),
  };
}
