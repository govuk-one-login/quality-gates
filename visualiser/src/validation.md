# Validation

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
function findMissingWorkflows(node) {
    const workflowNames = new Set(node.workflows.entries.map((e) => e.name));
    const { manifest, workflows, ...rest } = node;
    return node.manifest.text.services.flatMap((s) =>
        s["quality-gates"]
            .filter((g) => !workflowNames.has(g.config.file.replace(".github/workflows/", "")))
            .map((g) => ({ ...rest, ...g, file: g.config.file.replace(".github/workflows/", "") }))
    );
}

const missingWorkflows = nodesWithManifest.flatMap(findMissingWorkflows);
```

## Mismatched Configurations

#### ${missingWorkflows.length} mismatched configurations

```js
Plot.plot({
    marginLeft: 150,
    color: {scheme: "observable10"},
    marks: [Plot.barX(missingWorkflows, Plot.groupY({x: "count", fill: "count"}, {y: d => d.pod.value, sort: {y: "x", reverse: true}}))]
})
```

```js
Plot.plot({
    marginLeft: 150,
    color: {scheme: "observable10"},
    marks: [Plot.barX(missingWorkflows, Plot.groupY({x: "count", fill: "count"}, {y: d => d.teamResponsible.value, sort: {y: "x", reverse: true}}))]
})
```

```js
Plot.plot({
    marginLeft: 200,
    color: {scheme: "observable10"},
    marks: [Plot.barX(missingWorkflows, Plot.groupY({x: "count", fill: "count"}, {y: "name", sort: {y: "x", reverse: true}}))]
})
```

```js
const repoView = view(Inputs.table(missingWorkflows, {
    columns: ["name", "file"],
    multiple: false
}))
```

```js
function getWorkflowsForRepo(name) {
    const node = nodesWithManifest.find((n) => n.name === name);
    return node?.workflows.entries.map(({ name: filename, object }) => ({ filename, ...object.text })) ?? [];
}

display(Inputs.table(getWorkflowsForRepo(repoView?.name), { columns: ["filename"] }));
```

---

## Mismatched Check Types

```js
function findGatesWithmismatchedCheckTypes(node) {
    const known = new Set(allCheckTypes);
    const { manifest, workflows, ...rest } = node;
    return node.manifest.text.services.flatMap((s) =>
        s["quality-gates"]
            .filter((g) => g["check-types"].some((t) => !known.has(t)))
            .map((g) => ({ ...rest, ...g, mismatchedCheckTypes: g["check-types"].filter((t) => !known.has(t)).join(", ") }))
    );
}

const gatesWithmismatchedCheckTypes = nodesWithManifest.flatMap(findGatesWithmismatchedCheckTypes);
```

#### ${gatesWithmismatchedCheckTypes.length} gates with mismatched check types

```js
Plot.plot({
    marginLeft: 150,
    color: {scheme: "observable10"},
    marks: [Plot.barX(gatesWithmismatchedCheckTypes, Plot.groupY({x: "count", fill: "count"}, {y: d => d.pod.value, sort: {y: "x", reverse: true}}))]
})
```

```js
Plot.plot({
    marginLeft: 150,
    color: {scheme: "observable10"},
    marks: [Plot.barX(gatesWithmismatchedCheckTypes, Plot.groupY({x: "count", fill: "count"}, {y: d => d.teamResponsible.value, sort: {y: "x", reverse: true}}))]
})
```

```js
Plot.plot({
    marginLeft: 200,
    color: {scheme: "observable10"},
    marks: [Plot.barX(gatesWithmismatchedCheckTypes, Plot.groupY({x: "count", fill: "count"}, {y: "name", sort: {y: "x", reverse: true}}))]
})
```

```js
const checkTypeRepoView = view(Inputs.table(gatesWithmismatchedCheckTypes, {
    columns: ["name", "mismatchedCheckTypes"],
    multiple: false
}))
```

```js
function getQualityGatesForRepo(name) {
    const node = nodesWithManifest.find((n) => n.name === name);
    return node?.manifest.text.services.flatMap((s) =>
        s["quality-gates"].map((g) => ({ "service-tag": s["service-tag"], ...g, "config.file": g.config.file, "config.name": g.config.name, "config.path": g.config.path, name: node.name, "pod.value": node.pod?.value, "teamResponsible.value": node.teamResponsible?.value }))
    ) ?? [];
}
```

```js
Inputs.table(
    getQualityGatesForRepo(checkTypeRepoView?.name),
    { columns: ["name", "pod.value", "teamResponsible.value", "service-tag", "phase", "provider", "check-types", "config.file", "config.name", "config.path"] })
```

---

## Mismatched Jobs

```js
function findGatesWithmismatchedJobs(node) {
    const workflowJobs = new Map(
        node.workflows.entries.map(({ name, object }) => [name, new Set(Object.keys(object.text.jobs ?? {}))])
    );
    const { manifest, workflows, ...rest } = node;
    return node.manifest.text.services.flatMap((s) =>
        s["quality-gates"]
            .filter((g) => {
                const jobKey = g.config.path?.split(".")[1];
                const filename = g.config.file.replace(".github/workflows/", "");
                return jobKey && !workflowJobs.get(filename)?.has(jobKey);
            })
            .map((g) => ({ ...rest, ...g, mismatchedJobNames: g.config.path?.split(".")[1] }))
    );
}

const gatesWithmismatchedJobs = nodesWithManifest.flatMap(findGatesWithmismatchedJobs);
```

#### ${gatesWithmismatchedJobs.length} gates with mismatched jobs

```js
Plot.plot({
    marginLeft: 150,
    color: {scheme: "observable10"},
    marks: [Plot.barX(gatesWithmismatchedJobs, Plot.groupY({x: "count", fill: "count"}, {y: d => d.pod.value, sort: {y: "x", reverse: true}}))]
})
```

```js
Plot.plot({
    marginLeft: 150,
    color: {scheme: "observable10"},
    marks: [Plot.barX(gatesWithmismatchedJobs, Plot.groupY({x: "count", fill: "count"}, {y: d => d.teamResponsible.value, sort: {y: "x", reverse: true}}))]
})
```

```js
Plot.plot({
    marginLeft: 200,
    color: {scheme: "observable10"},
    marks: [Plot.barX(gatesWithmismatchedJobs, Plot.groupY({x: "count", fill: "count"}, {y: "name", sort: {y: "x", reverse: true}}))]
})
```

```js
const jobRepoView = view(Inputs.table(gatesWithmismatchedJobs, {
    columns: ["name", "mismatchedJobNames"],
    multiple: false
}))
```

```js
Inputs.table(
    getQualityGatesForRepo(jobRepoView?.name),
    {
        columns: ["name", "config.file", "config.name", "config.path"],
        header: {
            "pod.value": "Pod",
            "teamResponsible.value": "Team",
            "config.file": "file",
            "config.name": "jobName",
            "config.path": "path"
        },
        format: {
            "config.file": (s) => s.split("workflows/")[1]
        }
    })
```
