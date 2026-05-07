import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { formatJson } from "./json.js";

describe("formatJson", () => {
  it("returns valid JSON with summary and errors", () => {
    const errors = [
      { type: "missing-workflow", service: "svc", message: "m", details: {} },
      { type: "mismatched-job", service: "svc", message: "m", details: {} },
      { type: "mismatched-job", service: "svc", message: "m", details: {} },
    ];
    const result = JSON.parse(formatJson(errors));
    assert.equal(result.summary.total, 3);
    assert.equal(result.summary.byType["missing-workflow"], 1);
    assert.equal(result.summary.byType["mismatched-job"], 2);
    assert.equal(result.errors.length, 3);
  });

  it("returns zero totals for empty errors", () => {
    const result = JSON.parse(formatJson([]));
    assert.equal(result.summary.total, 0);
    assert.deepEqual(result.errors, []);
  });
});
