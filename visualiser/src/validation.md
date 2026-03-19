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
