/**
 * Builds grid data for the check-level table (existing "By Product" table).
 *
 * @param {Array} repositories - Raw repository nodes from GraphQL
 * @param {Array} levelGroups - Level group definitions with phase/checks
 * @param {Object} phasesByPromotionType - Map of promotionType → valid phases
 * @returns {Object} gridData for renderStatusGrid
 */
export function buildCheckLevelGrid(repositories, levelGroups, phasesByPromotionType) {
  // Flatten manifests into per-product/component check implementations
  const productChecks = repositories
    .filter(node => node.manifest?.text?.services)
    .flatMap(node =>
      node.manifest.text.services.flatMap(service =>
        [...(service.automated ?? []), ...(service.manual ?? []), ...(service.outOfBand ?? [])].flatMap(check =>
          (check.checks ?? []).map(ct => ({
            product: service.product,
            component: service.component,
            repository: node.name,
            promotionType: service.promotionType,
            phase: check.phase,
            check: ct.name
          }))
        )
      )
    );

  // Build a Set for fast lookup of implemented checks
  const implementedByProduct = new Set(
    productChecks.map(d => `${d.product}|${d.component}|${d.check}|${d.phase}`)
  );

  // Build a Set for notApplicable checks (no phase)
  const notApplicableByProduct = new Set(
    repositories
      .filter(node => node.manifest?.text?.services)
      .flatMap(node =>
        node.manifest.text.services.flatMap(service =>
          (service.notApplicable ?? []).flatMap(entry =>
            (entry.checks ?? []).map(ct => `${service.product}|${service.component}|${ct.name}`)
          )
        )
      )
  );

  // Get all service components
  const allServiceComponents = repositories
    .filter(node => node.manifest?.text?.services)
    .flatMap(node =>
      node.manifest.text.services.map(service => ({
        product: service.product,
        component: service.component,
        repository: node.name,
        promotionType: service.promotionType
      }))
    );

  // Build unique product/component/promotionType combinations
  const productComponentTypes = Object.values(
    allServiceComponents.reduce((acc, d) => {
      const key = `${d.product}|${d.component}|${d.promotionType}`;
      if (!acc[key]) {
        acc[key] = { product: d.product, component: d.component, repositories: new Set(), promotionType: d.promotionType };
      }
      acc[key].repositories.add(d.repository);
      return acc;
    }, {})
  ).map(d => ({ ...d, repositories: [...d.repositories].sort() }))
    .sort((a, b) =>
      a.product.localeCompare(b.product) ||
      a.promotionType.localeCompare(b.promotionType) ||
      a.component.localeCompare(b.component)
    );

  // Required checks keyed by phase
  const requiredChecksByPhase = levelGroups.reduce((acc, level) => {
    if (!acc[level.phase]) acc[level.phase] = [];
    acc[level.phase] = [...new Set([...acc[level.phase], ...level.checks])].sort();
    return acc;
  }, {});

  // Get unique products
  const products = [...new Set(allServiceComponents.map(d => d.product))].sort();

  // Build groups
  const groups = products.flatMap(product => {
    const promotionTypes = [...new Set(
      productComponentTypes.filter(d => d.product === product).map(d => d.promotionType)
    )].sort();

    return promotionTypes.map(promotionType => {
      const components = [...new Set(
        productComponentTypes
          .filter(d => d.product === product && d.promotionType === promotionType)
          .map(d => d.component)
      )].sort();

      // Determine applicable phases (valid for this promotionType AND have required checks)
      const validPhases = phasesByPromotionType[promotionType] ?? [];
      const applicablePhases = validPhases.filter(phase => requiredChecksByPhase[phase]);

      const categories = applicablePhases.map(phase => ({
        name: phase,
        items: requiredChecksByPhase[phase]
      }));

      const rows = components.map(component => {
        const repos = productComponentTypes.find(
          d => d.product === product && d.component === component && d.promotionType === promotionType
        )?.repositories ?? [];

        const cells = applicablePhases.flatMap(phase =>
          requiredChecksByPhase[phase].map(check => {
            const status = implementedByProduct.has(`${product}|${component}|${check}|${phase}`)
              ? "implemented"
              : notApplicableByProduct.has(`${product}|${component}|${check}`)
                ? "notApplicable"
                : "missing";
            return {
              status,
              title: `${product} / ${component}\n${promotionType}: ${phase} → ${check}\n${status}`
            };
          })
        );

        return { label: component, meta: repos.join(", "), cells };
      });

      return { title: product, subtitle: promotionType, columns: { categories }, rows };
    });
  });

  return { groups };
}

