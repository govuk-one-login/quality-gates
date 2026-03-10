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

const query = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "manifest-and-workflows.graphql"),
  "utf8"
);

const data = await octokit.graphql(query, {
  org: ORG,
  headers: { authorization: `token ${GITHUB_TOKEN}` },
});

for (const repo of data.organization.repositories.nodes) {
  if (repo.manifest?.text) repo.manifest.text = JSON.parse(repo.manifest.text);
  if (repo.workflows?.entries) {
    repo.workflows.entries = repo.workflows.entries
      .filter(({ name }) => name.endsWith(".yml") || name.endsWith(".yaml"))
      .map((entry) => ({ ...entry, object: { text: YAML.parse(entry.object.text) } }));
  }
}

process.stdout.write(JSON.stringify(data, null, 2));
