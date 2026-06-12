import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolveSchema } from "../utils/resolve-schema.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const binPath = resolve(__dirname, "..", "node_modules", ".bin", "jsonschema");

export const command = "validate [path]";
export const describe = "Validate a manifest file against its JSON Schema";

export function builder(yargs) {
  yargs
    .positional("path", {
      describe: "Path to manifest file or directory containing quality-gate.manifest.json",
      type: "string",
      default: ".",
    })
    .option("schema", {
      describe: "Override schema URL or path (defaults to $schema field in manifest)",
      type: "string",
    })
    .option("force", {
      alias: "f",
      describe: "Force re-download of cached schemas",
      type: "boolean",
      default: false,
    })
    .example("$0 validate", "Validate manifest in current directory")
    .example("$0 validate ../my-repo", "Validate manifest in another directory")
    .example("$0 validate manifest.json --schema https://example.com/schema.json", "Validate with a custom schema URL");
}

export function handler(argv) {
  const manifestPath = resolveManifestPath(argv.path);
  if (!manifestPath) {
    console.error(`Manifest not found: ${argv.path}`);
    process.exitCode = 2;
    return;
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const schemaRef = argv.schema || manifest.$schema;
  if (!schemaRef) {
    console.error("No schema specified. Provide --schema or add $schema to the manifest.");
    process.exitCode = 2;
    return;
  }

  let schemaPath, cleanup;
  try {
    ({ schemaPath, cleanup } = resolveSchema(schemaRef, dirname(manifestPath), { force: argv.force }));
  } catch {
    console.error(`Failed to resolve schema: ${schemaRef}`);
    process.exitCode = 2;
    return;
  }

  if (!existsSync(schemaPath)) {
    cleanup();
    console.error(`Schema file not found: ${schemaPath}`);
    process.exitCode = 2;
    return;
  }

  try {
    const args = ["validate", schemaPath, manifestPath];
    if (argv.verbose) args.push("--verbose");
    if (argv.format === "json") args.push("--json");

    const result = spawnSync(binPath, args, { stdio: "pipe", encoding: "utf8" });

    if (result.error) {
      console.error("jsonschema binary not found. Run: npm install @sourcemeta/jsonschema");
      process.exitCode = 2;
      return;
    }

    if (result.stdout) console.log(result.stdout.trimEnd());
    if (result.stderr) console.error(result.stderr.trimEnd());
    process.exitCode = result.status;
  } finally {
    cleanup();
  }
}

function resolveManifestPath(inputPath) {
  const resolved = resolve(inputPath);
  if (existsSync(resolved) && resolved.endsWith(".json")) return resolved;
  const withDefault = join(resolved, "quality-gate.manifest.json");
  if (existsSync(withDefault)) return withDefault;
  return null;
}
