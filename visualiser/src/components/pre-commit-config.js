export function invertNodesToHooks(nodes) {
    const { preCommitConfig, ...repositoryProperties } = nodes;
    return (preCommitConfig?.text?.repos ?? []).flatMap(({ hooks, ...preCommitReposProperties }) =>
        hooks.map(({ id, ...rest }) => ({
            id,
            ...(Object.keys(rest).length ? { hookProperties: rest } : {}),
            repositoryProperties,
            preCommitReposProperties
        }))
    );
}
