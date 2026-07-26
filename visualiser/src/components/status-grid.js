import {html} from "npm:htl";

/**
 * Renders a status grid as HTML tables with grouped headings.
 *
 * @param {Object} gridData - The intermediate data structure
 * @param {Array} gridData.groups - Array of group objects
 * @param {Object} iconsMapping - Map of status → {color, symbol}
 * @returns {HTMLElement}
 */
export function renderStatusGrid(gridData, iconsMapping) {
  return html`${gridData.groups.map(group => {
    const totalColumns = group.columns.categories.reduce((sum, cat) => sum + cat.items.length, 0);

    return html`<h3>${group.title}</h3>${group.subtitle ? html`<table style="border-collapse: collapse; font-size: 0.85rem; width: 100%;">
      <thead>
        <tr>
          <th rowspan="3" style="border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;">Component</th>
          <th colspan="${totalColumns}" style="border: 1px solid #ddd; padding: 6px 10px; text-align: center; background: #e8e8e8; font-weight: bold;">${group.subtitle}</th>
          ${group.rows[0]?.meta !== undefined ? html`<th rowspan="3" style="border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;">Repositories</th>` : ""}
        </tr>
        <tr>
          ${group.columns.categories.map(cat =>
            html`<th colspan="${cat.items.length}" style="border: 1px solid #ddd; padding: 6px 10px; text-align: center; background: #f5f5f5;">${cat.name}</th>`
          )}
        </tr>
        <tr>
          ${group.columns.categories.flatMap(cat =>
            cat.items.map(item =>
              html`<th style="border: 1px solid #ddd; padding: 4px 6px; text-align: center; font-weight: normal; writing-mode: vertical-rl; transform: rotate(180deg); height: 120px; font-size: 0.75rem;">${item}</th>`
            )
          )}
        </tr>
      </thead>
      <tbody>
        ${group.rows.map(row => html`<tr>
          <td style="border: 1px solid #ddd; padding: 6px 10px; white-space: nowrap;">${row.label}</td>
          ${row.cells.map(cell => {
            const icon = iconsMapping[cell.status];
            return html`<td style="border: 1px solid #ddd; padding: 4px 8px; text-align: center; background: ${icon.color}; color: white;" title="${cell.title ?? ""}">${icon.symbol}</td>`;
          })}
          ${row.meta !== undefined ? html`<td style="border: 1px solid #ddd; padding: 6px 10px; white-space: nowrap;">${row.meta}</td>` : ""}
        </tr>`)}
      </tbody>
    </table>` : html`<table style="border-collapse: collapse; font-size: 0.85rem; width: 100%;">
      <thead>
        <tr>
          <th rowspan="2" style="border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;">Component</th>
          ${group.columns.categories.map(cat =>
            html`<th colspan="${cat.items.length}" style="border: 1px solid #ddd; padding: 6px 10px; text-align: center; background: #f5f5f5;">${cat.name}</th>`
          )}
          ${group.rows[0]?.meta !== undefined ? html`<th rowspan="2" style="border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;">Repositories</th>` : ""}
        </tr>
        <tr>
          ${group.columns.categories.flatMap(cat =>
            cat.items.map(item =>
              html`<th style="border: 1px solid #ddd; padding: 4px 6px; text-align: center; font-weight: normal; writing-mode: vertical-rl; transform: rotate(180deg); height: 120px; font-size: 0.75rem;">${item}</th>`
            )
          )}
        </tr>
      </thead>
      <tbody>
        ${group.rows.map(row => html`<tr>
          <td style="border: 1px solid #ddd; padding: 6px 10px; white-space: nowrap;">${row.label}</td>
          ${row.cells.map(cell => {
            const icon = iconsMapping[cell.status];
            return html`<td style="border: 1px solid #ddd; padding: 4px 8px; text-align: center; background: ${icon.color}; color: white;" title="${cell.title ?? ""}">${icon.symbol}</td>`;
          })}
          ${row.meta !== undefined ? html`<td style="border: 1px solid #ddd; padding: 6px 10px; white-space: nowrap;">${row.meta}</td>` : ""}
        </tr>`)}
      </tbody>
    </table>`}`;
  })}`;
}

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
 * Columns: phases → scopes. Cells show whether that scope of integration test exists at that phase.
 * Purpose is shown in the tooltip.
 *
 * @param {Array} repositories - Raw repository nodes from GraphQL
 * @param {Object} phasesByPromotionType - Map of promotionType → valid phases
 * @param {Array} scopes - Scope enum values from schema
 * @returns {Object} gridData for renderStatusGrid
 */
export function buildIntegrationScopeGrid(repositories, phasesByPromotionType, scopes) {
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
              scope: ct.scope ?? null,
              purpose: ct.purpose ?? []
            }))
        )
      )
    );

  // Build lookup: product|component|phase|scope → purpose[]
  const implementedIntegration = new Map();
  for (const ic of integrationChecks) {
    const key = `${ic.product}|${ic.component}|${ic.phase}|${ic.scope}`;
    if (!implementedIntegration.has(key)) {
      implementedIntegration.set(key, new Set());
    }
    for (const p of ic.purpose) {
      implementedIntegration.get(key).add(p);
    }
  }

  // NotApplicable integration checks
  const notApplicableIntegration = new Set(
    repositories
      .filter(node => node.manifest?.text?.services)
      .flatMap(node =>
        node.manifest.text.services.flatMap(service =>
          (service.notApplicable ?? []).flatMap(entry =>
            (entry.checks ?? [])
              .filter(ct => ct.name === "integration")
              .map(() => `${service.product}|${service.component}`)
          )
        )
      )
  );

  // Get all service components that have at least one integration check or all services
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

  const products = [...new Set(allServiceComponents.map(d => d.product))].sort();

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

      const validPhases = phasesByPromotionType[promotionType] ?? [];

      const categories = validPhases.map(phase => ({
        name: phase,
        items: scopes
      }));

      const rows = components.map(component => {
        const repos = productComponentTypes.find(
          d => d.product === product && d.component === component && d.promotionType === promotionType
        )?.repositories ?? [];

        const cells = validPhases.flatMap(phase =>
          scopes.map(scope => {
            const key = `${product}|${component}|${phase}|${scope}`;
            const purposes = implementedIntegration.get(key);

            let status;
            if (purposes && purposes.size > 0) {
              status = "implemented";
            } else if (implementedIntegration.has(key)) {
              status = "implemented";
            } else if (notApplicableIntegration.has(`${product}|${component}`)) {
              status = "notApplicable";
            } else {
              status = "missing";
            }

            const purposeText = purposes ? [...purposes].join(", ") : "";
            return {
              status,
              title: `${product} / ${component}\n${phase} → integration (${scope})${purposeText ? `\nPurpose: ${purposeText}` : ""}\n${status}`
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
