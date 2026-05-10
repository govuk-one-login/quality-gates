export function nodesWithManifests(nodes) {
    return nodes
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
}

export function flattenJobs (nodes) {
 return nodes.flatMap((node) =>
     (node.workflows?.entries ?? []).flatMap(({ name, object }) =>
         Object.entries(object.text.jobs ?? {}).map(([key, job]) => ({
             ...job,
             "__workflow-file": name,
             "__workflow-name": object.text.name,
             "__path": `jobs.${key}`,
             "__name": node.name,
             "__owner": node.owner?.login,
             "__pod": node.pod?.value,
             "__teamResponsible": node.teamResponsible?.value
         }))
     )
 )
}


export function flattenQualityGatesJobs(nodes) {
    return nodes.flatMap((node) =>
        (node.manifest?.text?.services ?? []).flatMap((service) =>
            (service["quality-gates"] ?? []).flatMap((gate) => {
                if (!gate.config?.file || !gate.config?.path) return [];
                const fileName = gate.config.file.split("/").at(-1);
                const jobKey = gate.config.path.split(".").at(-1);
                const workflow = node.workflows.entries.find((e) => e.name === fileName);
                if (!workflow) return [];
                const job = workflow.object.text.jobs[jobKey];
                return {
                    "check-types": gate["check-types"],
                    job: {
                        ...job,
                        "__workflow-file": fileName,
                        "__workflow-name": workflow.object.text.name,
                        "__path": gate.config.path,
                        "__repoName": node.name,
                        "__serviceTag": service["service-tag"]
                    }
                };
            })
        )
    );
}

export function cleanupValues(value) {
    return value.replace(/@[^\s]+$/, "").trimEnd();
}

export function qualityGatesJobsToCheckStepRunUses(qualityGatesJobs) {
    return qualityGatesJobs.flatMap(({ "check-types": checkTypes, job }) =>
        (job.steps ?? []).flatMap((step) =>
            checkTypes.flatMap((checkType) =>
                [
                    step.uses && { "check-type": checkType, "run-use-type": "use", value: step.uses },
                    step.run  && { "check-type": checkType, "run-use-type": "run", value: step.run },
                ].filter(Boolean)
            )
        )
    );
}

export function allUses(nodes) {

}

export function allRuns(nodes) {

}
