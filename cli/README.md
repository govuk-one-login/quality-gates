# Quality Gates - CLI

This is a CLI to provide 3 main features:
- validate manifests against schema versions
- check that file and path references in manifests resolve correctly
- incrementally upgrade manifests to the latest version of the schema

It is written in JavaScript using [Yargs](https://github.com/yargs/yargs).
It also has a requirement on [hcl2json](https://github.com/tmccombs/hcl2json) which can be installed using [Homebrew](https://github.com/tmccombs/hcl2json) or [mise-en-place](https://github.com/tmccombs/hcl2json)

## Example Usage

### Help

```bash
node index.js
Usage: index.js <command> [options]

Commands:
  index.js check-references [directory]  Validate quality gate manifest
                                         references against workflow and
                                         Terraform files
  index.js validate [path]               Validate a manifest file against its
                                         JSON Schema
  index.js cache <action>                Manage the schema cache
  index.js upgrade [path]                Upgrade manifest files to a newer
                                         schema version

Options:
      --help     Show help                                             [boolean]
      --version  Show version number                                   [boolean]
      --format   Output format       [choices: "text", "json"] [default: "text"]
  -v, --verbose  Run with verbose logging                              [boolean]

Exit codes:
  0 = valid
  1 = validation errors found
  2 = configuration error

Please specify a command
```

### Check References

#### No validation errors
```bash
$ node index.js check-references ../../repository-with-valid-manifest

✅ No validation errors found.
````

#### Incorrect Job

```bash
$ node index.js check-refernces ../../repository-with-invalid-job
Found 1 validation error:

❌ Job not found: $.jobs.visual-tests
   Service: GenericService
   Workflow: check-pr.yml
   Did you mean: $.jobs.unit-tests?
   Available jobs: code-quality, unit-tests, browser-tests

```
