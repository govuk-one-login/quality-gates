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
const allCheckTypes = currentSchema["$defs"]["check-type"].items.oneOf.flatMap((oneOf) => oneOf.enum)
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
      version: n.manifest.text.$schema.match(/tags\/v(.+?)\/schemas\/schema\.json/)?.[1]
    }
  }
}))
```

```js
const nodesByServiceTag = Object.groupBy(
  nodesWithManifest.flatMap((n) => n.manifest.text.services.map((s) => ({ ...n, serviceTag: s["service-tag"] }))),
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
    ...n.manifest.text.services.find((s) => s["service-tag"] === tag)
  }))),
[])
```

```js
const flattenedQualityGates = serviceItems.flatMap(({ "quality-gates": qg, ...rest }) =>
  qg.map((gate) => ({ ...rest, ...gate }))
)
```

```js
const flattenedCheckTypes = flattenedQualityGates.flatMap(({ "check-types": ct, ...rest }) =>
  ct.map((checkType) => ({ ...rest, "check-type": checkType }))
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
