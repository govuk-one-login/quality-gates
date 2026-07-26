# Using the Quality Gates Schema

## Referencing the schema

The primary way to use this project is by referencing the JSON Schema in your manifest files. This enables validation in editors (VS Code, IntelliJ) and CI pipelines.

### In your manifest file

Add a `$schema` property pointing to a tagged release:

```json
{
  "$schema": "https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.17.0/schemas/schema.json"
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

#### `upgrade`

Incrementally upgrades manifest files to the latest schema version. Each version migration is applied in sequence.

```shell
# Upgrade manifest in the current directory
node cli/index.js upgrade

# Upgrade a specific file
node cli/index.js upgrade path/to/quality-gate.manifest.json

# Upgrade all manifests in a directory tree
node cli/index.js upgrade path/to/repos/

# Preview changes without writing
node cli/index.js upgrade . --dry-run
```

The upgrade command handles all historical schema migrations automatically, including:

- Kebab-case to camelCase property renames (pre-v0.5.0)
- `qualityGates` → `checks` rename (v0.10.0)
- `serviceTag` → `product`/`component` (v0.13.0)
- `checks` → `automated` execution mode split (v0.14.0)
- `checkTypes` string array → `checks` object array (v0.15.0)
- Add `scope`/`purpose` to checks, remove deprecated check types (v0.16.0)
- Flatten `config.file`/`config.path` into parent object (v0.17.0)

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

| Field           | Type   | Description                                                           |
|-----------------|--------|-----------------------------------------------------------------------|
| `product`       | string | General name for a service                                            |
| `component`     | string | Component within the product                                          |
| `promotionType` | string | Promotion strategy (`securePipelines`, `gitFlow`, `library`, `other`) |
| `automated`     | array  | Checks that run in CI/CD automatically (optional)                     |
| `manual`        | array  | Checks performed by a human (optional)                                |
| `outOfBand`     | array  | Checks that run outside the deployment pipeline (optional)            |
| `notApplicable` | array  | Check types consciously declared as not relevant (optional)           |

### Execution modes

Quality gate checks are grouped by how they are executed. This separates the *category* of check (e.g. "accessibility") from the *mechanism* by which it is verified.

#### `automated`

Checks that run automatically in CI/CD with no human involvement.

| Field       | Type     | Required | Description                                      |
|-------------|----------|----------|--------------------------------------------------|
| `checks`    | object[] | Yes      | Check types (see [checks](#checks))              |
| `phase`     | string   | Yes      | SDLC phase where the check runs                  |
| `provider`  | string   | Yes      | Platform running the check (`GitHub`, `Terraform`, `CloudFormation`, `Stack Orchestration Tool`) |
| `file`      | string   | Yes      | Path to the workflow/config file                 |
| `path`      | string   | No       | JSONPath (RFC 9535) expression identifying the relevant node |

#### `manual`

Checks performed by a human (e.g. accessibility audit, pen test, manual approval gate).

| Field       | Type     | Required | Description                                      |
|-------------|----------|----------|--------------------------------------------------|
| `checks`    | object[] | Yes      | Check types                                      |
| `phase`     | string   | Yes      | SDLC phase where the check is performed          |
| `details`   | string[] | Yes      | Description of the manual process                |

#### `outOfBand`

Checks that happen outside the deployment pipeline (e.g. daily smoke tests, periodic security scans, external audits).

| Field       | Type     | Required | Description                                      |
|-------------|----------|----------|--------------------------------------------------|
| `checks`    | object[] | Yes      | Check types                                      |
| `phase`     | string   | Yes      | SDLC phase the check relates to                  |
| `provider`  | string   | Yes      | Platform running the check                       |
| `file`      | string   | Yes      | Path to the workflow/config file                 |
| `path`      | string   | No       | JSONPath (RFC 9535) expression identifying the relevant node |

#### `notApplicable`

Check types that the team has consciously decided do not apply to this service.

| Field       | Type     | Required | Description                                      |
|-------------|----------|----------|--------------------------------------------------|
| `checks`    | object[] | Yes      | Check types with details (see [checks with details](#checks-with-details)) |

### Checks

Each item in a `checks` array is an object:

| Field     | Type     | Required | Description                              |
|-----------|----------|----------|------------------------------------------|
| `name`    | string   | Yes      | Check type name (from the allowed enum)  |
| `scope`   | string   | No       | Scope of an integration check (only allowed when `name` is `"integration"`) |
| `purpose` | string[] | No       | Purpose of the check (only allowed when `name` is `"integration"` or `"unit"`) |

#### Scope values

Only applicable to `integration` checks:

| Value | Description |
|-------|-------------|
| `component` | Tests a single component in isolation |
| `product` | Tests the full product/service |
| `neighbour` | Tests interaction with neighbouring services |
| `e2e` | End-to-end tests across the full stack |

#### Purpose values

Applicable to `integration` and `unit` checks:

| Value | Description |
|-------|-------------|
| `regression` | Verifies existing functionality hasn't broken |
| `new feature` | Validates new functionality |
| `smoke` | Quick sanity check that critical paths work |
| `performance` | Validates performance characteristics |

### Checks with details

In `notApplicable`, each check item also requires justification:

| Field     | Type     | Required | Description                                   |
|-----------|----------|----------|-----------------------------------------------|
| `name`    | string   | Yes      | Check type name (from the allowed enum)       |
| `scope`   | string   | No       | Scope (same rules as above)                   |
| `purpose` | string[] | No       | Purpose (same rules as above)                 |
| `details` | string[] | Yes      | Justification for why it is not applicable    |

### Check types

The schema supports the following check-type values:

`accessibility`, `canary`, `code quality`, `code style and linting`, `contract`, `cross service integration`, `data compatibility`, `integration`, `secret scanning`, `sensitive data scanning`, `system`, `unit test coverage`, `unit`, `visual regression`, `vulnerability detection`

### Phases

Valid phases depend on the service's `promotionType`:

| `promotionType`    | Valid phases                                                               |
|--------------------|----------------------------------------------------------------------------|
| `securePipelines`  | `pre-merge`, `pre-upload`, `build`, `staging`, `production`, `integration` |
| `gitFlow`          | `pre-develop`, `develop`, `pre-release`, `release`, `main`                 |
| `library`          | `pre-merge`, `pre-release`                                                 |

### Provider path examples

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
