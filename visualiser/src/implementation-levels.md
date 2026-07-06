# Implementation Levels



```js
const githubManifestAndWorkflows = FileAttachment("./data/github-graphql-manifest-workflows.json").json();
```


```js
const levelGroups  = FileAttachment("./data/level-groups.json").json();
```

```js
const currentSchema = FileAttachment("./data/schema.json").json();
```

```js
const repositories = githubManifestAndWorkflows
    .organization.repositories.nodes
```


## Products and Components

```js
const productsAndComponents = repositories
  .filter(node => node.manifest?.text?.services)
  .flatMap(node =>
    node.manifest.text.services.map(service => ({
      repository: node.name,
      product: service.product,
      component: service.component,
      promotionType: service.promotionType
    }))
  )
  .sort((a, b) => a.product.localeCompare(b.product) || a.component.localeCompare(b.component));

display(Inputs.table(productsAndComponents, {
  columns: ["product", "component", "repository", "promotionType"],
  header: {
    product: "Product",
    component: "Component",
    repository: "Repository",
    promotionType: "Promotion Type"
  }
}));
```

## By Product

```js
// Map promotionType to its valid phases from the schema
const phasesByPromotionType = {
  securePipelines: currentSchema["$defs"]["secure-pipelines-phases"].properties.checks.items.properties.phase.enum,
  gitFlow: currentSchema["$defs"]["git-flow-phases"].properties.checks.items.properties.phase.enum,
  library: currentSchema["$defs"]["library-phases"].properties.checks.items.properties.phase.enum,
  other: [
    ...new Set([
      ...currentSchema["$defs"]["secure-pipelines-phases"].properties.checks.items.properties.phase.enum,
      ...currentSchema["$defs"]["git-flow-phases"].properties.checks.items.properties.phase.enum,
      ...currentSchema["$defs"]["library-phases"].properties.checks.items.properties.phase.enum,
    ])
  ]
};
```

```js
// display(phasesByPromotionType)
```

```js
// Flatten manifests into per-product/component/promotionType check implementations
const productChecks = repositories
  .filter(node => node.manifest?.text?.services)
  .flatMap(node =>
    node.manifest.text.services.flatMap(service =>
      (service.checks ?? []).flatMap(check =>
        (check.checkTypes ?? []).map(ct => ({
          product: service.product,
          component: service.component,
          repository: node.name,
          promotionType: service.promotionType,
          phase: check.phase,
          check: ct
        }))
      )
    )
  );
```

```js
// Get all product/component/promotionType combinations (including those with no checks)
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
```

```js
// Build a Set for fast lookup of implemented checks per product/component
const implementedByProduct = new Set(
  productChecks.map(d => `${d.product}|${d.component}|${d.check}|${d.phase}`)
);
```

```js
// Get unique product/component/promotionType combinations, collecting all repositories
// Includes components without any checks
const products = [...new Set(allServiceComponents.map(d => d.product))].sort();
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
```

```js
// Get required checks from level groups, keyed by phase
const requiredChecksByPhase = levelGroups.reduce((acc, level) => {
  if (!acc[level.phase]) acc[level.phase] = [];
  acc[level.phase] = [...new Set([...acc[level.phase], ...level.checks])].sort();
  return acc;
}, {});
```

```js
// Build cell data per product/promotionType grouping
const cellData = productComponentTypes.flatMap(({ product, component, promotionType }) => {
  const validPhases = phasesByPromotionType[promotionType] ?? [];
  // Only include phases that both: belong to this promotionType AND have required checks in levelGroups
  const applicablePhases = validPhases.filter(phase => requiredChecksByPhase[phase]);

  return applicablePhases.flatMap(phase =>
    requiredChecksByPhase[phase].map(check => ({
      product,
      component,
      promotionType,
      phase,
      check,
      phaseCheck: `${phase} · ${check}`,
      status: implementedByProduct.has(`${product}|${component}|${check}|${phase}`) ? "implemented" : "missing"
    }))
  );
});
```

