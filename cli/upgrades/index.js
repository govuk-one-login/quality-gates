import { transform as v050 } from "./v0.5.0.js";
import { transform as v070 } from "./v0.7.0.js";
import { transform as v090 } from "./v0.9.0.js";

const SCHEMA_URL_PREFIX = "https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v";

const transforms = [
  { version: [0, 5, 0], transform: v050 },
  { version: [0, 7, 0], transform: v070 },
  { version: [0, 9, 0], transform: v090 },
];

export function parseVersion(schema) {
  const match = schema?.match(/refs\/tags\/v(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersions(a, b) {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return 0;
}

export function getTransforms(sourceVersion) {
  if (!sourceVersion) return transforms;
  return transforms.filter((t) => compareVersions(t.version, sourceVersion) > 0);
}

export function versionString(v) {
  return v.join(".");
}

export function schemaUrl(version) {
  return `${SCHEMA_URL_PREFIX}${version}/schemas/schema.json`;
}

export const latestVersion = transforms[transforms.length - 1].version;
