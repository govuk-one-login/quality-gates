#!/usr/bin/env node
import { existsSync } from "node:fs";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { loadManifestAndWorkflows } from "./filesystem.js";
import { findMissingWorkflows } from "./validators/missing-workflows.js";
import { findMismatchedJobs } from "./validators/mismatched-jobs.js";
import { formatText } from "./formatters/text.js";
import { formatJson } from "./formatters/json.js";

const formatters = { text: formatText, json: formatJson };

const cli = yargs(hideBin(process.argv))
  .command(
    "$0 [directory]",
    "Validate quality gate manifest against workflows",
    (yargs) => {
      yargs.positional("directory", {
        describe: "Project directory to validate",
        type: "string",
        default: ".",
      });
    },
    (argv) => {
      const data = loadManifestAndWorkflows(argv.directory);
      const errors = [
        ...findMissingWorkflows(data),
        ...findMismatchedJobs(data),
      ];
      const output = formatters[argv.format](errors);
      console.log(output);
      process.exitCode = errors.length ? 1 : 0;
    }
  )
  .option("format", {
    choices: ["text", "json"],
    default: "text",
    describe: "Output format",
  })
  .option("verbose", {
    alias: "v",
    type: "boolean",
    describe: "Run with verbose logging",
  })
  .check((argv) => {
    if (!existsSync(argv.directory)) {
      throw new Error(`Directory not found: ${argv.directory}`);
    }
    return true;
  })
  .usage("Usage: $0 [directory] [options]")
  .example("$0", "Validate current directory")
  .example("$0 ../my-repo", "Validate a specific project")
  .example("$0 . --format json", "Output as JSON")
  .strict()
  .epilog("Exit codes:\n  0 = valid\n  1 = validation errors found");

await cli.parse();