```js
// Render a separate HTML table per product per promotionType
display(html`${products.map(product => {
  const promotionTypes = [...new Set(
    productComponentTypes.filter(d => d.product === product).map(d => d.promotionType)
  )].sort();

  return html`<h3>${product}</h3>${promotionTypes.map(promotionType => {
    const components = [...new Set(
      productComponentTypes
        .filter(d => d.product === product && d.promotionType === promotionType)
        .map(d => d.component)
    )].sort();

    const data = cellData.filter(d => d.product === product && d.promotionType === promotionType);
    const phases = [...new Set(data.map(d => d.phase))];
    const checksByPhase = phases.map(phase => ({
      phase,
      checks: [...new Set(data.filter(d => d.phase === phase).map(d => d.check))].sort()
    }));
    const totalColumns = checksByPhase.reduce((sum, p) => sum + p.checks.length, 0);

    return html`<table style="border-collapse: collapse; font-size: 0.85rem; width: 100%;">
      <thead>
        <tr>
          <th rowspan="3" style="border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;">Component</th>
          <th colspan="${totalColumns}" style="border: 1px solid #ddd; padding: 6px 10px; text-align: center; background: #e8e8e8; font-weight: bold;">${promotionType}</th>
          <th rowspan="3" style="border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;">Repositories</th>
        </tr>
        <tr>
          ${checksByPhase.map(({ phase, checks }) =>
            html`<th colspan="${checks.length}" style="border: 1px solid #ddd; padding: 6px 10px; text-align: center; background: #f5f5f5;">${phase}</th>`
          )}
        </tr>
        <tr>
          ${checksByPhase.flatMap(({ phase, checks }) =>
            checks.map(check =>
              html`<th style="border: 1px solid #ddd; padding: 4px 6px; text-align: center; font-weight: normal; writing-mode: vertical-rl; transform: rotate(180deg); height: 120px; font-size: 0.75rem;">${check}</th>`
            )
          )}
        </tr>
      </thead>
      <tbody>
        ${components.map(component => {
          const repos = productComponentTypes.find(d => d.product === product && d.component === component && d.promotionType === promotionType)?.repositories ?? [];
          return html`<tr>
            <td style="border: 1px solid #ddd; padding: 6px 10px; white-space: nowrap;">${component}</td>
            ${checksByPhase.flatMap(({ phase, checks }) =>
              checks.map(check => {
                const status = implementedByProduct.has(`${product}|${component}|${check}|${phase}`);
                return html`<td style="border: 1px solid #ddd; padding: 4px 8px; text-align: center; background: ${status ? '#28a745' : '#dc3545'}; color: white;" title="${product} / ${component}\n${promotionType}: ${phase} → ${check}\n${status ? 'implemented' : 'missing'}">${status ? '✓' : '✗'}</td>`;
              })
            )}
            <td style="border: 1px solid #ddd; padding: 6px 10px; white-space: nowrap;">${repos.join(", ")}</td>
          </tr>`;
        })}
      </tbody>
    </table>`;
  })}`;
})}`)
```

----

```js
const allCheckTypes = currentSchema["$defs"]["check-type"].enum
```

```js
const allPods = _.chain(githubManifestAndWorkflows.organization.repositories.nodes)
    .map(n => n.pod.value)
    .uniq()
    .sort()
    .value()
```

```js
const allTeams = _.chain(githubManifestAndWorkflows.organization.repositories.nodes)
    .map(n => n.teamResponsible.value)
    .uniq()
    .sort()
    .value()
```

<div class="grid grid-cols-2">

<div class="card">

```js
const selectedTeams = view(Inputs.checkbox(_.chain(allTeams), {label: "Team", value: allTeams}));
```


</div>

<div class="card">

```js
const toggleExcludeArchived = view(Inputs.toggle({label: "Exclude Archived", value: true}));
```
</div>
</div>

```js
const filteredFlattenedCheckTypes = flattenedCheckTypes.filter(fc => selectedTeams.includes(fc.teamResponsible.value))
```


# By Level

```js
const groupedCheckTypes = _.groupBy(flattenedCheckTypes, (ct) => ct.teamResponsible.value)
```

```js
// display(groupedCheckTypes)
```


