import { schemaUrl } from "./index.js";

export function transform(manifest) {
  return {
    $schema: schemaUrl("0.13.0"),
    services: (manifest.services || []).map(({ serviceTag, ...rest }) => ({
      product: serviceTag || rest.product,
      component: rest.component || serviceTag || rest.product,
      ...rest,
    })),
  };
}
