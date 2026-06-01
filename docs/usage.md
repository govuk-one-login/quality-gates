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

| Field           | Type   | Description                      |
|-----------------|--------|----------------------------------|
| `service-tag`   | string | Short identifier for the service |
| `quality-gates` | array  | List of quality gate checks      |

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

Phases vary by branching strategy:

| Strategy    | Phases                                                                     |
|-------------|----------------------------------------------------------------------------|
| Trunk-based | `pre-merge`, `pre-upload`, `build`, `staging`, `production`, `integration` |
| Gitflow     | `pre-develop`, `develop`, `pre-release`, `release`, `main`                 |
| Library SDK | `pre-merge`, `pre-release`                                                 |

### Config object

| Field  | Required | Description                                       |
|--------|----------|---------------------------------------------------|
| `file` | Yes      | Path to the workflow/config file                  |
| `path` | No       | JMESPath expression identifying the relevant node |
