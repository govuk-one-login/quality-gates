// Note: Changing environment variables doesn't invalidate the cache
// Restart and delete src/.observable/cache/data/filter-included-project-component.json to refresh

import "dotenv/config";

const raw = process.env.LEVEL_FILTER_INCLUDED_PROJECT_COMPONENT ?? "";

const data = raw.trim() === ""
  ? []
  : raw.split('\n').map(entry => {
      const [product, component] = entry.trim().split(":");
      return { product: product?.trim(), component: component?.trim() };
    }).filter(e => e.product && e.component);

process.stdout.write(JSON.stringify(data, null, 2));
