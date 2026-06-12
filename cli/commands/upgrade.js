import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { parseVersion, getTransforms, versionString, latestVersion } from "../upgrades/index.js";

export const command = "upgrade [path]";
export const describe = "Upgrade manifest files to a newer schema version";

export function builder(yargs) {
  yargs
    .positional("path", {
      describe: "Path to manifest file or directory",
      type: "string",
      default: ".",
    })
    .option("dry-run", {
      alias: "d",
      describe: "Preview changes without writing",
      type: "boolean",
      default: false,
    })
    .option("verbose", {
      describe: "Show full diffs (use with --dry-run)",
      type: "boolean",
      default: false,
    });
}

function findManifests(dir) {
  const results = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) results.push(...findManifests(full));
    else if (entry.name === "quality-gate.manifest.json") results.push(full);
  }
  return results;
}

function diffLines(oldJson, newJson) {
  const oldLines = oldJson.split("\n");
  const newLines = newJson.split("\n");
  const output = [];
  const max = Math.max(oldLines.length, newLines.length);
  for (let i = 0; i < max; i++) {
    if (oldLines[i] === newLines[i]) continue;
    if (oldLines[i] !== undefined) output.push(`- ${oldLines[i]}`);
    if (newLines[i] !== undefined) output.push(`+ ${newLines[i]}`);
  }
  return output.join("\n");
}

export function handler(argv) {
  const target = resolve(argv.path);
  const stat = statSync(target, { throwIfNoEntry: false });
  if (!stat) {
    console.error(`Path not found: ${argv.path}`);
    process.exitCode = 2;
    return;
  }

  const files = stat.isDirectory() ? findManifests(target) : [target];
  if (files.length === 0) {
    console.error("No manifest files found.");
    process.exitCode = 2;
    return;
  }

  let upgraded = 0;
  let skipped = 0;

  for (const file of files) {
    const raw = readFileSync(file, "utf8");
    const manifest = JSON.parse(raw);
    const sourceVersion = parseVersion(manifest.$schema);

    if (!sourceVersion) {
      skipped++;
      continue;
    }

    const applicable = getTransforms(sourceVersion);

    if (applicable.length === 0) {
      skipped++;
      continue;
    }

    let result = manifest;
    for (const { transform } of applicable) {
      result = transform(result);
    }

    const newJson = JSON.stringify(result, null, 2) + "\n";
    const rel = relative(process.cwd(), file);

    if (argv.dryRun) {
      const from = sourceVersion ? `v${versionString(sourceVersion)}` : "unknown";
      console.log(`${rel}: ${from} → v${versionString(latestVersion)}`);
      if (argv.verbose) {
        console.log(diffLines(raw, newJson));
        console.log();
      }
    } else {
      writeFileSync(file, newJson);
      console.log(`✓ ${rel}`);
    }
    upgraded++;
  }

  if (argv.dryRun) {
    console.log(`\n${upgraded} file(s) to upgrade, ${skipped} already current.`);
  } else {
    console.log(`\n${upgraded} file(s) upgraded, ${skipped} already current.`);
  }
}
