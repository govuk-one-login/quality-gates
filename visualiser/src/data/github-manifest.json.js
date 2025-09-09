import "dotenv/config";
import { Octokit, App } from "octokit";

const { GITHUB_TOKEN, GITHUB_REPO_ORG="govuk-one-login", GITHUB_REPO_NAME="quality-gates" }  = process.env;

const octokit = new Octokit({ auth: GITHUB_TOKEN });

console.warn(`${GITHUB_REPO_ORG} - ${GITHUB_REPO_NAME}`);

// ... Get all the workflows
const manifestFile = await octokit.rest.repos.getContent({
    owner: GITHUB_REPO_ORG,
    repo: GITHUB_REPO_NAME,
    ref: "main",
    path: "quality-gate.manifest.json",
    mediaType: "raw"
})


let manifest;
try {
    manifest = JSON.parse(atob(manifestFile.data.content))
} catch(e) {
    console.error(e);
    process.exit(1);
}


process.stdout.write(JSON.stringify({
    owner: GITHUB_REPO_ORG,
    repo: GITHUB_REPO_NAME,
    "manifest": manifest
}, null, 2));
