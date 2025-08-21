# GitHub Actions Graph


```js
import { createGraph, renderAsFlowChart } from "./components/graph.js"
```

```js
const repositoryActions = FileAttachment("./data/github-actions.json").json();
```

```js
const repositoryBranchProtection = FileAttachment("./data/github-branch-protection.json").json();
```


```js
const graph = createGraph(repositoryActions.github_action_files)
```

```js
const graphAsFlowChart = renderAsFlowChart(graph, `${repositoryActions.owner}/${repositoryActions.repo}`)
```

## ${repositoryActions.owner}/${repositoryActions.repo}

${mermaid`${graphAsFlowChart}`}
