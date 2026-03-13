export function githubActionCounts(data) {
    const counts = {};

    for (const repo of data.organization.repositories.nodes) {
        for (const entry of (repo.workflows?.entries ?? [])) {
            const filePath = `.github/workflows/${entry.name}`;
            for (const job of Object.values(entry.object.text.jobs ?? {})) {
                for (const step of (job.steps ?? [])) {
                    if (!step.uses) continue;
                    const [nameWithVersion, version] = step.uses.split('@');
                    const parts = nameWithVersion.split('/');

                    const names = [nameWithVersion];
                    if (parts.length > 2) names.push(parts.slice(0, 2).join('/'));

                    for (const name of names) {
                        counts[name] ??= {};
                        counts[name][version] ??= { count: 0, sources: [] };
                        counts[name][version].count++;
                        if (repo.name) counts[name][version].sources.push({ repo: repo.name, filePath });
                    }
                }
            }
        }
    }

    return Object.entries(counts)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, versions]) => ({
            name,
            count: Object.values(versions).reduce((s, { count }) => s + count, 0),
            versions: Object.entries(versions)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([version, { count, sources }]) => {
                    const entry = { version, count };
                    if (sources.length) entry.sources = sources;
                    return entry;
                })
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
