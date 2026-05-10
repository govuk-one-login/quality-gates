# Statistics - Checks

```js
import { nodesWithManifests, flattenJobs, flattenQualityGatesJobs, qualityGatesJobsToCheckStepRunUses, cleanupValues } from "./components/manifest-and-workflows.js"
```

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
const preMergeChecks = view(Inputs.checkbox(allCheckTypes, {label: "Check Types", value: allCheckTypes}));
```


```js
const nodes = githubManifestAndWorkflows.organization.repositories.nodes
    .filter((n) => toggleExcludeArchived ? n.isArchived === false : true)
    .filter((n) => toggleProductionOnly ? n.productionAssets.value === "true" : true )
```

```js
const nodesWithManifest = nodesWithManifests(nodes)
```

```js
// display(nodesWithManifest)
// display(JSON.stringify(nodesWithManifest[9]))
```

## Steps: Uses and Runs

```js
const checkStepRunUses1 = qualityGatesJobsToCheckStepRunUses(flattenQualityGatesJobs(nodesWithManifest))
```
```js
const checkStepRunUses = qualityGatesJobsToCheckStepRunUses(flattenQualityGatesJobs(nodesWithManifest)).map((v) => ({...v, value: cleanupValues(v.value).replaceAll("\n", " && ").slice(0, 50)}))
```

```js
display(Inputs.table(checkStepRunUses))
```
```js
display(Plot.plot({
  color: {
    legend: true
  },
  marginLeft: 600,
  width: 800,
  height: 4000,
  x: { label: "Count", axis: "both" },
  y: { label: "uses"},
  marks: [
    Plot.barX(checkStepRunUses, Plot.groupY({ x: "count" }, { y: "value", fill: "run-use-type", sort: { y: "-x" } }))
  ]
}))
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
const statsSelection = view(Inputs.table(versionsSearch.filter((d) => preMergeChecks.includes(d.checkType)), {
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
Inputs.table(statsSelection?.job?.steps || [], {
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

----

```js
const getJobAndStepNames = (nodes) => nodes.flatMap((node) =>
  (node.workflows?.entries ?? []).flatMap(({ object }) =>
    Object.entries(object.text.jobs ?? {}).flatMap(([key, job]) => [
      job.name ?? job.id ?? key,
      ...(job.steps ?? []).map((step) => step.name ?? step.id ?? key)
    ])
  )
)
```

```js
const source = getJobAndStepNames(nodesWithManifest)
```

# Word Frequency

```js
const stopwords = new Set(["$", "&", "set", "to", "up", "for", "the", "out", "17", "21", "from", "via", "if", "on"])

const words = source.join(' ').split(' ')
    .map(w => w.replace(/^[“‘"\-—()\[\]{}]+/g, ""))
    .map(w => w.replace(/[;:.!?()\[\]{},"'’”\-—]+$/g, ""))
    .map(w => w.replace(/['’]s$/g, ""))
    .map(w => w.substring(0, 30))
    .map(w => w.toLowerCase())
    .filter(w => w && !stopwords.has(w))
```

```js
// display(words)
```

```js
const wordFreq = d3.rollups(words, v => v.length, w => w).sort((a, b) => b[1] - a[1]);

display(Plot.plot({
  marginLeft: 300,
    height: 8000,
  x: { label: "Count" },
  y: { label: "Word" },
  marks: [
    Plot.barX(wordFreq, { x: d => d[1], y: d => d[0], sort: { y: "-x" } })
  ]
}))
```

```js
const fontScale = d3.scaleLinear()
  .domain(d3.extent(wordFreq, d => d[1]))
  .range([12, 56]);

const W = width, H = 500;
const placed = [];

function overlaps(a, b) {
  return !(a.x1 < b.x0 || a.x0 > b.x1 || a.y1 < b.y0 || a.y0 > b.y1);
}

const svg = d3.create("svg").attr("width", W).attr("height", H);
const g = svg.append("g").attr("transform", `translate(${W/2},${H/2})`);

const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

for (const [text, count] of wordFreq) {
  const size = fontScale(count);
  ctx.font = `${size}px sans-serif`;
  const tw = ctx.measureText(text).width;
  const th = size;
  let placed_ok = false;
  for (let r = 0; r < 300; r++) {
    const angle = r * 0.5;
    const x = angle * Math.cos(angle) * 5;
    const y = angle * Math.sin(angle) * 5;
    const box = { x0: x - tw/2, x1: x + tw/2, y0: y - th/2, y1: y + th/2, x, y, text, size };
    if (Math.abs(x) > W/2 - tw/2 || Math.abs(y) > H/2 - th/2) continue;
    if (!placed.some(p => overlaps(p, box))) {
      placed.push(box);
      placed_ok = true;
      break;
    }
  }
}

g.selectAll("text")
  .data(placed)
  .join("text")
  .style("font-size", d => `${d.size}px`)
  .style("font-family", "sans-serif")
  .style("fill", (_, i) => d3.schemeTableau10[i % 10])
  .attr("text-anchor", "middle")
  .attr("dominant-baseline", "middle")
  .attr("transform", d => `translate(${d.x},${d.y})`)
  .text(d => d.text);

display(svg.node());
```


```js
function Treemap(data, { width: W = 1200, height: H = 800 } = {}) {
  const root = d3.treemap().size([W, H]).padding(2)(
    d3.hierarchy({ children: data.map(([name, value]) => ({ name, value })) })
      .sum(d => d.value)
      .sort((a, b) => b.value - a.value)
  );
  const color = d3.scaleOrdinal(d3.schemeTableau10);
  const svg = d3.create("svg").attr("width", W).attr("height", H);
  const cell = svg.selectAll("g").data(root.leaves()).join("g")
    .attr("transform", d => `translate(${d.x0},${d.y0})`);
  cell.append("rect")
    .attr("width", d => d.x1 - d.x0)
    .attr("height", d => d.y1 - d.y0)
    .attr("fill", d => color(d.data.name));
  cell.append("text")
    .attr("x", 4).attr("y", 14)
    .style("font", "12px sans-serif")
    .style("fill", "white")
    .text(d => d.x1 - d.x0 > 30 ? d.data.name : "");
  return svg.node();
}
```

```js
display(Treemap(wordFreq))
```
