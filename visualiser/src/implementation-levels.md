---
toc: false
---
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
const includedProjectComponents = FileAttachment("./data/filter-included-project-components.json").json();
```

```js
const isIncluded = (product, component) =>
  includedProjectComponents.length === 0
    ? true
    : includedProjectComponents.some(i => i.product === product && i.component === component);
```

```js
const repositories = githubManifestAndWorkflows
    .organization.repositories.nodes
```

```js
const iconsMapping =  {
    "implemented": {color: "#6a9f58", symbol: "✓"},
    "missing": {color:"#d1615d", symbol: "✗"},
    "notApplicable": {color:"#cccccc", symbol: "-"},
    "empty": {color:"#f9f9f9", symbol: " "},
    "automated": {color: "#a87c9f", symbol: "A"},
    "manual": {color: "#e49444", symbol: "M"},
    "outOfBand": {color: "#f1a2a9", symbol: "O"},
    "multiple": {color: "#85b6b2", symbol: "X"}
}
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
  .filter(s => isIncluded(s.product, s.component))
  .sort((a, b) => a.product.localeCompare(b.product) || a.component.localeCompare(b.component));
```

## By Product

```js
import {renderStatusGrid, buildCheckLevelGrid, buildIntegrationScopeGrid, buildAllChecksGrid, toCheckLevelTableModel, toIntegrationTableModel, toAllChecksTableModel} from "./components/status-grid.js";
```

```js
// Map promotionType to its valid phases from the schema
const phasesByPromotionType = {
  securePipelines: currentSchema["$defs"]["secure-pipelines-phases"].properties.automated.items.properties.phase.enum,
  gitFlow: currentSchema["$defs"]["git-flow-phases"].properties.automated.items.properties.phase.enum,
  library: currentSchema["$defs"]["library-phases"].properties.automated.items.properties.phase.enum,
  other: [
    ...new Set([
      ...currentSchema["$defs"]["secure-pipelines-phases"].properties.automated.items.properties.phase.enum,
      ...currentSchema["$defs"]["git-flow-phases"].properties.automated.items.properties.phase.enum,
      ...currentSchema["$defs"]["library-phases"].properties.automated.items.properties.phase.enum,
    ])
  ]
};
```

```js
const scopes = currentSchema["$defs"]["scope"].enum;
const purposes = currentSchema["$defs"]["purpose"].enum;
```

```js
// Group services by product, attaching repository name and URL
const servicesByProduct = Object.groupBy(
  repositories
    .filter(node => node.manifest?.text?.services)
    .flatMap(node =>
      node.manifest.text.services.map(service => ({
        ...service,
        repository: node.name,
        repositoryUrl: `https://github.com/${node.owner.login}/${node.name}`
      }))
    )
    .filter(service => isIncluded(service.product, service.component)),
  service => service.product
);
```

```js
// Group level definitions by name (e.g. "s-tier", "a-tier", "b-tier")
const levelGroupsByName = Object.groupBy(levelGroups, l => l.name);
const levelNames = [...new Set(levelGroups.map(l => l.name))];
```

```js
function renderDonut(group) {
  const counts = {};
  for (const row of group.rows) {
    for (const cell of row.cells) {
      if (cell.status !== "empty") {
        counts[cell.status] = (counts[cell.status] ?? 0) + 1;
      }
    }
  }
  const data = Object.entries(counts).map(([status, count]) => ({ status, count }));

  const width = 160;
  const height = 160;
  const radius = Math.min(width, height) / 2;
  const innerRadius = radius * 0.55;

  const total = data.reduce((sum, d) => sum + d.count, 0);
  const implemented = (counts["implemented"] ?? 0) + (counts["notApplicable"] ?? 0);
  const pct = total > 0 ? Math.round((implemented / total) * 100) : 0;

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [-width / 2, -height / 2, width, height]);

  if (data.length === 0) {
    // Empty ring for 0%
    svg.append("path")
      .attr("d", d3.arc().innerRadius(innerRadius).outerRadius(radius).startAngle(0).endAngle(2 * Math.PI)())
      .attr("fill", iconsMapping["empty"]?.color ?? "#f9f9f9")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5);
  } else {
    const pie = d3.pie().value(d => d.count).sort(null);
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(radius);
    const arcs = pie(data);

    svg.selectAll("path")
      .data(arcs)
      .join("path")
      .attr("d", arc)
      .attr("fill", d => iconsMapping[d.data.status]?.color ?? "#ccc")
      .attr("stroke", "white")
      .attr("stroke-width", 1.5)
      .append("title")
      .text(d => `${d.data.status}: ${d.data.count}`);
  }

  svg.append("text")
    .attr("text-anchor", "middle")
    .attr("dominant-baseline", "central")
    .attr("font-size", "1.2rem")
    .attr("font-weight", "bold")
    .text(`${pct}%`);

  return svg.node();
}
```

```js
display(html`${Object.keys(servicesByProduct).sort().map(product => {
  const services = servicesByProduct[product];
  const allChecksGrid = buildAllChecksGrid(product, services, allCheckTypes);

  // Build one check-level grid per level-group name
  const checkGridsByLevel = Object.fromEntries(
    levelNames.map(name => [name, buildCheckLevelGrid(product, services, levelGroupsByName[name], phasesByPromotionType)])
  );

  // Determine promotionTypes from the first available grid
  const firstGrid = Object.values(checkGridsByLevel).find(g => g.groups.length > 0) ?? { groups: [] };
  const promotionTypes = firstGrid.groups.map(g => g.subtitle);

  return html`<h3>${product}</h3>${promotionTypes.map(pt => {
    const allChecksGroup = allChecksGrid.groups.find(g => g.subtitle === pt);
    return html`
          <h4>Levels</h4>

      ${levelNames.map(name => {
        const checkGrid = checkGridsByLevel[name];
        const checkGroup = checkGrid.groups.find(g => g.subtitle === pt);
        return checkGroup
          ? html`<h5>${name}</h5>
            <div style="display: flex; align-items: flex-start; gap: 1.5rem;">
              <div>${renderDonut(checkGroup)}</div>
              <div style="flex: 1; overflow-x: auto;">${renderStatusGrid(toCheckLevelTableModel({ ...checkGroup, title: null }, iconsMapping))}</div>
            </div>`
          : "";
      })}
      <h4>all checks</h4>
      ${allChecksGroup ? renderStatusGrid(toAllChecksTableModel({ ...allChecksGroup, title: null }, iconsMapping)) : ""}
    `;
  })}`;
})}`)
```

----

```js
const allCheckTypes = currentSchema["$defs"]["check-type"].enum
```
