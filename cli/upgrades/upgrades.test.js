import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseVersion, getTransforms, schemaUrl } from "./index.js";
import { transform as v050 } from "./v0.5.0.js";
import { transform as v070 } from "./v0.7.0.js";

describe("parseVersion", () => {
  it("extracts version from schema URL", () => {
    assert.deepEqual(
      parseVersion("https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.4.0/schemas/schema.json"),
      [0, 4, 0],
    );
  });
  it("returns null for local paths", () => {
    assert.equal(parseVersion("./schemas/schema.json"), null);
  });
});

describe("getTransforms", () => {
  it("returns all transforms for null version", () => {
    assert.equal(getTransforms(null).length, 2);
  });
  it("returns both transforms for v0.1.0", () => {
    assert.equal(getTransforms([0, 1, 0]).length, 2);
  });
  it("returns only v0.7.0 for v0.5.0", () => {
    const t = getTransforms([0, 5, 0]);
    assert.equal(t.length, 1);
  });
  it("returns nothing for v0.7.0", () => {
    assert.equal(getTransforms([0, 7, 0]).length, 0);
  });
});

describe("v0.5.0 transform", () => {
  it("renames kebab-case keys to camelCase", () => {
    const input = {
      $schema: "https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.2.0/schemas/schema.json",
      services: [{
        "service-tag": "my-service",
        "quality-gates": [{
          "check-types": ["unit"],
          phase: "pre-merge",
          provider: "GitHub",
          config: { file: "test.yml" },
        }],
      }],
    };
    const result = v050(input);
    assert.equal(result.services[0].serviceTag, "my-service");
    assert.deepEqual(result.services[0].qualityGates[0].checkTypes, ["unit"]);
    assert.equal(result.$schema, schemaUrl("0.5.0"));
  });

  it("handles already camelCase keys", () => {
    const input = {
      $schema: "old",
      services: [{ serviceTag: "x", qualityGates: [{ checkTypes: ["unit"], phase: "pre-merge", provider: "GitHub", config: { file: "a.yml" } }] }],
    };
    const result = v050(input);
    assert.equal(result.services[0].serviceTag, "x");
  });
});

describe("v0.7.0 transform", () => {
  it("infers securePipelines by default", () => {
    const input = {
      $schema: schemaUrl("0.5.0"),
      services: [{ serviceTag: "svc", qualityGates: [{ checkTypes: ["unit"], phase: "pre-merge", provider: "GitHub", config: { file: "a.yml" } }] }],
    };
    const result = v070(input);
    assert.equal(result.services[0].promotionType, "securePipelines");
  });

  it("infers gitFlow when develop phase present", () => {
    const input = {
      $schema: schemaUrl("0.5.0"),
      services: [{ serviceTag: "svc", qualityGates: [{ checkTypes: ["unit"], phase: "develop", provider: "GitHub", config: { file: "a.yml" } }] }],
    };
    assert.equal(v070(input).services[0].promotionType, "gitFlow");
  });

  it("infers library when pre-release phase present", () => {
    const input = {
      $schema: schemaUrl("0.5.0"),
      services: [{ serviceTag: "svc", qualityGates: [
        { checkTypes: ["unit"], phase: "pre-merge", provider: "GitHub", config: { file: "a.yml" } },
        { checkTypes: ["unit"], phase: "pre-release", provider: "GitHub", config: { file: "b.yml" } },
      ] }],
    };
    assert.equal(v070(input).services[0].promotionType, "library");
  });

  it("preserves existing promotionType", () => {
    const input = {
      $schema: schemaUrl("0.5.0"),
      services: [{ serviceTag: "svc", promotionType: "gitFlow", qualityGates: [] }],
    };
    assert.equal(v070(input).services[0].promotionType, "gitFlow");
  });
});

describe("full pipeline", () => {
  it("upgrades v0.1.0 manifest to v0.7.0", () => {
    const input = {
      $schema: "https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.1.0/schemas/schema.json",
      services: [{
        "service-tag": "fraud-ticf-cri",
        "quality-gates": [
          { "check-types": ["integration"], phase: "pre-merge", provider: "GitHub", config: { file: "test.yml" } },
        ],
      }],
    };

    const transforms = getTransforms(parseVersion(input.$schema));
    let result = input;
    for (const { transform } of transforms) {
      result = transform(result);
    }

    assert.equal(result.$schema, schemaUrl("0.7.0"));
    assert.equal(result.services[0].serviceTag, "fraud-ticf-cri");
    assert.equal(result.services[0].promotionType, "securePipelines");
    assert.deepEqual(result.services[0].qualityGates[0].checkTypes, ["integration"]);
  });
});
