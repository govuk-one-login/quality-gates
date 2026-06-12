#!/usr/bin/env node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as checkReferences from "./commands/check-references.js";
import * as validate from "./commands/validate.js";
import * as cache from "./commands/cache.js";
import * as upgrade from "./commands/upgrade.js";

const cli = yargs(hideBin(process.argv))
  .command(checkReferences)
  .command(validate)
  .command(cache)
  .command(upgrade)
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
  .demandCommand(1, "Please specify a command")
  .strict()
  .usage("Usage: $0 <command> [options]")
  .epilog("Exit codes:\n  0 = valid\n  1 = validation errors found\n  2 = configuration error");

await cli.parse();
