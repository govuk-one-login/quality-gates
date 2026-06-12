import { schemaUrl } from "./index.js";

const GIT_FLOW_PHASES = new Set(["develop", "pre-develop", "release", "main"]);

function inferPromotionType(service) {
  const phases = (service.qualityGates || []).map((g) => g.phase);
  if (phases.some((p) => GIT_FLOW_PHASES.has(p))) return "gitFlow";
  if (phases.includes("pre-release")) return "library";
  return "securePipelines";
}

export function transform(manifest) {
  return {
    $schema: schemaUrl("0.7.0"),
    services: (manifest.services || []).map((service) => ({
      serviceTag: service.serviceTag,
      promotionType: service.promotionType || inferPromotionType(service),
      qualityGates: service.qualityGates,
    })),
  };
}
