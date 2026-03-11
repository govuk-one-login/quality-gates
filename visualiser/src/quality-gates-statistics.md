# GitHub Quality Gates Statistics

```js
const githubManifestAndWorkflows = FileAttachment("./data/github-graphql-manifest-workflows.json").json();
```

```js
// display(githubManifestAndWorkflows)
```

```js
const nodes = githubManifestAndWorkflows.organization.repositories.nodes

// display(nodes)
```

```js
const nodesWithProductionAssets = nodes.filter((n) => n.productionAssets.value === "true")

// display(nodesWithProductionAssets)
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

<p></p>

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



---

```js
const usesCounts = nodes
  .flatMap(n => n.workflows?.entries ?? [])
  .flatMap(e => {
    const jobs = Object.values(e.object?.text?.jobs ?? {});
    return [
      ...jobs.filter(j => j.uses).map(j => j.uses),
      ...jobs.flatMap(j => (j.steps ?? []).filter(s => s.uses).map(s => s.uses))
    ];
  })
  .reduce((acc, uses) => ({ ...acc, [uses]: (acc[uses] ?? 0) + 1 }), {});
```


```js
// display(usesCounts)
```

```js
const totalUsesCounts = nodesWithManifest
  .flatMap(n => n.workflows?.entries ?? [])
  .flatMap(e => {
    const jobs = Object.values(e.object?.text?.jobs ?? {});
    return [
      ...jobs.filter(j => j.uses).map(j => j.uses),
      ...jobs.flatMap(j => (j.steps ?? []).filter(s => s.uses).map(s => s.uses))
    ];
  })
  .map(uses => uses.replace(/@.*$/, ""))
  .reduce((acc, uses) => ({ ...acc, [uses]: (acc[uses] ?? 0) + 1 }), {});
```


```js
const simpleTotalUsesCounts = Object.entries(usesCounts).reduce((acc, [uses, count]) => {
  const key = uses.replace(/@.*$/, "");
  return { ...acc, [key]: (acc[key] ?? 0) + count };
}, {});
```

```js
// display(simpleTotalUsesCounts)
```

```js
const govukOneLoginUsesCounts = Object.fromEntries(
  Object.entries(simpleTotalUsesCounts).filter(([k]) => k.startsWith("govuk-one-login/") || k.startsWith("alphagov/"))
);
```

```js
const localUsesCounts = Object.fromEntries(
  Object.entries(simpleTotalUsesCounts).filter(([k]) => k.includes("./"))
);
```

```js
const externalUsesCounts = Object.fromEntries(
    Object.entries(simpleTotalUsesCounts).filter(([k]) => !k.includes("./") && !k.startsWith("govuk-one-login/") && !k.startsWith("alphagov/"))
);
```

```js
//display(govukOneLoginUsesCounts)
//display(localUsesCounts)
//display(externalUsesCounts)
```

## Popularity

<div class="grid grid-cols-3">
  <div class="card">
    <h1>Local</h1>
    <h2>.github</h2>

${Plot.plot({
  marginLeft: 500,
  marks: [
    Plot.barX(
      Object.entries(localUsesCounts),
        { y: ([k]) => k.replace(/^\.\/.github\/(workflows|actions)\//, ""), x: ([, v]) => v, sort: { y: "-x" } }
    )
  ]
})}
  </div>
  <div class="card">
    <h1>Org</h1>
    <h2>govuk-one-login / alphagov</h2>

${Plot.plot({
  marginLeft: 500,
  marks: [
    Plot.barX(
      Object.entries(govukOneLoginUsesCounts),
        { y: ([k]) => k.replace(/^\.\/.github\/(workflows|actions)\//, ""), x: ([, v]) => v, sort: { y: "-x" } }
    )
  ]
})}

  </div>
  <div class="card">
    <h1>External</h1>
    <h2>all others</h2>

${Plot.plot({
  marginLeft: 500,
  marks: [
    Plot.barX(
      Object.entries(externalUsesCounts),
        { y: ([k]) => k.replace(/^\.\/.github\/(workflows|actions)\//, ""), x: ([, v]) => v, sort: { y: "-x" } }
    )
  ]
})}
  </div>
</div>

```js

```
