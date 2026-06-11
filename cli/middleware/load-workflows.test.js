import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { loadWorkflows } from "./load-workflows.js";

describe("loadWorkflows", () => {
  it("sets argv.workflows to array of {name, jobs} when dir exists", () => {
    const argv = { directory: ".." };
    loadWorkflows(argv);
    assert.ok(Array.isArray(argv.workflows));
    assert.ok(argv.workflows.length > 0);
    assert.ok(argv.workflows[0].name);
    assert.ok(typeof argv.workflows[0].jobs === "object");
  });

  it("sets argv.workflows to [] when dir does not exist", () => {
    const argv = { directory: "/nonexistent" };
    loadWorkflows(argv);
    assert.deepEqual(argv.workflows, []);
  });
});
