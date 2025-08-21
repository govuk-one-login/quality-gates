import { DirectedGraph, throwRangeError } from "data-structure-typed";

function isString(str){
  if (str != null && typeof str.valueOf() === "string") {
    return true
  }
  return false
}

function keyify(prop) {
    isString(prop) ? {[prop]: {}} : prop

}

function sortVertices(a, b) {
    if(a[0] < b[0]) { return -1; }
    if(a[0] > b[0]) { return 1; }
    return 0;

}

export function renderAsFlowChart(graph, title="GitHub Actions") {
    const lines = [];

    lines.push('---')
    lines.push(`title: ${title}`)
    lines.push('---')


    lines.push(`flowchart LR`);


    /// Events

    lines.push(`subgraph events["GitHub Events"]`)
    lines.push(`direction LR`)


    const eventVertices = graph.filter((key, value) => {
        // console.log(value, key)
        return value.type ==="event"
    }).sort(sortVertices)

    for (const event of eventVertices) {
        lines.push(event[0])
    }

    // console.log(eventVertices)
    // console.log(">>>>>>>>>")
    lines.push(`end`)
    lines.push(``)

    // Files/Workflows

    const workflowVertices = graph.filter((key, value) => {
        // console.log(value, key)
        return value.type ==="file"
    }).sort(sortVertices)

    lines.push(`subgraph actions["GitHub Actions"]`)
    lines.push(`direction TB`)

    for (const workflow of workflowVertices) {
        lines.push(`subgraph ${workflow[0]}`)
        lines.push(`direction LR`)

        // console.log(`inDegree: ${graph.inDegreeOf(workflow[0])} - outDegree: ${graph.outDegreeOf(workflow[0])}`);

        const edges = graph.outgoingEdgesOf(workflow[0])

        for(const edge of edges) {
            if(edge?.value?.type === "job") {
                lines.push(`${edge.dest.key}(["${edge.dest.value.label}"])`)
            }
        }

        lines.push(`end`)
        lines.push(``)
    }
    lines.push(`end`)
    lines.push(``)

    // const jobs = graph.filter((key, value) => {
    //     // console.log(value, key)
    //     return value.type === "job"
    // })

    // for (const job of jobs) {
    //     lines.push(`${job[0]}`)
    // }




    for (const event of eventVertices) {
        console.log('========')

        console.log(`inDegree: ${graph.inDegreeOf(event[0])} - outDegree: ${graph.outDegreeOf(event[0])}`);

        const edges = graph.incomingEdgesOf(event[0])

        for(const edge of edges) {
            if(edge?.dest?.key === "workflow_call") {
                break
            }
            console.log(`${edge?.value?.type} - ${edge.dest.key} ... ${edge.src.key}`)

            if(edge?.value?.type === "on") {
                lines.push(`${edge.dest.key} --> ${edge.src.key}`)
            }

            if(edge?.value?.type === "job") {
                    console.log(`inDegree: ${graph.inDegreeOf(event[0])} - outDegree: ${graph.outDegreeOf(event[0])}`);

                lines.push(`${edge.dest.key} --> ${edge.src.key}`)
            }

        }

        console.log('========')

    }


    // for (const workflow of workflowVertices) {
    //     console.log(`inDegree: ${graph.inDegreeOf(workflow[0])} - outDegree: ${graph.outDegreeOf(workflow[0])}`);

    //     const edges = graph.outgoingEdgesOf(workflow[0])

    //     for(const edge of edges) {
    //         console.log(`${edge?.value?.type} - ${edge.dest.key} ... ${edge.src.key}`)

    //         // if(edge?.value?.type === "on") {
    //         //     lines.push(`${edge.dest.key} --> ${edge.src.key}`)
    //         // }

    //         // if(edge?.value?.type === "job") {
    //         //         console.log(`inDegree: ${graph.inDegreeOf(event[0])} - outDegree: ${graph.outDegreeOf(event[0])}`);

    //             lines.push(`${edge.dest.key} --> ${edge.src.key}`)
    //         // }
    //     }
    // }

    const jobVertices = graph.filter((key, value) => {
        // console.log(value, key)
        return value.type ==="job"
    })

    for(const job of jobVertices) {

        console.log('_____')
        // console.log(`${job[0]}`)

        console.log(`${job[0]} - inDegree: ${graph.inDegreeOf(job[0])} - outDegree: ${graph.outDegreeOf(job[0])}`);

        const inEdges = graph.outgoingEdgesOf(job[0])
        for(const edge of inEdges) {
            console.log(`${job[0]} - ${edge?.value?.type} - ${edge.dest} ... ${edge.src}`)
        }
        const edges = graph.outgoingEdgesOf(job[0])
        for(const edge of edges) {
            console.log(`${job[0]} - ${edge?.value?.type} - ${edge.dest} ... ${edge.src}`)

            if(edge?.value?.type === "needs") {
                lines.push(`  ${edge.src} --> ${edge.dest}`)
            } else if (edge?.value?.type === "uses") {
                lines.push(`  ${edge.src} -.- ${edge.dest}`)
            }
        }

        console.log('_____')

    }



    return lines.join('\n')
}

