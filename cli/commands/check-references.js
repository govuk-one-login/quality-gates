import { existsSync } from "node:fs";
import { loadManifest } from "../middleware/load-manifest.js";
import { loadWorkflows } from "../middleware/load-workflows.js";
import { findMissingWorkflows } from "../validators/missing-workflows.js";
import { findMismatchedJobs } from "../validators/mismatched-jobs.js";
import { formatText } from "../formatters/text.js";
import { formatJson } from "../formatters/json.js";

const formatters = { text: formatText, json: formatJson };

export const command = "check-references [directory]";
export const describe = "Validate quality gate manifest references against workflow files";

export function builder(yargs) {
  yargs
    .positional("directory", {
      describe: "Project directory to validate",
      type: "string",
      default: ".",
    })
    .check((argv) => {
      if (!existsSync(argv.directory)) {
        throw new Error(`Directory not found: ${argv.directory}`);
      }
      return true;
    })
    .middleware([loadManifest, loadWorkflows])
    .example("$0 check-references", "Validate current directory")
    .example("$0 check-references ../my-repo", "Validate a specific project")
    .example("$0 check-references . --format json", "Output as JSON");
}

export function handler(argv) {
  if (!argv.manifest) {
    console.error("No quality-gate.manifest.json found in", argv.directory);
    process.exitCode = 2;
    return;
  }
  const data = { manifest: argv.manifest, workflows: argv.workflows };
  const errors = [
    ...findMissingWorkflows(data),
    ...findMismatchedJobs(data),
  ];
  const output = formatters[argv.format](errors);
  console.log(output);
  process.exitCode = errors.length ? 1 : 0;
}
