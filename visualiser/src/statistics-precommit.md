# Statistics - Pre Commit Config

```js
import { invertNodesToHooks } from "./components/pre-commit-config.js"
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
const nodesWithPreCommitConfig = nodes.filter((n) => n.preCommitConfig).map((n) => ({
  ...n
  // manifest: {
  //   ...n.manifest,
  //   text: {
  //     ...n.manifest.text,
  //     version: n.manifest.text.$schema.match(/tags\/v(.+?)\/schemas\/schema\.json/)?.[1]
  //   }
  // }
}))

// display(nodesWithManifest)
```
## .pre-commit-config.yaml

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
            Plot.groupY({x: "count"}, {y: (n) => n.preCommitConfig !== null, fill: (n) => n.preCommitConfig !== null})
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
            Plot.groupY({x: "count"}, {y: (n) => n.preCommitConfig !== null, fill: (n) => n.preCommitConfig !== null})
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
            Plot.groupY({x: "count"}, {y: (n) => n.pod.value, fill: (n) => n.preCommitConfig !== null})
        )
    ]
})
```


### Pre Commit Plugin Usages

```js
// display(nodesWithPreCommitConfig)
// display(JSON.stringify(nodesWithPreCommitConfig[5], null, 2))
```


```js
const hooks = nodesWithPreCommitConfig.flatMap(invertNodesToHooks)
```

```js
display(hooks)
```
### Pre-Commit Plugin Usage
```js
Plot.plot({
    marginLeft: 200,
    color: {
        type: "categorical",
        scheme: "pastel1",
        legend: true
    },
  marks: [
    Plot.barX(
        hooks,
          Plot.groupY({ x: "count" }, { y: (n) => n.id, fill: (n) => {
                  if (n.preCommitReposProperties.repo === "local") {
                      return "local"
                  } else if(n.preCommitReposProperties.repo.startsWith("https://github.com/govuk-one-login")) {
                      return "gov-uk-one-login"
                  } else if(n.preCommitReposProperties.repo.startsWith("https://github.com/alphagov")) {
                      return "alphagov"
                  } else if(n.preCommitReposProperties.repo.startsWith("https://github.com/pre-commit")) {
                      return "pre-commit"
                  }

                  return "external"
              }
          })
    )
  ]
})
```

```js
const hookSources = hooks.map((h) => {
    const path = URL.parse(h.preCommitReposProperties.repo)?.pathname
    if(path) {
        return path.split("/")[1]
    }

    return "(local)"
}).sort()
```

```js
// display(hookSources)
```
```js
Plot.plot({
    marginLeft: 200,
    color: {
        type: "categorical",
        scheme: "greys",
        legend: false
    },
  marks: [
    Plot.barX(
        hookSources,
        Plot.groupY({ x: "count" }, { y: (n) => n, fill: "n"})
    )
      // Plot.text(
      //     hooks,
      //     Plot.groupY({ x: "count" }, { y: (n) => n.id, z: "count", text: "count", rotate: 90})
      // )
  ]
})
```
