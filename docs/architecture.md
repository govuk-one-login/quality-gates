# Architecture

## Overview

This repository provides a schema-driven approach to documenting quality gates across deployment pipelines. It enables teams to annotate existing systems by declaring what checks exist, where they run, and at which phase of the software delivery lifecycle.

## Repository structure

```
.
├── schemas/              # JSON Schema definitions
│   └── schema.json       # The quality gate manifest schema
├── examples/             # Example manifests
├── test/                 # Schema validation tests
├── visualiser/           # Observable Framework app
├── .github/
│   └── workflows/        # CI pipelines
└── quality-gate.manifest.json  # This repo's own manifest (dogfooding)
```

## Key concepts

### Quality gates

A quality gate is an enforced check that must pass before code progresses to the next phase. Each gate has:

- A **type** describing what it checks (unit tests, linting, security scanning, etc.)
- A **phase** indicating when in the SDLC it runs
- A **provider** identifying the platform that executes it
- A **file** pointing to where the check is defined
- An optional **path** identifying the specific job or step within the file

#### Deployment strategy

The schema supports three deployment strategy models, each with different phase definitions. The `promotionType` property on a service determines which phases are valid:

| `promotionType`    | Use case                               | Phases                                                              |
|--------------------|----------------------------------------|---------------------------------------------------------------------|
| `securePipelines`  | Teams deploying continuously from main | pre-merge → pre-upload → build → staging → production → integration |
| `gitFlow`          | Teams using develop/release branches   | pre-develop → develop → pre-release → release → main                |
| `library`          | Teams publishing packages              | pre-merge → pre-release                                             |

### Check type taxonomy

Check types are drawn from prior analysis work within the GOV.UK One Login programme. They represent categories of verification, not specific tools. For example, `unit` covers any unit testing framework, and `secret scanning` covers any tool that detects secrets.

## Design decisions

### Schema-based approach

There are many different ways that quality gates are invoked and enforced. They are the source of truth.

These various usages are then annotated using the schema file to create a representation of this as a manifest file which is a static JSON file that lives alongside the code it describes. This means:

- No runtime dependencies for declaring quality gates
- Validation happens at authoring time (editor support) and in CI
- Analysis and visualisation are separate concerns

### JSONPath for locating checks

The `path` field uses JSONPath (RFC 9535) expressions to identify specific jobs or steps within workflow files (e.g., `jobs.run-tests` or `jobs.run-tests.steps[?@.name=='Run Tests']`). This provides a standard way to reference nested YAML/JSON structures without coupling to a specific CI platform's object model.

### Dogfooding

This repository includes its own `quality-gate.manifest.json` to validate the schema against real usage and demonstrate the expected file structure.
