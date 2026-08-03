/**
 * Builds grid data for the check-level table for a single product.
 *
 * @param {string} product - The product name
 * @param {Array} services - Array of service objects for this product
 * @param {Array} levelGroups - Level group definitions with phase/checks
 * @param {Object} phasesByPromotionType - Map of promotionType → valid phases
 * @returns {Object} gridData with groups (one per promotionType) for renderStatusGrid
 */
export function buildCheckLevelGrid(product, services, levelGroups, phasesByPromotionType) {
  // Flatten services into per-component check implementations
  const productChecks = services.flatMap(service =>
    [...(service.automated ?? []), ...(service.manual ?? []), ...(service.outOfBand ?? [])].flatMap(check =>
      (check.checks ?? []).map(ct => ({
        component: service.component,
        promotionType: service.promotionType,
        phase: check.phase,
        check: ct.name
      }))
    )
  );

  // Build a Set for fast lookup of implemented checks
  const implementedByProduct = new Set(
    productChecks.map(d => `${d.component}|${d.check}|${d.phase}`)
  );

  // Build Sets for notApplicable checks: phase-scoped and global (no phase)
  const notApplicableGlobal = new Set();
  const notApplicablePhased = new Set();
  for (const service of services) {
    for (const entry of service.notApplicable ?? []) {
      for (const ct of entry.checks ?? []) {
        if (entry.phase) {
          notApplicablePhased.add(`${service.component}|${ct.name}|${entry.phase}`);
        } else {
          notApplicableGlobal.add(`${service.component}|${ct.name}`);
        }
      }
    }
  }

  // Build unique component/promotionType combinations
  const componentTypes = Object.values(
    services.reduce((acc, service) => {
      const key = `${service.component}|${service.promotionType}`;
      if (!acc[key]) {
        acc[key] = { component: service.component, repositories: new Map(), promotionType: service.promotionType };
      }
      if (service.repository) {
        acc[key].repositories.set(service.repository, service.repositoryUrl ?? null);
      }
      return acc;
    }, {})
  ).map(d => ({
    ...d,
    repositories: [...d.repositories.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, url]) => ({ name, url }))
  }))
    .sort((a, b) =>
      a.promotionType.localeCompare(b.promotionType) ||
      a.component.localeCompare(b.component)
    );

  // Build groups (one per promotionType)
  const promotionTypes = [...new Set(componentTypes.map(d => d.promotionType))].sort();

  const groups = promotionTypes.map(promotionType => {
    const components = [...new Set(
      componentTypes
        .filter(d => d.promotionType === promotionType)
        .map(d => d.component)
    )].sort();

    // Required checks keyed by phase, filtered to this promotionType
    const requiredChecksByPhase = levelGroups
      .filter(level => level.promotionType.toLowerCase() === promotionType.toLowerCase())
      .reduce((acc, level) => {
        if (!acc[level.phase]) acc[level.phase] = [];
        acc[level.phase] = [...new Set([...acc[level.phase], ...level.checks])].sort();
        return acc;
      }, {});

    const validPhases = phasesByPromotionType[promotionType] ?? [];

    const categories = validPhases.map(phase => ({
      name: phase,
      items: requiredChecksByPhase[phase] ?? []
    }));

    const rows = components.map(component => {
      const repos = componentTypes.find(
        d => d.component === component && d.promotionType === promotionType
      )?.repositories ?? [];

      const cells = validPhases.flatMap(phase => {
        const checks = requiredChecksByPhase[phase] ?? [];
        if (checks.length === 0) {
          return [{ status: "empty", title: "" }];
        }
        return checks.map(check => {
          const status = implementedByProduct.has(`${component}|${check}|${phase}`)
            ? "implemented"
            : notApplicablePhased.has(`${component}|${check}|${phase}`)
              ? "notApplicable"
              : notApplicableGlobal.has(`${component}|${check}`)
                ? "notApplicable"
                : "missing";
          return {
            status,
            title: `${product} / ${component}\n${promotionType}: ${phase} → ${check}\n${status}`
          };
        });
      });

      return { label: component, meta: repos, cells };
    });

    return { title: product, subtitle: promotionType, columns: { categories }, rows };
  });

  return { groups };
}

/**
 * Builds grid data for the integration scope/purpose table for a single product.
 * Columns: phases → scopes. Rows: purposes.
 * Cells show whether any component in the product has an integration check
 * with that purpose at that phase/scope combination.
 *
 * @param {string} product - The product name
 * @param {Array} services - Array of service objects for this product
 * @param {Object} phasesByPromotionType - Map of promotionType → valid phases
 * @param {Array} scopes - Scope enum values from schema
 * @param {Array} purposes - Purpose enum values from schema
 * @returns {Object} gridData with groups (one per promotionType) for renderStatusGrid
 */
