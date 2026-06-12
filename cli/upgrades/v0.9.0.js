import { schemaUrl } from "./index.js";

function inferProvider(qualityGate) {
  if (qualityGate.provider === "Stack Orchestrator") return "Stack Orchestration Tool";

  return qualityGate.provider
}

export function transform(manifest) {
  return {
    $schema: schemaUrl("0.9.0"),
    services: (manifest.services || []).map((service) => ({
      ...service,
      qualityGates: service.qualityGates.map((qualityGate) => ({
          ...qualityGate,
          provider: inferProvider(qualityGate)
      }))
    })),
  };
}
