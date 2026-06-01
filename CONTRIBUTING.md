# Contribution guidelines

We love contributions! We've compiled these docs to help you understand our contribution guidelines. If you still have questions, we'd be super happy to help - please either start a thread in the GDS Slack in the quality gates channel, or [raise an issue](https://github.com/govuk-one-login/quality-gates/issues) to start a discussion on GitHub.

## Contents of this file

### For contributors

- [Code of conduct](#code-of-conduct)
- [Application architecture](#application-architecture-and-design)
- [Usage](#usage)
- [Testing](#testing)
- [Conventions to follow](#conventions-to-follow)

### For maintainers

- [Releasing a new version](#releasing-a-new-version)

## Code of Conduct

Please read [the `govuk-one-login` CODE_OF_CONDUCT.md](https://github.com/govuk-one-login/.github/blob/main/CODE_OF_CONDUCT.md) before contributing.

## Application architecture and design

See [architecture](/docs/architecture.md) for an overview of the directories in this repository.

## Usage

See [usage](/docs/usage.md).

## Testing

We use [@sourcemeta/jsonschema](https://github.com/sourcemeta/jsonschema) for schema validation and testing.

- `npm test` — runs schema unit tests in `test/`
- `npm run validate:schemas` — validates schemas against the JSON Schema meta-schema
- `npm run validate:lint` — lints schema files

Test files use the `@sourcemeta/jsonschema` test format. Each test file targets the schema and provides `data` or `dataPath` with a `valid` boolean.

## Conventions to follow

### Indentation and whitespace

[EditorConfig](https://editorconfig.org/), [pre-commit](https://pre-commit.com/) and [prettier](https://prettier.io/) are used to enforce formatting standards. This is generally 2-space, soft-tabs only. No trailing whitespace.

## Commit hygiene

Please see the [GDS way guidance on commit messages under the 'Working with Git' page](https://gds-way.digital.cabinet-office.gov.uk/standards/source-code/working-with-git.html#default-branch-name), which describes how we prefer Git history and commit messages to read.

When writing commit message content, follow [conventional commits](https://www.conventionalcommits.org/):

```
feat: add new check-type for performance testing
fix: correct phase enum for library SDK model
docs: update README with installation instructions
```

## Releasing a new version

To release a new version, create a new tag using the GitHub UI, in the format of `v0.0.0`
