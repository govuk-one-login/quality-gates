# Statistics - GitHub Actions


```js
const toggleExcludeArchived = view(Inputs.toggle({label: "Exclude Archived", value: true}));
```

```js
import { githubActionCounts, isLocalOrgOrExternal } from "./components/graph-data-github-actions.js"
```

```js
function sparkbar(max) {
  return (x) => htl.html`<div style="
    background: var(--theme-green);
    color: black;
    font: 10px/1.6 var(--sans-serif);
    width: ${100 * x / max}%;
    float: right;
    padding-right: 3px;
    box-sizing: border-box;
    overflow: visible;
    display: flex;
    justify-content: end;">${x.toLocaleString("en-US")}`
}
```

```js
const githubManifestAndWorkflows = FileAttachment("./data/github-graphql-manifest-workflows.json").json();
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
const stats = githubActionCounts(filteredManifestAndWorkflows).map((gha) => ({
    ...gha,
    type: isLocalOrgOrExternal(gha.name)
  })
)
```


<div class="grid">
<div class="card">
<h1>Explorer</h1>

```js
const versionsSearch = view(Inputs.search(stats, {placeholder: "Search actions…"}));
```

```js
const statsSelection = view(Inputs.table(versionsSearch, {
    columns: ["name", "count", "type"],
    header: {
      name: "Name"
    },
    width: {
        name: 180,
        count: 100,
        type: 10
    },
    format: {
        count: sparkbar(d3.max(stats, d => d.count)),
    },
    sort: "count", reverse: true
}))
```


</div>
</div>


<div class="grid grid-cols-2">
  <div class="card">
    <h1>Actions</h1>

```js
const actionsSelection = view(Inputs.table(statsSelection, {
    columns: ["name", "count"],
    header: {
      name: "Name"
    },
    format: {
        count: sparkbar(d3.max(stats, d => d.count)),
    },
}))
```

```js
const selectedActions = actionsSelection.flatMap(action => action.versions.map((v)=> ({...v, name: action.name})))
```

</div>
  <div class="card">
    <h1>Versions</h1>

```js
const versionsSelection = view(Inputs.table(selectedActions, {
    columns: ["name", "version", "count"],
    header: {
      version: "Version"
    },
    format: {
        count: sparkbar(d3.max(selectedActions, d => d.count)),
    },
    sort: "count", reverse: true
}))

```
  </div>

  <div class="card grid-colspan-2">
    <h1>Repositories</h1>

```js
const selectedActionsSources = versionsSelection.flatMap(version => version.sources.map(source => ({name: version.name, version: version.version, ...source})))
```


```js
Inputs.table(selectedActionsSources, {
    columns: ["name", "version", "repo", "filePath"],
    header: {
      version: "Version"
    },
    sort: "count", reverse: true
})
```

  </div>
</div>

```js

```


## Popularity

<div class="grid grid-cols-3">
  <div class="card">
    <h1>Local</h1>
    <h2>.github</h2>
    <h3>${stats.filter((s) => isLocalOrgOrExternal(s.name) === "local").length}</h3>

${Plot.plot({
  height: stats.filter((s) => isLocalOrgOrExternal(s.name) === "local").length * 20,
  marginLeft: 450,
  style: {
    fontSize: 20
  },
  marks: [
    Plot.barX(
        stats.filter((s) => isLocalOrgOrExternal(s.name) === "local") ,
        { y: "name", x: "count" }
    )
  ]
})}

  </div>
  <div class="card">
    <h1>Org</h1>
    <h2>govuk-one-login / alphagov</h2>
    <h3>${stats.filter((s) => isLocalOrgOrExternal(s.name) === "org").length}</h3>


${Plot.plot({
  height: stats.filter((s) => isLocalOrgOrExternal(s.name) === "org").length * 20,
  marginLeft: 450,
  style: {
    fontSize: 20
  },
    marks: [
    Plot.barX(
        stats.filter((s) => isLocalOrgOrExternal(s.name) === "org") ,
        { y: "name", x: "count" }
    )
  ]
})}


  </div>
  <div class="card">
    <h1>External</h1>
    <h2>all others</h2>
    <h3>${stats.filter((s) => isLocalOrgOrExternal(s.name) === "external").length}</h3>


${Plot.plot({
  height: stats.filter((s) => isLocalOrgOrExternal(s.name) === "external").length * 20,
  marginLeft: 450,
  style: {
    fontSize: 20
  },
    marks: [
    Plot.barX(
        stats.filter((s) => isLocalOrgOrExternal(s.name) === "external") ,
        { y: "name", x: "count" }
    )
  ]
})}

  </div>
</div>
