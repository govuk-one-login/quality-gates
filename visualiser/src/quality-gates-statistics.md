# GitHub Quality Gates GraphQL Statistics


```js
const githubManifestAndWorkflows = FileAttachment("./data/github-graphql-manifest-workflows.json").json();
```

```js
display(githubManifestAndWorkflows)
```

```js
const nodes = githubManifestAndWorkflows.organization.repositories.nodes

display(nodes)
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

```

```js
display(nodesWithManifest)
```

# Repos with Manifests
${Plot.plot({
  marks: [
    Plot.barY(
      [
        { manifest: "present", count: nodes.filter(n => n.manifest !== null).length },
        { manifest: "absent", count: nodes.filter(n => n.manifest === null).length }
      ],
      { x: "manifest", y: "count", fill: "manifest" }
    )
  ]
})}

# Versions of Manifests
```js
Plot.plot({
  marks: [
    Plot.barY(
      nodesWithManifest,
      Plot.groupX({ y: "count" }, { x: (n) => n.manifest.text.version, fill: (n) => n.manifest.text.version })
    )
  ]
})
```
