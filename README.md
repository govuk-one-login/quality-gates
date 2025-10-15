# Quality Gates

Quality Gates are enforced milestones or checks between phases of deployment on the path to production.

This repository contains schemas and utilities to be used for creating manifest files to annotate existing deployment pipelines for use with further analysis.

## Schema

This repository [contains a schema](./schemas/schema.json) that can be used to statically define quality gates. This is current targetted at pre-merge checks running in GitHub Actions, with incomplete support for other phases of the SDLC.

### Example

```json
{
  "$schema": "https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.1.0/schemas/schema.json",
  "services": [
    {
      "service-tag": "example-service-shortname",
      "quality-gates": [
        {
          "check-types": [
            "code style and linting",
            "secret scanning"
          ],
          "config": {
            "file": ".github/workflows/check-code-quality.yaml",
            "name": "Run pre-commit",
            "path": "jobs.run-pre-commit"
          },
          "phase": "pre-merge",
          "provider": "GitHub"
        }
      ]
    }
  ]
}

```

## Visualiser

This repository [contains a visualiser](./visualiser) that can be used to:

- display a directed graph of the GitHub Actions and Jobs for a repository
- display a debug table of quality gates and their enforcement.

Note: The visualiser requires a token with ["Administration" repository permissions (read)](https://docs.github.com/en/rest/branches/branch-protection?apiVersion=2022-11-28)
