# Statistics - Checks (WIP)

```js
const githubManifestAndWorkflows = FileAttachment("./data/github-graphql-manifest-workflows.json").json();
```

```js
const toggleExcludeArchived = view(Inputs.toggle({label: "Exclude Archived", value: true}));
```

```js
const toggleProductionOnly = view(Inputs.toggle({label: "Production Only", value: true}));
```

```js
const currentSchema = FileAttachment("./data/schema.json").json();
```
```js
const allCheckTypes = currentSchema["$defs"]["check-type"].items.oneOf.flatMap((oneOf) => oneOf.enum)
```

```js
const nodes = githubManifestAndWorkflows.organization.repositories.nodes
    .filter((n) => toggleExcludeArchived ? n.isArchived === false : true)
    .filter((n) => toggleProductionOnly ? n.productionAssets.value === "true" : true )
```

```js
const nodesWithManifest = nodes
    .filter((n) => n.manifest).map((n) => ({
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
// display(nodesWithManifest)
```
```js
// display(nodesWithManifest[9])
// display(JSON.stringify(nodesWithManifest[9]))
```


<div class="grid">
<div class="card">
<h1>Explorer</h1>

```js
const stats = nodesWithManifest.flatMap((node) => {
  const workflowsByName = Object.fromEntries(
    (node.workflows?.entries ?? []).map(({ name, object }) => [
      name.replace(/\.ya?ml$/, ""),
      object.text.jobs
    ])
  );

  return node.manifest.text.services.flatMap((service) =>
    service["quality-gates"].flatMap((gate) => {
      const workflowKey = gate.config.file
        .replace(".github/workflows/", "")
        .replace(/\.ya?ml$/, "");
      const jobs = workflowsByName[workflowKey];
      const jobKey = gate.config.path?.replace("jobs.", "");
      const job = jobs?.[jobKey];
      return gate["check-types"].map((checkType) => ({ ...node, ...gate, ...gate.config, repo: node.name, service: service["service-tag"], job, checkType, stepsCount: job?.steps?.length }));
    })
  );
})
```

```js
// display(stats)
```

---

```js
const versionsSearch = view(Inputs.search(stats, {placeholder: "Search actions…", filter: (query) => (d) => d.name.includes(query)}));
```

```js
const statsSelection = view(Inputs.table(versionsSearch, {
    columns: ["name", "checkType", "file", "path", "stepsCount"],
    header: {
      name: "Name",
      "checkType":  "check type"
    },
    format: {
        "file": (s) => s.split("workflows/")[1]
    },
    multiple: false,
    width: {
        name: 180,
        count: 100,
        type: 10
    },
    sort: "count", reverse: true
}))
```

```js
Inputs.table(statsSelection?.job?.steps, {
    columns: ["name", "uses"]
} )
```

</div>
</div>


<div class="grid grid-cols-2">
<div class="card">

```js
display(Plot.plot({
  marginLeft: 160,
  x: { label: "Steps count",  },
  y: { label: "Check type" },
  color: { legend: true, scheme: "reds" },
  marks: [
    Plot.barX(stats.filter(d => d.stepsCount != null).sort((a, b) => a.stepsCount - b.stepsCount), Plot.groupY({ x: "sum" }, { x: "stepsCount", y: "checkType", fill: "stepsCount" }))
  ]
}))
```

</div>

<div class="card">

```js
display(Plot.plot({
  marginLeft: 160,
  x: { label: "Steps count",   },
  y: { label: "Check type"},
  color: { legend: true, scheme: "cool", },
  marks: [
    Plot.cell(stats.filter(d => d.stepsCount != null).sort((a, b) => b.stepsCount - a.stepsCount), Plot.group({ fill: "count" }, { x: "stepsCount", y: "checkType" }))
  ]
}))
```

</div>
</div>
