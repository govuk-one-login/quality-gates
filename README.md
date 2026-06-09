# Quality Gates Schema

[![Schema Tests](https://github.com/govuk-one-login/quality-gates/actions/workflows/schema.yml/badge.svg)](https://github.com/govuk-one-login/quality-gates/actions/workflows/schema.yml)
[![Quality](https://github.com/govuk-one-login/quality-gates/actions/workflows/quality.yml/badge.svg)](https://github.com/govuk-one-login/quality-gates/actions/workflows/quality.yml)

Quality Gates are enforced milestones or checks between phases of deployment on the path to production.

This repository contains a JSON Schema and tooling for creating manifest files that annotate existing deployment pipelines for analysis and reporting.

## Quick start

Reference the schema directly in your manifest file:

```json
{
  "$schema": "https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.0.0/schemas/schema.json",
  "services": [
    {
      "serviceTag": "my-service",
      "promotionType": "securePipelines",
      "qualityGates": [
        {
          "checkTypes": ["unit"],
          "phase": "pre-merge",
          "provider": "GitHub",
          "config": {
            "file": ".github/workflows/test.yml",
            "path": "jobs.test"
          }
        }
      ]
    }
  ]
}
```

See the [examples/](./examples) directory for complete manifests covering trunk-based, gitflow, and library SDK branching strategies.

## What's included

| Component                   | Description                                                      |
|-----------------------------|------------------------------------------------------------------|
| [schemas/](./schemas)       | JSON Schema definition for quality gate manifests                |
| [examples/](./examples)     | Example manifest files for common branching strategies           |
| [visualiser/](./visualiser) | Observable Framework app for viewing and analysing quality gates |
| [test/](./test)             | Schema validation tests                                          |

## Developing with the schema locally

You'll need [Node.js](https://nodejs.org/en/) v18 or later.

```shell
git clone git@github.com:govuk-one-login/quality-gates.git
cd quality-gates
npm install
```

### Validate schemas

```shell
npm run validate:schemas
npm run validate:lint
```

### Run schema tests

```shell
npm test
```

## Analysing the organisation using the visualiser

See [visualiser/README.md](./visualiser/README.md).

## Versioning

This schema follows [semantic versioning](https://semver.org/). The schema URL includes a version tag:

```
https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.0.0/schemas/schema.json
```

- **Major** — breaking changes to the schema (removed fields, renamed enums)
- **Minor** — backwards-compatible additions (new check-types, new phases)
- **Patch** — documentation or tooling fixes

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute.

## Licence

[MIT](./LICENSE)
