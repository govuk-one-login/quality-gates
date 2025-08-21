import "dotenv/config";
import { Octokit, App } from "octokit";
import YAML from 'yaml'

const { GITHUB_TOKEN, GITHUB_REPO_ORG="govuk-one-login", GITHUB_REPO_NAME="quality-gates" }  = process.env;

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// ... Get all the workflows
const ghaFiles = await octokit.rest.repos.getContent({
    owner: GITHUB_REPO_ORG,
    repo: GITHUB_REPO_NAME,
    branch: "main",
    path: ".github/workflows"
})

console.warn(JSON.stringify(ghaFiles, null, 2));

const ghasContent = {};

// For each workflow
for(const ghaFile of ghaFiles.data) {
    console.warn(ghaFile.name);

    // ... Get the contents
    const ghaFilePromise = await fetch(ghaFile.download_url);

    // Convert YAML into JSON
    ghasContent[ghaFile.name] = YAML.parse(await ghaFilePromise.text())
}

process.stdout.write(JSON.stringify({
    owner: GITHUB_REPO_ORG,
    repo: GITHUB_REPO_NAME,
    "github_action_files": ghasContent
}, null, 2));
