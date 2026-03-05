import "dotenv/config";
import { Octokit, App } from "octokit";
import YAML from 'yaml'

const { GITHUB_TOKEN, GITHUB_REPO_ORG="govuk-one-login", GITHUB_REPO_NAME="quality-gates" }  = process.env;

const octokit = new Octokit({ auth: GITHUB_TOKEN });

const fetchWorkflows = async function (org, repo) {
// ... Get all the workflows
const ghaFiles = await octokit.rest.repos.getContent({
    owner: org,
    repo: repo,
    branch: "main",
    path: ".github/workflows"
})

console.warn(JSON.stringify(ghaFiles, null, 2));

const ghasContent = [];

// For each workflow
for(const ghaFile of ghaFiles.data) {
    console.warn(ghaFile.name);

    if(!ghaFile.name.endsWith(".yaml") && !ghaFile.name.endsWith(".yml")) {
        continue
    }

    // ... Get the contents
    const ghaFilePromise = await fetch(ghaFile.download_url);

    // Convert YAML into JSON
    ghasContent.push(
    {
        owner: org,
        repo,
        filename: ghaFile.name,
        ...YAML.parse(await ghaFilePromise.text())
    })
}

return ghasContent

}

// Search for repositories with quality-gate.manifest.json
const searchItems = await octokit.paginate(octokit.rest.search.code, {
    q: `filename:quality-gate.manifest.json org:${GITHUB_REPO_ORG}`
});

const repos = [...new Set(searchItems.map(item => item.repository.name))].sort();

console.warn(repos)

// process.exit(1)
let allReposData = [];

for (const repo of repos) {
    const ghasContent = await fetchWorkflows(GITHUB_REPO_ORG, repo);
    allReposData.push(ghasContent);
}

process.stdout.write(JSON.stringify(allReposData, null, 2));
