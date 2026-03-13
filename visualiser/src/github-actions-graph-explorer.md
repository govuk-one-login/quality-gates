# GitHub Actions Graph Explorer

```js
import { createGraph, renderAsFlowChart } from "./components/graph.js"
```

```js
const githubManifestAndWorkflows = FileAttachment("./data/github-graphql-manifest-workflows.json").json();
```


```js
const repositoryName = view(Inputs.select(_.uniq(_.map(githubManifestAndWorkflows.organization.repositories.nodes, "name")).sort(), {value: "", label: "Repository name"}))
```

```js
const selectedRepository = githubManifestAndWorkflows.organization.repositories.nodes.filter((n) => n.name === repositoryName)[0]
const repositoryActions = selectedRepository.workflows.entries.map((w) => ({
    owner: selectedRepository.owner.login,
    repo: selectedRepository.name,
    filename: w.name,
    ...w.object.text
}))
```

```js
const graph = createGraph(repositoryActions)
```

```js
const graphAsFlowChart = renderAsFlowChart(graph, `${repositoryActions[0].owner}/${repositoryActions[0].repo}`)
```

${mermaid`${graphAsFlowChart}`}