```js
const createChart = (level, checkTypes) => {
    return html`<div>
        <h3>${checkTypes[0].pod.value} - ${checkTypes[0].teamResponsible.value} (${level.name} - ${level.phase})</h3>
        <div>${Plot.plot({
        marginLeft: 350,
        marginBottom: 200,
        marginTop: 150,
        x: { domain: level.checks },
        y: { domain: checkTypes.filter(fc => selectedTeams.includes(fc.teamResponsible.value)).map((fc) => fc.service__repo).sort()},
        marks: [
            Plot.axisX({anchor: "top", tickRotate: -90}),
            Plot.axisX({anchor: "bottom", label: null, tickRotate: -90}),
            Plot.cell(
                checkTypes,
                { x: "check-type", y: "service__repo", fill: "check-type" }
            )
        ]
    })}</div></div>`
}

```
```js
const makeSections = (level, groupedCheckTypes) => {
    const heading = html`<h2>${level.name} - ${level.phase}</h2>`

//    const chart = createChart(level, flattenedCheckTypes)

    const charts = _.map(groupedCheckTypes, (group, groupName) => createChart(level, group))

    return html`<div>${heading}${charts}</div>`
}
```

```js
const disp = levelGroups.map(l => makeSections(l, groupedCheckTypes))
```

```js
display(html`${disp}`)
```

```js
const filteredManifestAndWorkflows = {
    organization: {
        repositories: {
            ...githubManifestAndWorkflows.organization.repositories,
            nodes: githubManifestAndWorkflows.organization.repositories.nodes.filter((n) => toggleExcludeArchived ? n.isArchived === false : true),

        }
    }
}
```

```js
const nodesWithManifest = filteredManifestAndWorkflows.organization.repositories.nodes.filter((n) => n.manifest).map((n) => ({
    ...n,
    manifest: {
        ...n.manifest,
        text: {
            ...n.manifest.text,
            version: n?.manifest?.text?.$schema?.match(/tags\/v(.+?)\/schemas\/schema\.json/)?.[1]
        }
    }
}))
```

```js
const nodesByServiceTag = Object.groupBy(
    nodesWithManifest.flatMap((n) => (n.manifest.text.services ?? []).map((s) => ({ ...n, serviceTag: s.product }))),
    (n) => n.serviceTag
)
```



```js
const flattenedServices = Object.entries(nodesByServiceTag).flatMap(([tag, nodes]) =>
    nodes.map((n) => ({ ...n, service__repo: `${tag} / ${n.name}` }))
)
```

```js
const serviceItems = Object.keys(nodesByServiceTag).reduce((acc, tag) =>
        acc.concat(nodesByServiceTag[tag].map((n) => ({
            service__repo: `${tag} / ${n.name}`,
            ...n,
            ...(n.manifest.text.services ?? []).find((s) => s.product === tag)
        }))),
    [])
```



```js
const flattenedQualityGates = serviceItems.flatMap(({ checks: qg, ...rest }) =>
    (qg ?? []).map((gate) => ({ ...rest, ...gate }))
)
```


```js
const flattenedCheckTypes = flattenedQualityGates.flatMap(({ checkTypes: ct, ...rest }) =>
    (ct ?? []).map((checkType) => ({ ...rest, "check-type": checkType }))
)
```

---

# Explorer

```js
const explorerChecks = view(Inputs.checkbox(allCheckTypes, {label: "Check Types", value: allCheckTypes}));
```

```js
display(Plot.plot({
    marginLeft: 350,
    marginBottom: 200,
    marginTop: 200,
    x: { domain: explorerChecks.sort() },
    y: { domain: flattenedCheckTypes.map((fc) => fc.service__repo)},
    marks: [
        Plot.axisX({anchor: "top", tickRotate: -90}),
        Plot.axisX({anchor: "bottom", label: null, tickRotate: -90}),
        Plot.cell(
            flattenedCheckTypes,
            { x: "check-type", y: "service__repo", fill: "check-type" }
        )
    ]
}))
```

---

# Repository count per service-tag

```js
display(Plot.plot({
    marginLeft: 200,
    color: {
        type: "categorical",
        scheme: "observable10",
        legend: true
    },
    x: { label: "Count" },
    y: { label: "Service Tag" },
    marks: [
        Plot.barX(
            Object.entries(nodesByServiceTag).map(([tag, nodes]) => ({ tag, count: nodes.length })),
            { x: "count", y: "tag", sort: { y: "y" }, fill: "count" }
        ),
        Plot.gridX({ stroke: "white" })
    ]
}))
```
