import "dotenv/config";
import { Octokit } from "@octokit/core";
import { paginateGraphQL } from "@octokit/plugin-paginate-graphql";

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import YAML from 'yaml'

const { GITHUB_TOKEN, GITHUB_ORG:ORG } = process.env;

const PaginatedOctokit = Octokit.plugin(paginateGraphQL);
const octokit = new PaginatedOctokit({ auth: GITHUB_TOKEN });

const repoQuery = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "github-repositories-and-manifest.graphql"),
  "utf8"
);

const workflowsQuery = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), "github-workflows.graphql"),
    "utf8"
);


let data = {
    organization: {
        repositories: {
            nodes: []
        }
    }
};


// The simpler approach of a single GraphQL query, paginated over repositories ran in to intermittent
// Internal Server Errors from within the GitHub GraphQL API. This behaviour deteriorated with the recent GitHub
// outages. In order to avoid triggering these opaque internal timeouts, this now uses the "Double Pass" approach
// as recommended by [Advanced patterns for GitHub's GraphQL API](https://www.youtube.com/watch?v=i5pIszu9MeM&t=719s)
//
// This unfortunately has taken the total query cost from total_number_of_repos / page_size to total_number_of_repos.
// The rate limit is currently 5,000 points per hour per user, rising to 10,000 or 12,500 for various types of
// GitHub App installations. Further details on rate limits and optimisation techniques are available:
// [Rate limits and query limits for the GraphQL API](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api)
//
// Unsure if Double Pass Optimisation using nodes(ids: [id, id]) + inline fragments will work given the Git object structure

const repoIterator = octokit.graphql.paginate.iterator(repoQuery, { org: ORG })

for await (const response of repoIterator) {
    console.warn(`${data.organization.repositories.nodes.length} of ${response.organization.repositories.totalCount}`)

    data.organization.repositories.totalCount = response.organization.repositories.totalCount
    data.rateLimit = response.rateLimit

    for await (const repo of response.organization.repositories.nodes) {
        try {
            if (repo.manifest?.text) repo.manifest.text = JSON.parse(repo.manifest.text);
        } catch (e) {
            console.error(`Error parsing manifest for ${ORG}/${repo.name}`)
            console.error(e.message)
            repo.manifest.text = {}
        }

        let workflows;
        let parsedWorkflows = {
            entries: [],
            __errors: []
        }

        try {
            workflows = await octokit.graphql(workflowsQuery, {org: ORG, repo: repo.name})
        } catch(e) {
            console.error(`Error fetching workflows for ${ORG}/${repo.name}`)
            console.error(e.message)
            parsedWorkflows.__errors.push(`Error fetching workflows for ${ORG}/${repo.name}`)
        }

        if (workflows?.repository?.workflows?.entries) {
            parsedWorkflows.entries = workflows.repository.workflows.entries
                .filter(({name}) => name.endsWith(".yml") || name.endsWith(".yaml"))
                .map((entry) => {
                    const parsed = {
                        ...entry,
                        object: {}
                    }

                    try {
                        parsed.object.text = YAML.parse(entry.object.text)
                    } catch (e) {
                        console.warn(`Error parsing ${ORG} / {repo.name} / ${entries.name}`)
                        workflows.__errors = [`Error parsing ${ORG} / {repo.name} / ${entries.name}`]
                    }
                    return parsed
                });
        }

        data.organization.repositories.nodes.push({
            ...repo,
            workflows: parsedWorkflows
        })
    }

}

console.warn(data.rateLimit)

process.stdout.write(JSON.stringify(data, null, 2));
