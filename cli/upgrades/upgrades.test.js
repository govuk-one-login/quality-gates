import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { parseVersion, getTransforms, schemaUrl } from "./index.js";
import { transform as v050 } from "./v0.5.0.js";
import { transform as v070 } from "./v0.7.0.js";
import { transform as v090 } from "./v0.9.0.js";
import { transform as v0100 } from "./v0.10.0.js";
import { transform as v0110 } from "./v0.11.0.js";
import { transform as v0120 } from "./v0.12.0.js";
import { transform as v0130 } from "./v0.13.0.js";

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
    assert.equal(getTransforms(null).length, 7);
  });
  it("returns all transforms for v0.1.0", () => {
    assert.equal(getTransforms([0, 1, 0]).length, 7);
  });
  it("returns v0.7.0 through v0.13.0 for v0.5.0", () => {
    const t = getTransforms([0, 5, 0]);
    assert.equal(t.length, 6);
  });
  it("returns v0.9.0 through v0.13.0 for v0.7.0", () => {
    assert.equal(getTransforms([0, 7, 0]).length, 5);
  });
  it("returns v0.10.0 through v0.13.0 for v0.9.0", () => {
    assert.equal(getTransforms([0, 9, 0]).length, 4);
  });
  it("returns v0.11.0 through v0.13.0 for v0.10.0", () => {
    assert.equal(getTransforms([0, 10, 0]).length, 3);
  });
  it("returns v0.12.0 and v0.13.0 for v0.11.0", () => {
    assert.equal(getTransforms([0, 11, 0]).length, 2);
  });
  it("returns only v0.13.0 for v0.12.0", () => {
    assert.equal(getTransforms([0, 12, 0]).length, 1);
  });
  it("returns nothing for v0.13.0", () => {
    assert.equal(getTransforms([0, 13, 0]).length, 0);
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

describe("v0.9.0 transform", () => {
    it("infers Stack Orchestration Tool when StackOrchestrator provider present", () => {
        const input = {
            $schema: schemaUrl("0.7.0"),
            services: [{ serviceTag: "svc", qualityGates: [{ checkTypes: ["unit"], phase: "develop", provider: "Stack Orchestrator", config: { file: "a.yml" } }] }],
        };
        assert.equal(v090(input).services[0].qualityGates[0].provider, "Stack Orchestration Tool");
    });

    it("preserves provider by default", () => {
        const input = {
            $schema: schemaUrl("0.7.0"),
            services: [{ serviceTag: "svc", qualityGates: [{ checkTypes: ["unit"], phase: "pre-merge", provider: "GitHub", config: { file: "a.yml" } }] }],
        };
        assert.equal(v090(input).services[0].qualityGates[0].provider, "GitHub");
    });
});

describe("v0.10.0 transform", () => {
  it("renames qualityGates to checks", () => {
    const input = {
      $schema: schemaUrl("0.9.0"),
      services: [{ serviceTag: "svc", promotionType: "securePipelines", qualityGates: [{ checkTypes: ["unit"], phase: "pre-merge", provider: "GitHub", config: { file: "a.yml" } }] }],
    };
    const result = v0100(input);
    assert.deepEqual(result.services[0].checks[0].checkTypes, ["unit"]);
    assert.equal(result.services[0].qualityGates, undefined);
    assert.equal(result.$schema, schemaUrl("0.10.0"));
  });
});

describe("v0.11.0 transform", () => {
  it("converts jobs.x path to $.jobs.x", () => {
    const input = {
      $schema: schemaUrl("0.10.0"),
      services: [{ serviceTag: "svc", promotionType: "securePipelines", checks: [{ checkTypes: ["unit"], phase: "pre-merge", provider: "GitHub", config: { file: "a.yml", path: "jobs.run-tests" } }] }],
    };
    const result = v0110(input);
    assert.equal(result.services[0].checks[0].config.path, "$.jobs.run-tests");
    assert.equal(result.$schema, schemaUrl("0.11.0"));
  });

  it("leaves already-prefixed paths unchanged", () => {
    const input = {
      $schema: schemaUrl("0.10.0"),
      services: [{ serviceTag: "svc", promotionType: "securePipelines", checks: [{ checkTypes: ["unit"], phase: "pre-merge", provider: "GitHub", config: { file: "a.yml", path: "$.jobs.foo" } }] }],
    };
    assert.equal(v0110(input).services[0].checks[0].config.path, "$.jobs.foo");
  });

  it("removes config.name and config.jobName", () => {
    const input = {
      $schema: schemaUrl("0.10.0"),
      services: [{ serviceTag: "svc", promotionType: "securePipelines", checks: [{ checkTypes: ["unit"], phase: "pre-merge", provider: "GitHub", config: { file: "a.yml", path: "jobs.test", name: "Run tests", jobName: "test" } }] }],
    };
    const result = v0110(input);
    assert.equal(result.services[0].checks[0].config.name, undefined);
    assert.equal(result.services[0].checks[0].config.jobName, undefined);
  });

  it("handles checks without path", () => {
    const input = {
      $schema: schemaUrl("0.10.0"),
      services: [{ serviceTag: "svc", promotionType: "securePipelines", checks: [{ checkTypes: ["unit"], phase: "pre-merge", provider: "Terraform", config: { file: "main.tf" } }] }],
    };
    const result = v0110(input);
    assert.equal(result.services[0].checks[0].config.path, undefined);
    assert.equal(result.services[0].checks[0].config.file, "main.tf");
  });
});

describe("v0.12.0 transform", () => {
  it("bumps schema URL to v0.12.0 and preserves data", () => {
    const input = {
      $schema: schemaUrl("0.11.0"),
      services: [{ serviceTag: "svc", promotionType: "securePipelines", checks: [{ checkTypes: ["unit"], phase: "pre-merge", provider: "GitHub", config: { file: "a.yml", path: "$.jobs.test" } }] }],
    };
    const result = v0120(input);
    assert.equal(result.$schema, schemaUrl("0.12.0"));
    assert.deepEqual(result.services, input.services);
  });
});

describe("v0.13.0 transform", () => {
  it("renames serviceTag to product and adds component", () => {
    const input = {
      $schema: schemaUrl("0.12.0"),
      services: [{ serviceTag: "svc", promotionType: "securePipelines", checks: [{ checkTypes: ["unit"], phase: "pre-merge", provider: "GitHub", config: { file: "a.yml", path: "$.jobs.test" } }] }],
    };
    const result = v0130(input);
    assert.equal(result.$schema, schemaUrl("0.13.0"));
    assert.equal(result.services[0].product, "svc");
    assert.equal(result.services[0].component, "svc");
    assert.equal(result.services[0].serviceTag, undefined);
  });
});

describe("full pipeline", () => {
  it("upgrades v0.1.0 manifest to v0.13.0", () => {
    const input = {
      $schema: "https://raw.githubusercontent.com/govuk-one-login/quality-gates/refs/tags/v0.1.0/schemas/schema.json",
      services: [{
        "service-tag": "example",
        "quality-gates": [
          { "check-types": ["integration"], phase: "pre-merge", provider: "Stack Orchestrator", config: { file: "test.yml", path: "jobs.build", name: "Build" } },
        ],
      }],
    };

    const transforms = getTransforms(parseVersion(input.$schema));
    let result = input;
    for (const { transform } of transforms) {
      result = transform(result);
    }

    assert.equal(result.$schema, schemaUrl("0.13.0"));
    assert.equal(result.services[0].product, "example");
    assert.equal(result.services[0].component, "example");
    assert.equal(result.services[0].serviceTag, undefined);
    assert.equal(result.services[0].promotionType, "securePipelines");
    assert.deepEqual(result.services[0].checks[0].checkTypes, ["integration"]);
    assert.deepEqual(result.services[0].checks[0].provider, "Stack Orchestration Tool");
    assert.equal(result.services[0].checks[0].config.path, "$.jobs.build");
    assert.equal(result.services[0].checks[0].config.name, undefined);
  });
});
