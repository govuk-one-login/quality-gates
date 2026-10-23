/**
 * Groups a flat array of services by their pod value.
 *
 * Each service is expected to have a `pod` property (string or falsy) and a `product` property.
 * Products that span multiple repos with different pod values are assigned to the
 * pod with the most repos (majority). Ties are broken alphabetically (first pod wins).
 *
 * @param {Array} services - Array of service objects, each with `pod` and `product` properties
 * @returns {Object} { pods: [ { name, products: { productName: services[] } } ], noPod: { productName: services[] } }
 */
export function groupServicesByPod(services) {
  if (services.length === 0) return { pods: [], noPod: {} };

  // Step 1: Group services by product
  const servicesByProduct = Object.groupBy(services, s => s.product);

  // Step 2: Determine the pod for each product (majority wins, alphabetical tie-break)
  const podByProduct = {};
  for (const [product, productServices] of Object.entries(servicesByProduct)) {
    const podCounts = {};
    for (const service of productServices) {
      const pod = service.pod;
      if (pod) {
        podCounts[pod] = (podCounts[pod] ?? 0) + 1;
      }
    }

    const podEntries = Object.entries(podCounts);
    if (podEntries.length === 0) {
      // All services for this product have no pod
      podByProduct[product] = null;
    } else {
      // Sort by count desc, then name asc for tie-break
      podEntries.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
      podByProduct[product] = podEntries[0][0];
    }
  }

  // Step 3: Build pod groups and noPod bucket
  const podProductsMap = {}; // podName → { productName → services[] }
  const noPodProducts = {};

  for (const [product, productServices] of Object.entries(servicesByProduct)) {
    const pod = podByProduct[product];
    if (pod) {
      if (!podProductsMap[pod]) podProductsMap[pod] = {};
      podProductsMap[pod][product] = productServices;
    } else {
      noPodProducts[product] = productServices;
    }
  }

  // Step 4: Sort pods alphabetically, sort products within each pod alphabetically
  const pods = Object.keys(podProductsMap)
    .sort()
    .map(podName => ({
      name: podName,
      products: sortObjectKeys(podProductsMap[podName]),
    }));

  const noPod = sortObjectKeys(noPodProducts);

  return { pods, noPod };
}

/**
 * Returns a new object with keys sorted alphabetically.
 */
function sortObjectKeys(obj) {
  const sorted = {};
  for (const key of Object.keys(obj).sort()) {
    sorted[key] = obj[key];
  }
  return sorted;
}

/**
 * Flattens repository nodes into a flat array of services with
 * repository, repositoryUrl, and pod attached to each service.
 *
 * @param {Array} repositoryNodes - Array of repository node objects from GraphQL data
 * @returns {Array} Flat array of service objects enriched with repo metadata and pod
 */
export function prepareServicesWithPod(repositoryNodes) {
  return repositoryNodes
    .filter(node => node.manifest?.text?.services)
    .flatMap(node =>
      node.manifest.text.services
        // Drop services missing required identity fields (e.g. authored against
        // a different schema version or a partially-migrated manifest)
        .filter(service => service.product != null && service.component != null)
        .map(service => ({
          ...service,
          repository: node.name,
          repositoryUrl: `https://github.com/${node.owner.login}/${node.name}`,
          pod: node.pod?.value ?? null
        }))
    );
}
