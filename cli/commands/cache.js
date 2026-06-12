import { clearCache, CACHE_DIR } from "../utils/resolve-schema.js";

export const command = "cache <action>";
export const describe = "Manage the schema cache";

export function builder(yargs) {
  yargs.positional("action", {
    describe: "Cache action to perform",
    choices: ["clear"],
  });
}

export function handler(argv) {
  if (argv.action === "clear") {
    clearCache();
    console.log("Cache cleared:", CACHE_DIR);
  }
}
