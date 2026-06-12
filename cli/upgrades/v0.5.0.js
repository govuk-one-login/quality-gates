import { schemaUrl } from "./index.js";

export function transform(manifest) {
  return {
    $schema: schemaUrl("0.5.0"),
    services: (manifest.services || []).map((service) => {
      const out = {};
      if (service["service-tag"]) out.serviceTag = service["service-tag"];
      else if (service.serviceTag) out.serviceTag = service.serviceTag;
      out.qualityGates = (service["quality-gates"] || service.qualityGates || []).map((gate) => ({
        checkTypes: gate["check-types"] || gate.checkTypes,
        phase: gate.phase,
        provider: gate.provider,
        config: gate.config,
      }));
      return out;
    }),
  };
}