/**
 * Builds grid data for the integration scope/purpose table.
 * Columns: phases → scopes. Rows: purposes.
 * Cells show whether any component in the product has an integration check
 * with that purpose at that phase/scope combination.
 *
 * @param {Array} repositories - Raw repository nodes from GraphQL
 * @param {Object} phasesByPromotionType - Map of promotionType → valid phases
 * @param {Array} scopes - Scope enum values from schema
 * @param {Array} purposes - Purpose enum values from schema
 * @returns {Object} gridData for renderStatusGrid
 */
export function buildIntegrationScopeGrid(repositories, phasesByPromotionType, scopes, purposes) {
  const NOT_SPECIFIED = "not specified";
  const allScopes = [...scopes, NOT_SPECIFIED];
  const allPurposes = [...purposes, NOT_SPECIFIED];

  // Extract integration checks with their scope and purpose
  const integrationChecks = repositories
    .filter(node => node.manifest?.text?.services)
    .flatMap(node =>
      node.manifest.text.services.flatMap(service =>
        [...(service.automated ?? []), ...(service.manual ?? []), ...(service.outOfBand ?? [])].flatMap(check =>
          (check.checks ?? [])
            .filter(ct => ct.name === "integration")
            .map(ct => ({
              product: service.product,
              component: service.component,
              repository: node.name,
              promotionType: service.promotionType,
              phase: check.phase,
              scope: ct.scope ?? NOT_SPECIFIED,
              purpose: ct.purpose && ct.purpose.length > 0 ? ct.purpose : [NOT_SPECIFIED]
            }))
        )
      )
    );

  // Build lookup: product|promotionType|phase|scope|purpose → true
  const implementedIntegration = new Set();
  for (const ic of integrationChecks) {
    for (const p of ic.purpose) {
      implementedIntegration.add(`${ic.product}|${ic.promotionType}|${ic.phase}|${ic.scope}|${p}`);
    }
  }

  // NotApplicable integration checks (aggregated per product|promotionType)
  const notApplicableIntegration = new Set(
    repositories
      .filter(node => node.manifest?.text?.services)
      .flatMap(node =>
        node.manifest.text.services.flatMap(service =>
          (service.notApplicable ?? []).flatMap(entry =>
            (entry.checks ?? [])
              .filter(ct => ct.name === "integration")
              .map(() => `${service.product}|${service.promotionType}`)
          )
        )
      )
  );

  // Get all service components to determine product/promotionType combinations
  const allServiceComponents = repositories
    .filter(node => node.manifest?.text?.services)
    .flatMap(node =>
      node.manifest.text.services.map(service => ({
        product: service.product,
        component: service.component,
        repository: node.name,
        promotionType: service.promotionType
      }))
    );

  const products = [...new Set(allServiceComponents.map(d => d.product))].sort();
  const promotionTypesByProduct = products.reduce((acc, product) => {
    acc[product] = [...new Set(
      allServiceComponents.filter(d => d.product === product).map(d => d.promotionType)
    )].sort();
    return acc;
  }, {});

  const groups = products.flatMap(product => {
    return promotionTypesByProduct[product].map(promotionType => {
      const validPhases = (phasesByPromotionType[promotionType] ?? [])
        .filter(phase => phase !== "pre-merge" && phase !== "pre-upload");

      const categories = validPhases.map(phase => ({
        name: phase,
        items: allScopes
      }));

      const rows = allPurposes.map(purpose => {
        const cells = validPhases.flatMap(phase =>
          allScopes.map(scope => {
            const key = `${product}|${promotionType}|${phase}|${scope}|${purpose}`;

            let status;
            if (implementedIntegration.has(key)) {
              status = "implemented";
            } else if (notApplicableIntegration.has(`${product}|${promotionType}`)) {
              status = "notApplicable";
            } else {
              status = "empty";
            }

            return {
              status,
              title: `${product}\n${phase} → integration (${scope})\nPurpose: ${purpose}\n${status}`
            };
          })
        );

        return { label: purpose, cells };
      });

      return { title: product, subtitle: promotionType, columns: { categories }, rows };
    });
  });

  return { groups };
}
