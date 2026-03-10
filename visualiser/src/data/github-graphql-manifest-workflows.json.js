import "dotenv/config";
import { graphql } from "@octokit/graphql";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const { GITHUB_TOKEN, GITHUB_ORG:ORG } = process.env;

const query = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "manifest-and-workflows.graphql"),
  "utf8"
);

const data = await graphql(query, {
  org: ORG,
  headers: { authorization: `token ${GITHUB_TOKEN}` },
});

process.stdout.write(JSON.stringify(data, null, 2));
