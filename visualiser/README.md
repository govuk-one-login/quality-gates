# Quality Gate Visualiser

[![Schema Tests](https://github.com/govuk-one-login/quality-gates/actions/workflows/visualiser.yml/badge.svg)](https://github.com/govuk-one-login/quality-gates/actions/workflows/visualiser.yml)

An [Observable Framework](https://observablehq.com/framework/) app that is used to perform an aggregated analysis of the use of quality gate across a GitHub organisation

## What it does

- At build-time uses [data loaders](https://observablehq.com/framework/data-loaders) against the GitHub API to create a snapshot of a GitHub organisation's GitHub workflows, quality-gate manifests, and other related files
- Displays a directed graph of GitHub Actions workflows and jobs for a single repository
- Shows quality gate enforcement status against defined check levels
- Provides statistics on pre-commit hooks, GitHub Actions checks, and manifest coverage

## Getting started

### Prerequisites

- Node.js v18 or later
- A GitHub fine-grained personal access token

### 1. Install dependencies

```shell
cd visualiser
npm install
```

### 2. Create a GitHub token

Create a [fine-grained personal access token](https://github.com/settings/personal-access-tokens) with:

- **Contents** — Read-only
- **Custom properties** — Read-only
- **Metadata** — Read-only
- **Workflows** — Read and write

> Note: Non-organisational fine-grained tokens [do not currently support the GraphQL API](https://github.com/actions/add-to-project/issues/289#issuecomment-2967949633).


### 3. Configure environment

```shell
cp .env.example .env
```

Edit `.env` with your values:

| Variable                    | Description                                                          |
|-----------------------------|----------------------------------------------------------------------|
| `GITHUB_TOKEN`              | Fine-grained PAT (see [token permissions](#token-permissions) below) |
| `GITHUB_ORG`                | GitHub organisation to query                                         |
| `LEVEL_GROUP_PREFIX`        | Prefix for tier grouping (default: `CHECKS`)                         |
| `LEVEL_GROUP_DELIMITER`     | Delimiter between tier segments (default: `__`)                      |
| `CHECKS__S_TIER__PRE_MERGE` | Example of comma-separated check-types required at S tier            |
| `CHECKS__A_TIER__PRE_MERGE` | Example of comma-separated check-types required at A tier            |
| `CHECKS__B_TIER__PRE_MERGE` | Example of comma-separated check-types required at B tier            |



### 4. Start the dev server

```shell
npm run dev
```

Visit http://localhost:3000.

## Tier system

The comparison of the implementation of quality gates can be grouped into levels. This grouping is independent of the checks themselves and is shaped more by the requirements of the team, project or organisation. Metals (Gold/Silver/Bronze), Jewels (Ruby/Emerald/Diamond) or S-Tier (S/A/B/C/D/F) are common grouping categories. The tier configuration is defined via environment variables using the pattern:

```bash
{PREFIX}{DELIMITER}{TIER}{DELIMITER}{PHASE}="check type 1,check type 2"
```

For example:
```bash
LEVEL_GROUP_PREFIX=CHECKS
LEVEL_GROUP_DELIMITER=__
CHECKS__S_TIER__PRE_MERGE="contract"
```
This means **S tier** for **pre merge** requires **contract tests**.


Similarly,

```bash
LEVEL_GROUP_PREFIX=LEVELS
LEVEL_GROUP_DELIMITER=--
LEVELS--EMERALD--POST_MERGE="unit test coverage"
```

This means **Emerald** for **post merge** requires **unit test coverage**.

Ensure that all the configuration remains in the same grouping format to avoid confusion when comparing implementation levels.

## Project structure

The project has this looks like this:

```ini
.
├─ src
│  ├─ components
│  │  └─ *.js                  # importable modules
│  ├─ data
│  │  ├─ *.json.js             # data loaders using JavaScript to output JSON
│  │  └─ *.graphql             # graphql query files
│  ├─ *.md                     # pages
│  └─ index.md                 # the home page
├─ .gitignore
├─ observablehq.config.js      # config file for Observable framework
├─ package.json
└─ README.md
```

**`src`** - This is the “source root” — where your source files live. Pages go here. Each page is a Markdown file. Observable Framework uses [file-based routing](https://observablehq.com/framework/project-structure#routing), which means that the name of the file controls where the page is served. You can create as many pages as you like. Use folders to organize your pages.

**`src/index.md`** - This is the home page for your app. You can have as many additional pages as you’d like, but you should always have a home page, too.

**`src/data`** - You can put [data loaders](https://observablehq.com/framework/data-loaders) or static data files anywhere in your source root, but we recommend putting them here.

**`src/components`** - You can put shared [JavaScript modules](https://observablehq.com/framework/imports) anywhere in your source root, but we recommend putting them here. This helps you pull code out of Markdown files and into JavaScript modules, making it easier to reuse code across pages, write tests and run linters, and even share code with vanilla web applications.

**`observablehq.config.js`** - This is the [app configuration](https://observablehq.com/framework/config) file, such as the pages and sections in the sidebar navigation, and the app’s title.

## Command reference

| Command              | Description                                 |
|----------------------|---------------------------------------------|
| `npm install`        | Install or reinstall dependencies           |
| `npm run dev`        | Start local preview server                  |
| `npm run build`      | Build your static site, generating `./dist` |
| `npm run clean`      | Clear the local data loader cache           |
| `npm run observable` | Run commands like `observable help`         |

## Troubleshooting

Changes to `.env` will not take effect while the local preview server is running. Stop and restart it to pick up any changes.

If other changes aren't taking effect, you may need to clear `src/.observablehq/cache`.
