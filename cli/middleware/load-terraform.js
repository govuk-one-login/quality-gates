import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { existsSync } from "node:fs";

export function loadTerraform(argv) {
  const tfFiles = new Set();
  for (const service of argv.manifest?.services ?? []) {
    for (const check of service.checks ?? []) {
      if (check.provider === "Terraform" && check.config?.file?.endsWith(".tf")) {
        tfFiles.add(check.config.file);
      }
    }
  }

  if (tfFiles.size === 0) {
    argv.terraform = {};
    return;
  }

  if (!isHcl2jsonAvailable()) {
    argv.terraform = null;
    return;
  }

  argv.terraform = {};
  for (const file of tfFiles) {
    const fullPath = join(argv.directory, file);
    if (!existsSync(fullPath)) continue;
    try {
      const json = execFileSync("hcl2json", [fullPath], { encoding: "utf8", stdio: "pipe" });
      argv.terraform[file] = JSON.parse(json);
    } catch {
      argv.terraform[file] = null;
    }
  }
}

function isHcl2jsonAvailable() {
  try {
    execFileSync("hcl2json", ["--version"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
