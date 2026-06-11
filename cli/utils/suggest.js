import { levenshtein } from "./levenshtein.js";

export function suggest(input, candidates) {
  if (!candidates.length) return null;

  let best = null;
  let bestScore = Infinity;

  const inputParts = new Set(input.split(/[-_./]/));

  for (const candidate of candidates) {
    const dist = levenshtein(input, candidate);
    const candidateParts = new Set(candidate.split(/[-_./]/));
    const shared = [...inputParts].filter((p) => candidateParts.has(p)).length;
    const score = dist - shared * 2;
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  }

  const threshold = Math.ceil(input.length * 0.5);
  return levenshtein(input, best) <= threshold ? best : null;
}