export function buildIntegrationScopeGrid(product, services, phasesByPromotionType, scopes, purposes) {
  const NOT_SPECIFIED = "not specified";
  const allScopes = [...scopes, NOT_SPECIFIED];
  const allPurposes = [...purposes, NOT_SPECIFIED];

  // Extract integration checks with their scope, purpose, and source
  const integrationChecks = services.flatMap(service => {
    const sources = [
      { bucket: service.automated ?? [], source: "automated" },
      { bucket: service.manual ?? [], source: "manual" },
      { bucket: service.outOfBand ?? [], source: "outOfBand" },
    ];
    return sources.flatMap(({ bucket, source }) =>
      bucket.flatMap(check =>
        (check.checks ?? [])
          .filter(ct => ct.name === "integration")
          .map(ct => ({
            promotionType: service.promotionType,
            phase: check.phase,
            scope: ct.scope ?? NOT_SPECIFIED,
            purpose: ct.purpose && ct.purpose.length > 0 ? ct.purpose : [NOT_SPECIFIED],
            source
          }))
      )
    );
  });

  // Build lookup: key → Set<source>
  const implementedIntegration = new Map();
  for (const ic of integrationChecks) {
    for (const p of ic.purpose) {
      const key = `${ic.promotionType}|${ic.phase}|${ic.scope}|${p}`;
      if (!implementedIntegration.has(key)) {
        implementedIntegration.set(key, new Set());
      }
      implementedIntegration.get(key).add(ic.source);
    }
  }

  // NotApplicable integration checks: phase-scoped and global (per promotionType)
  const notApplicableIntegrationGlobal = new Set();
  const notApplicableIntegrationPhased = new Set();
  for (const service of services) {
    for (const entry of service.notApplicable ?? []) {
      for (const ct of entry.checks ?? []) {
        if (ct.name === "integration") {
          if (entry.phase) {
            notApplicableIntegrationPhased.add(`${service.promotionType}|${entry.phase}`);
          } else {
            notApplicableIntegrationGlobal.add(service.promotionType);
          }
        }
      }
    }
  }

  // Build groups (one per promotionType)
  const promotionTypes = [...new Set(services.map(s => s.promotionType))].sort();

  const groups = promotionTypes.map(promotionType => {
    const validPhases = (phasesByPromotionType[promotionType] ?? [])

    const categories = validPhases.map(phase => ({
      name: phase,
      items: allScopes
    }));

    const rows = allPurposes.map(purpose => {
      const cells = validPhases.flatMap(phase =>
        allScopes.map(scope => {
          const key = `${promotionType}|${phase}|${scope}|${purpose}`;
          const sources = implementedIntegration.get(key);

          let status;
          if (sources) {
            if (sources.size > 1) {
              status = "multiple";
            } else {
              status = [...sources][0]; // "automated", "manual", or "outOfBand"
            }
          } else if (notApplicableIntegrationPhased.has(`${promotionType}|${phase}`)) {
            status = "notApplicable";
          } else if (notApplicableIntegrationGlobal.has(promotionType)) {
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

  return { groups };
}

/**
 * Builds grid data showing all checks per component.
 * Columns: all check types (flat, no phase grouping).
 * Rows: components.
 * Cells show whether that component has that check in any phase.
 *
 * @param {string} product - The product name
 * @param {Array} services - Array of service objects for this product
 * @param {Array} allCheckTypes - All check type enum values from schema
 * @returns {Object} gridData with groups (one per promotionType) for renderStatusGrid
 */
export function buildAllChecksGrid(product, services, allCheckTypes) {
  // Flatten all checks from automated, manual, outOfBand
  const allChecks = services.flatMap(service =>
    [...(service.automated ?? []), ...(service.manual ?? []), ...(service.outOfBand ?? [])].flatMap(check =>
      (check.checks ?? []).map(ct => ({
        component: service.component,
        promotionType: service.promotionType,
        check: ct.name
      }))
    )
  );

  // Build a Set for fast lookup: component|check
  const implemented = new Set(
    allChecks.map(d => `${d.component}|${d.check}`)
  );

  // Build a Set for notApplicable checks (includes both phased and global)
  const notApplicable = new Set(
    services.flatMap(service =>
      (service.notApplicable ?? []).flatMap(entry =>
        (entry.checks ?? []).map(ct => `${service.component}|${ct.name}`)
      )
    )
  );

  // Build unique component/promotionType combinations with repositories
  const componentTypes = Object.values(
    services.reduce((acc, service) => {
      const key = `${service.component}|${service.promotionType}`;
      if (!acc[key]) {
        acc[key] = { component: service.component, repositories: new Map(), promotionType: service.promotionType };
      }
      if (service.repository) {
        acc[key].repositories.set(service.repository, service.repositoryUrl ?? null);
      }
      return acc;
    }, {})
  ).map(d => ({
    ...d,
    repositories: [...d.repositories.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([name, url]) => ({ name, url }))
  }))
    .sort((a, b) =>
      a.promotionType.localeCompare(b.promotionType) ||
      a.component.localeCompare(b.component)
    );

  // Build groups (one per promotionType)
  const promotionTypes = [...new Set(componentTypes.map(d => d.promotionType))].sort();

  const groups = promotionTypes.map(promotionType => {
    const components = [...new Set(
      componentTypes
        .filter(d => d.promotionType === promotionType)
        .map(d => d.component)
    )].sort();

    const categories = [{ name: "", items: allCheckTypes }];

    const rows = components.map(component => {
      const repos = componentTypes.find(
        d => d.component === component && d.promotionType === promotionType
      )?.repositories ?? [];

      const cells = allCheckTypes.map(check => {
        const status = implemented.has(`${component}|${check}`)
          ? "implemented"
          : notApplicable.has(`${component}|${check}`)
            ? "notApplicable"
            : "missing";
        return {
          status,
          title: `${product} / ${component}\n${check}\n${status}`
        };
      });

      return { label: component, meta: repos, cells };
    });

    return { title: product, subtitle: promotionType, columns: { categories }, rows };
  });

  return { groups };
}
