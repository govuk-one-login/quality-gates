# Implementation Levels

```js
const toggleExcludeArchived = view(Inputs.toggle({label: "Exclude Archived", value: true}));
```
```js
const githubManifestAndWorkflows = FileAttachment("./data/github-graphql-manifest-workflows.json").json();
```

```js
const currentSchema = FileAttachment("./data/schema.json").json();
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
  nodes.map((n) => ({ ...n, service__repo: `${tag}/${n.name}` }))
)
```

```js
const serviceItems = Object.keys(nodesByServiceTag).reduce((acc, tag) =>
  acc.concat(nodesByServiceTag[tag].map((n) => ({
    service__repo: `${tag}/${n.name}`,
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

```js
const allCheckTypes = currentSchema["$defs"]["check-type"].items.oneOf.flatMap((oneOf) => oneOf.enum)
```

```js
const preMergeChecks = view(Inputs.checkbox(allCheckTypes, {label: "Check Types", value: allCheckTypes}));
```

# Pre-Merge
```js
display(Plot.plot({
  marginLeft: 350,
  marginBottom: 200,
  marginTop: 200,
  x: { domain: preMergeChecks.sort() },
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


# Pre-Upload

```js
const preUploadChecks = view(Inputs.checkbox(allCheckTypes, {label: "Check Types", value: allCheckTypes}));
```

```js
display(Plot.plot({
  marginLeft: 350,
  marginBottom: 200,
  marginTop: 200,
  x: { domain: preUploadChecks.sort() },
  y: { domain: flattenedCheckTypes.map((fc) => fc.service__repo)},
  marks: [
      Plot.axisX({anchor: "top", tickRotate: -90}),
      Plot.axisX({anchor: "bottom", label: null, tickRotate: -90}),
      Plot.cell(
      flattenedCheckTypes.filter(c => c.phase === "pre-upload"),
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
