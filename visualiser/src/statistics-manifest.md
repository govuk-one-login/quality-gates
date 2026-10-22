# Statistics - Manifest

```js
import semver from "semver"
```

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
      ...n?.manifest?.text,
      version: n?.manifest?.text?.$schema?.match(/tags\/v(.+?)\/schemas\/schema\.json/)?.[1]
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
const versions = _.uniq(_.map(nodesWithManifest, (n) => n.manifest.text.version))
semver.sort(versions)
```

<div class="grid grid-cols-2">
<div>

```js
const selections = view(Plot.plot({
    color: {
        type: "categorical",
        scheme: "tableau10",
        legend: true,
        domain: versions
    },
  marks: [
    Plot.barY(
      nodesWithManifest,
      Plot.groupX(
          { y: "count" }, { x: (n) => n.pod.value, fill: (n) => n.manifest.text.version })
    ),

      Plot.barY(
          nodesWithManifest,
          Plot.pointer(
              Plot.groupX(
                  {y: "count"},
                  {
                      x: (n) => n.pod.value,
                      fill: (n) => n.manifest.text.version,
                      // Aesthetic visual feedback when a bar is selected or hovered
                      stroke: "black",
                      strokeWidth: 2
                  }
              )
          )
      ),
      Plot.ruleY([0])
  ]
}))
```

</div>

<div>

```js
Inputs.table(selections || [], {
    columns: [
        "name",
        "manifest"
    ],
    format: {
        "manifest": (d) => d.text.version
    }
})
```

</div>
</div>
