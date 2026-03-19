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
const checkTypeRepoView = view(Inputs.table(gatesWithmismatchedCheckTypes, {
    columns: ["name", "mismatchedCheckTypes"],
    multiple: false
}))
```

```js
function getQualityGatesForRepo(name) {
    const node = nodesWithManifest.find((n) => n.name === name);
    return node?.manifest.text.services.flatMap((s) =>
        s["quality-gates"].map((g) => ({ "service-tag": s["service-tag"], ...g }))
    ) ?? [];
}
```

```js
Inputs.table(
    getQualityGatesForRepo(checkTypeRepoView?.name),
    { columns: ["service-tag", "phase", "provider", "check-types"] })
```
