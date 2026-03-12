export function githubActionCounts(data) {
    // const data = JSON.parse(githubActionGraphData);
    const counts = {};

    for (const repo of data.organization.repositories.nodes) {
        for (const entry of (repo.workflows?.entries ?? [])) {
            for (const job of Object.values(entry.object.text.jobs ?? {})) {
                for (const step of (job.steps ?? [])) {
                    if (!step.uses) continue;
                    const [nameWithVersion, version] = step.uses.split('@');
                    const parts = nameWithVersion.split('/');

                    const names = [nameWithVersion];
                    if (parts.length > 2) names.push(parts.slice(0, 2).join('/'));

                    for (const name of names) {
                        counts[name] ??= {};
                        counts[name][version] = (counts[name][version] ?? 0) + 1;
                    }
                }
            }
        }
    }

    return Object.entries(counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, versions]) => ({
            name,
            count: Object.values(versions).reduce((s, c) => s + c, 0),
            versions: Object.entries(versions)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([version, count]) => ({ version, count }))
        }));
}

export function isLocalOrgOrExternal(useName) {
    if(useName.startsWith("./")) {
        return "local"
    }
    else if(useName.startsWith("govuk-one-login/") || useName.startsWith("alphagov/")) {
        return "org"
    } else {
        return "external"
    }
}