export function createGraph(files) {

    // console.log(DirectedGraph)
    let graph = new DirectedGraph();
    let verticiesToLink = [];
    let verticesToCrossLink = [];
    let events = {};

    const fileNames = Object.keys(files);


    console.log(fileNames)
    for (const key of fileNames) {

        const fileVertex = graph.createVertex(key, {
            type: "file",
            data: files[key]
        })

        // File/Workflow
        graph.addVertex(fileVertex);

        const onProperties = isString(files[key]?.on) ? {[files[key]?.on]: {}} : files[key]?.on;

        for (const event of Object.keys(onProperties)) {

            const eventVertex = graph.createVertex(event, {
                    name: event,
                    type: "event",
                    // data: files[key]
            });

            graph.addVertex(eventVertex);

            const onEdge = graph.createEdge(fileVertex, eventVertex, 1, {
                type: "on"
            });

            // console.log(`onEdge: ${JSON.stringify(onEdge)}`)

            graph.addEdge(onEdge)
        }

        // Job
        const jobNames = Object.keys(files[key].jobs)

        for (const job of jobNames) {
            const jobVertex = graph.createVertex(`${key}__${job}`, {
                type: "job",
                label: job,
                data: files[key].jobs[job]
            });

            graph.addVertex(jobVertex);

            const jobEdge = graph.createEdge(fileVertex, jobVertex, 1, {
                type: "job"
            })

            // console.log(`jobEdge: ${jobEdge.src.key} - ${jobEdge.dest.key}`)

            graph.addEdge(jobEdge);


            verticesToCrossLink.push(jobVertex)
            // verticiesToLink.push({
            //     name: "${key}__${job}",
            //     type: "job",
            //     data: files[key].jobs[job],
            //     parent: fileVertex,
            //     node: jobNode
            // })

            // Will need steps as well, so that path finding can be done for govuk-one-login/devplatform-upload-action
        }

        // console.log(`file edges - inDegree: ${graph.inDegreeOf(fileVertex)} - outDegree: ${graph.outDegreeOf(fileVertex)}`);
        // console.log(`... ${JSON.stringify(graph.outgoingEdgesOf(fileVertex))}`);

    }

    for (const vertex of verticesToCrossLink) {
        // console.log(`crossLink: ${JSON.stringify(vertex)}`);

        // if vertex.value.data.needs then
        //     find the using parent.key + needs value
        //     hard link between

        if(vertex.value?.data?.needs) {
            // Find the parent link by used graph.incomingEdgesOf(vertex)
            const parents = graph.incomingEdgesOf(vertex);


            // console.log(`parents: ${JSON.stringify(parents, null, 2)}`)

            for (const edge of parents) {
                if(edge?.value?.type === "job") {
                    console.log(`${edge.src.key}__${vertex.value.data.needs}`)
                    const neededJob = graph.find((searchVertex) => searchVertex === `${edge.src.key}__${vertex.value.data.needs}`)

                    // console.log(`vertex: ${JSON.stringify(vertex)}`)
                    // console.log(`needed: ${JSON.stringify(neededJob)}`)

                    if(neededJob) {
                        const needsEdge = graph.createEdge(neededJob[0], vertex.key, 1, {type: "needs"})
                        graph.addEdge(needsEdge)
                    }

                }
            }
        }

        if(vertex.value?.data?.uses) {
            console.log(`uses: ${vertex.value?.data?.uses}`);
            if(vertex.value.data.uses.startsWith('./.github/workflows/')) {
            const usesEdge = graph.createEdge(vertex.key, vertex.value.data.uses.replace('./.github/workflows/',''), 1, {type: "uses"})
            graph.addEdge(usesEdge)

            }

        }



        // if vertex.value.data.uses and is local path then
        //     find the value by looking up filename
        //     dash link between

        // if is govuk package. then
        //     do something else undefined

    }
    // console.log("----");

    // console.log(graph.toVisual())

    // console.log("-   -");

    // console.log(graph.print())

    // console.log(graph.topologicalSort("key"))

    // console.log("-  -");

    // console.log(graph.edgesOf("push"))

    // console.log("_____")
    return graph
}
