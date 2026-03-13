# GitHub Actions Graph Explorer


```js
import { createGraph, renderAsFlowChart } from "./components/graph.js"
```

```js
const allGithubActions = FileAttachment("./data/github-actions.json").json();
```

```js
const flattened = _.flatMapDeep(allGithubActions)
```


```js
const repositoryBranchProtection = FileAttachment("./data/github-branch-protection.json").json();
```

```js
const repositoryName = view(Inputs.select(_.uniq(_.map(flattened, "repo")), {value: "", label: "Repository name"}))
```

```js
const repositoryActions =  _.filter(flattened, {"repo": repositoryName})
```

```js
const graph = createGraph(repositoryActions)
```

```js
const graphAsFlowChart = renderAsFlowChart(graph, `${repositoryActions[0].owner}/${repositoryActions[0].repo}`)
```

## ${repositoryActions[0].owner}/${repositoryActions[0].repo}


${mermaid`${graphAsFlowChart}`}
