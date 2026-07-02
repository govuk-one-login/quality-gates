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
const allCheckTypes = currentSchema["$defs"]["check-type"].enum
```

```js
import { parseCheckPath } from "./components/jsonpath.js";
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
    return (node.manifest.text.services ?? []).flatMap((s) =>
        (s.checks ?? [])
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
    return (node.manifest.text.services ?? []).flatMap((s) =>
        (s.checks ?? [])
            .filter((g) => (g.checkTypes ?? []).some((t) => !known.has(t)))
            .map((g) => ({ ...rest, ...g, mismatchedCheckTypes: (g.checkTypes ?? []).filter((t) => !known.has(t)).join(", ") }))
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
    return (node?.manifest.text.services ?? []).flatMap((s) =>
        (s.checks ?? []).map((g) => ({ "product": s.product, ...g, "config.file": g.config.file, "config.name": g.config.name, "config.path": g.config.path, name: node.name, "pod.value": node.pod?.value, "teamResponsible.value": node.teamResponsible?.value }))
    );
}
```

```js
Inputs.table(
    getQualityGatesForRepo(checkTypeRepoView?.name),
    { columns: ["name", "pod.value", "teamResponsible.value", "product", "phase", "provider", "checkTypes", "config.file", "config.name", "config.path"] })
```

---

## Mismatched Jobs

```js
function findGatesWithmismatchedJobs(node) {
    const workflowJobs = new Map(
        node.workflows.entries.map(({ name, object }) => [name, object.text.jobs ?? {}])
    );
    const { manifest, workflows, ...rest } = node;
    return (node.manifest.text.services ?? []).flatMap((s) =>
        (s.checks ?? [])
            .filter((g) => g.provider === "GitHub" && g.config.path)
            .flatMap((g) => {
                const parsed = parseCheckPath(g.config.path);
                if (!parsed.valid) return [];
                const filename = g.config.file.replace(".github/workflows/", "");
                const jobs = workflowJobs.get(filename);
                if (!jobs) return [];
                if (!(parsed.job in jobs)) {
                    return [{ ...rest, ...g, mismatchedJobNames: parsed.job }];
                }
                if (parsed.step) {
                    const steps = jobs[parsed.job].steps ?? [];
                    const match = steps.some((st) => st[parsed.step.by] === parsed.step.value);
                    if (!match) return [{ ...rest, ...g, mismatchedJobNames: `${parsed.job} → step ${parsed.step.by}='${parsed.step.value}'` }];
                }
                return [];
            })
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

---

## Invalid JSONPath Syntax

```js
function findGatesWithInvalidPaths(node) {
    const { manifest, workflows, ...rest } = node;
    return (node.manifest.text.services ?? []).flatMap((s) =>
        (s.checks ?? [])
            .filter((g) => g.provider === "GitHub" && g.config.path && !parseCheckPath(g.config.path).valid)
            .map((g) => ({ ...rest, ...g, invalidPath: g.config.path }))
    );
}

const gatesWithInvalidPaths = nodesWithManifest.flatMap(findGatesWithInvalidPaths);
```

#### ${gatesWithInvalidPaths.length} gates with invalid JSONPath syntax

```js
Plot.plot({
    marginLeft: 150,
    color: {scheme: "observable10"},
    marks: [Plot.barX(gatesWithInvalidPaths, Plot.groupY({x: "count", fill: "count"}, {y: d => d.pod.value, sort: {y: "x", reverse: true}}))]
})
```

```js
Plot.plot({
    marginLeft: 150,
    color: {scheme: "observable10"},
    marks: [Plot.barX(gatesWithInvalidPaths, Plot.groupY({x: "count", fill: "count"}, {y: d => d.teamResponsible.value, sort: {y: "x", reverse: true}}))]
})
```

```js
Plot.plot({
    marginLeft: 200,
    color: {scheme: "observable10"},
    marks: [Plot.barX(gatesWithInvalidPaths, Plot.groupY({x: "count", fill: "count"}, {y: "name", sort: {y: "x", reverse: true}}))]
})
```

```js
view(Inputs.table(gatesWithInvalidPaths, {
    columns: ["name", "invalidPath"],
    multiple: false
}))
```
