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
- A **config** pointing to where the check is defined

### Branching strategy models

The schema supports three branching strategy models, each with different phase definitions:

| Model           | Use case                               | Phases                                                              |
|-----------------|----------------------------------------|---------------------------------------------------------------------|
| **Trunk-based** | Teams deploying continuously from main | pre-merge → pre-upload → build → staging → production → integration |
| **Gitflow**     | Teams using develop/release branches   | pre-develop → develop → pre-release → release → main                |
| **Library SDK** | Teams publishing packages              | pre-merge → pre-release                                             |

### Check type taxonomy

Check types are drawn from prior analyis work within the GOV.UK One Login programme. They represent categories of verification, not specific tools. For example, `unit` covers any unit testing framework, and `secret scanning` covers any tool that detects secrets.

## Design decisions

### Schema-based approach

There are many different ways that quality gates are invoked and enforced. They are the source of truth.

These various usages are then annotated using the schema file to create a representation of this as a manifest file which is a static JSON file that lives alongside the code it describes. This means:

- No runtime dependencies for declaring quality gates
- Validation happens at authoring time (editor support) and in CI
- Analysis and visualisation are separate concerns

### JMESPath for config paths

The `config.path` field uses JMESPath-compatible expressions to identify specific nodes within workflow files (e.g., `jobs.run-tests`). This provides a standard way to reference nested YAML/JSON structures without coupling to a specific CI platform's object model.

### Dogfooding

This repository includes its own `quality-gate.manifest.json` to validate the schema against real usage and demonstrate the expected file structure.
