# Using the Quality Gates Schema

## Referencing the schema

The primary way to use this project is by referencing the JSON Schema in your manifest files. This enables validation in editors (VS Code, IntelliJ) and CI pipelines.

### In your manifest file

Add a `$schema` property pointing to a tagged release:

```json
{
  "$schema": "https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.0.0/schemas/schema.json"
}
```

### Validating locally

```shell
npx @sourcemeta/jsonschema validate ../quality-gates/schemas/schema.json  quality-gate.manifest.json
```

## CLI tool

The `cli/` directory provides a purpose-built tool for working with quality gate manifests. Install dependencies with `npm install` in the `cli/` directory.

### Commands

#### `validate`

Validates a manifest file against its JSON Schema. By default it reads the `$schema` field from the manifest to determine which schema to use. Remote schema URLs are downloaded automatically.

```shell
# Validate the manifest in the current directory
node cli/index.js validate

# Validate a specific file
node cli/index.js validate path/to/quality-gate.manifest.json

# Override the schema
node cli/index.js validate . --schema https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.4.0/schemas/schema.json

# Output as JSON
node cli/index.js validate . --format json
```

#### `check-references`

Validates that workflow files and jobs referenced in the manifest actually exist on disk.

```shell
# Check references in the current directory
node cli/index.js check-references

# Check a specific project
node cli/index.js check-references ../my-repo

# Output as JSON
node cli/index.js check-references . --format json
```

#### `cache clear`

Removes all cached schema downloads from `~/.cache/quality-gate-tools/`.

```shell
node cli/index.js cache clear
```

> **Note:** Schema URLs pointing to branches (e.g. `refs/heads/...`) may become stale.
> Use `--force` on the validate command to re-download, or `cache clear` to wipe all cached schemas.

### Exit codes

| Code | Meaning                     |
|------|-----------------------------|
| 0    | Valid                       |
| 1    | Validation errors found     |
| 2    | Configuration or schema error |

### Editor integration

Most JSON editors support `$schema` for autocompletion and validation. For VS Code, you can also configure `json.schemas` in settings:

```json
{
    "json.schemaDownload.trustedDomains": {
      "https://raw.githubusercontent.com/govuk-one-login/quality-gates": true
    }
}
```

## Schema structure

A manifest contains an array of **services**, each with:

| Field           | Type   | Description                                                  |
|-----------------|--------|--------------------------------------------------------------|
| `serviceTag`    | string | Short identifier for the service                             |
| `promotionType` | string | Promotion strategy (`securePipelines`, `gitFlow`, `library`) |
| `checks`        | array  | List of quality gate checks                                  |

Each **quality gate** contains:

| Field         | Type     | Description                                                 |
|---------------|----------|-------------------------------------------------------------|
| `check-types` | string[] | Categories of check (see [check types](#check-types))       |
| `phase`       | string   | SDLC phase where the check runs                             |
| `provider`    | string   | Platform running the check (`GitHub`, `Stack Orchestrator`) |
| `config`      | object   | Location of the check definition                            |

### Check types

The schema supports the following check-type values:

`accessibility`, `canary`, `code quality`, `code style and linting`, `component`, `contract`, `cross service integration`, `data compatibility`, `e2e`, `integration`, `manual`, `neighbour`, `new feature`, `product`, `regression`, `secret scanning`, `sensitive data scanning`, `smoke`, `stack`, `system`, `unit test coverage`, `unit`, `visual regression`, `vulnerability detection`

### Phases

Valid phases depend on the service's `promotionType`:

| `promotionType`    | Valid phases                                                               |
|--------------------|----------------------------------------------------------------------------|
| `securePipelines`  | `pre-merge`, `pre-upload`, `build`, `staging`, `production`, `integration` |
| `gitFlow`          | `pre-develop`, `develop`, `pre-release`, `release`, `main`                 |
| `library`          | `pre-merge`, `pre-release`                                                 |

### Config object

| Field  | Required | Description                                       |
|--------|----------|---------------------------------------------------|
| `file` | Yes      | Path to the workflow/config file                  |
| `path` | No       | JSONPath (RFC 9535) expression identifying the relevant node |

#### Provider path examples

| Provider | File format | Example `path` |
|----------|-------------|-----------------|
| GitHub | YAML workflow | `$.jobs.build.steps[?@.name=='Run tests']` |
| Terraform | HCL (`.tf`) | `$.module.my-pipeline.parameters.TestImageRepositoryUri` |
| Stack Orchestration Tool | JSON parameters | `$[?@.ParameterKey=='LambdaCanaryDeployment']` |
| CloudFormation | YAML/JSON template | `$.Resources.MyFunction.Properties.Handler` |

Notes:
- The `path` field must start with `$` (the JSONPath root identifier)
- The `file` field must not contain `:` (external cross-repo references are not supported)
- For GitHub providers, `path` typically references jobs and steps: `$.jobs.<name>` or `$.jobs.<name>.steps[?@.name=='<step>']`
