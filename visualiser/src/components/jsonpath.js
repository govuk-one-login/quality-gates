const JOB_DOT = /^\$\.jobs\.([a-zA-Z_][\w-]*)$/;
const JOB_BRACKET = /^\$\.jobs\['([^']+)'\]$/;
const STEP_DOT = /^\$\.jobs\.([a-zA-Z_][\w-]*)\.steps\[\?@\.(id|name)=='(.+)'\]$/;
const STEP_BRACKET = /^\$\.jobs\['([^']+)'\]\.steps\[\?@\.(id|name)=='(.+)'\]$/;

const LEGACY_JOB = /^jobs\.([a-zA-Z_][\w-]*)$/;
const LEGACY_STEP = /^jobs\.([a-zA-Z_][\w-]*)\.steps\[\?@\.(id|name)=='(.+)'\]$/;

export function parseCheckPath(path) {
  if (!path) return { valid: false };

  let m;
  if ((m = path.match(STEP_DOT)) || (m = path.match(STEP_BRACKET)) || (m = path.match(LEGACY_STEP))) {
    return { valid: true, job: m[1], step: { by: m[2], value: m[3] } };
  }
  if ((m = path.match(JOB_DOT)) || (m = path.match(JOB_BRACKET)) || (m = path.match(LEGACY_JOB))) {
    return { valid: true, job: m[1], step: null };
  }
  return { valid: false };
}

export function isValidJsonPath(path) {
  return typeof path === "string" && path.startsWith("$");
}
