# Statistics - Manifest

```js
const githubManifestAndWorkflows = FileAttachment("./data/github-graphql-manifest-workflows.json").json();
```

```js
const nodes = githubManifestAndWorkflows.organization.repositories.nodes.filter((n) => toggleExcludeArchived ? n.isArchived === false : true)
```

```js
const nodesWithProductionAssets = nodes.filter((n) => n.productionAssets.value === "true")
```

```js
const nodesWithManifest = nodes.filter((n) => n.manifest).map((n) => ({
  ...n,
  manifest: {
    ...n.manifest,
    text: {
      ...n.manifest.text,
      version: n.manifest.text.$schema.match(/tags\/v(.+?)\/schemas\/schema\.json/)?.[1]
    }
  }
}))

// display(nodesWithManifest)
```
## Manifests

```js
const toggleExcludeArchived = view(Inputs.toggle({label: "Exclude Archived", value: true}));
```

### All repos

```js
Plot.plot({
    color: {
        type: "categorical",
        scheme: "paired",
        legend: true
    },
    x: {domain: [0, nodes.length]},
    grid: true,
    marginLeft: 150,
    marks: [
        Plot.barX(
            nodes,
            Plot.groupY({x: "count"}, {y: (n) => n.manifest !== null, fill: (n) => n.manifest !== null})
        )
    ]
})
```

### Production Assets
```js
Plot.plot({
    color: {
        type: "categorical",
        scheme: "paired",
        legend: true
    },
    x: {domain: [0, nodes.length]},
    grid: true,
    marginLeft: 150,
    marks: [
        Plot.barX(
            nodesWithProductionAssets,
            Plot.groupY({x: "count"}, {y: (n) => n.manifest !== null, fill: (n) => n.manifest !== null})
        )
    ]
})
```
### Production Assets by Pod
```js
Plot.plot({
    color: {
        type: "categorical",
        scheme: "paired",
        legend: true
    },
    marginLeft: 150,
    grid: true,
    marks: [
        Plot.barX(
            nodesWithProductionAssets,
            Plot.groupY({x: "count"}, {y: (n) => n.pod.value, fill: (n) => n.manifest !== null})
        )
    ]
})
```

### Versions of Manifests
```js
Plot.plot({
    color: {
        type: "categorical",
        scheme: "observable10",
        legend: true
    },
  marks: [
    Plot.barY(
      nodesWithManifest,
      Plot.groupX({ y: "count" }, { x: (n) => n.pod.value, fill: (n) => n.manifest.text.version })
    )
  ]
})
```
