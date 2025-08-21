export function gitHubEventsTag(strings, ghaFiles) {

      const eventNames = ghaFiles.reduce((acc, gha) => {
      if (gha.on != null && typeof gha.on.valueOf() === "string") {
        return acc.concat(gha.on)
      }

      return acc.concat(Object.keys((gha.on)))
    }, [])


    const gitHubEvents = Array.from(new Set(eventNames)).sort()

    return `subgraph events["GitHub Events"]\n${gitHubEvents.sort().join('\n')}\nend\n`
}


export function fileAndJobToNodeName(strings, fileName, jobName, jobTitle) {
    return `${fileToNodeName`${fileName}`}__${jobName}[${fileToNodeName`${fileName}`}__${jobName}]`
}

export function fileToNodeName(strings, fileName) {
    return `_${fileName.replace(".yaml","")}`
}

    export function gitHubFilesAndJobsTag(strings, ghaFiles) {
        return `${ghaFiles.reverse().map((ghaF) => {
            return [
                `subgraph ${fileToNodeName`${ghaF.__file}`}[${fileToNodeName`${ghaF.__file}`}]`,

                Object.keys(ghaF.jobs).map((k)=>`${fileAndJobToNodeName`${ghaF.__file}${k}`}`).join('\n'),

                `end`
            ].join('\n')
        }).join('\n')}`
    }

    export function githubFilesAndJobsLinks(strings, ghaFiles) {

    }

    export function isString(prop) {
        return prop != null && typeof prop.valueOf() === "string"
    }

    export function eventToGHA(strings, ghaFiles, events) {
        let lines = [];
        console.log(ghaFiles)
        console.log(events)


        const actions = ghaFiles.reduce((acc, file) => {
            if (file.on != null && typeof file.on.valueOf() === "string") {
                if(events.includes(file.on)) {
                     acc.push(file)
                }
            } else {
                if (Object.keys(file.on).some((value) => { return events.includes(value)})) {
                     acc.push(file)
                }
            }

            return acc
        }, [])

        console.log('actions')
        console.log(actions)


        lines = actions.reduce((acc, action) => {
            return acc.concat(Object.keys(action.on).reduce((acc1, on) => {
                console.log(acc1)
                return acc1.concat(`${on} --> ${fileToNodeName`${action.__file}`}`)
            }, []))
        }, [])

        console.log(lines)
        return lines.join('\n')
    }

    export function jobUsesToJobEdges(string, ghaFiles) {
        let lines = [];


        const edges = ghaFiles.reduce((acc, file) => {

            const jobNames = Object.keys(file.jobs);

            jobNames.reduce((acc1, job) => {
                console.log(`job: ${job}`)
                if (file?.jobs[job]?.needs) {
                    console.log(`needs: ${file.jobs[job].needs.split(',')}`)
                    return acc1.concat(file.jobs[job].needs.map((need) => {
                        console.log(`need: ${need}`)
                        // return `${fileAndJobToNodeName`${file.__file}${needs}`} --> ${fileAndJobToNodeName`${file.__file}${job}`}`
                    }))
                    // acc1.concat()

                }

                return acc;
            },[])
        },[])
    }

    export function jobUsesToWorkflowEdges(string) {

    }
