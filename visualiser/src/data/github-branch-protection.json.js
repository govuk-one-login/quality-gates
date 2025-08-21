import "dotenv/config";
import { Octokit, App } from "octokit";
import YAML from 'yaml'

const { GITHUB_TOKEN, GITHUB_REPO_ORG="govuk-one-login", GITHUB_REPO_NAME="quality-gates" }  = process.env;

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// ... Get all the workflows
const branchProtection = await octokit.rest.repos.getBranchProtection({
    owner: GITHUB_REPO_ORG,
    repo: GITHUB_REPO_NAME,
    branch: "main",
})

console.warn(JSON.stringify(branchProtection, null, 2));

process.stdout.write(JSON.stringify({
    owner: GITHUB_REPO_ORG,
    repo: GITHUB_REPO_NAME,
    "github_settings": branchProtection.data
}, null, 2));
