import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCheckLevelGrid, buildIntegrationScopeGrid } from "./status-grid-data.js";

function makeService(overrides) {
  return {
    component: "frontend",
    promotionType: "securePipelines",
    repository: "repo-a",
    ...overrides,
  };
}

describe("buildCheckLevelGrid", () => {
  const phasesByPromotionType = {
    securePipelines: ["pre-merge", "build", "staging", "production"],
    gitFlow: ["pre-develop", "develop", "pre-release", "release", "main"],
    library: ["pre-merge", "pre-release"],
    other: ["pre-merge", "build", "staging", "production", "pre-develop", "develop", "pre-release", "release", "main"],
  };

  it("returns empty groups when services array is empty", () => {
    const result = buildCheckLevelGrid("svc-a", [], [], phasesByPromotionType);
    assert.deepEqual(result, { groups: [] });
  });

  it("produces a group per promotionType", () => {
    const services = [
      makeService({ component: "frontend", promotionType: "securePipelines" }),
      makeService({ component: "sdk", promotionType: "library" }),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups.length, 2);
    assert.equal(result.groups[0].title, "svc-a");
    assert.equal(result.groups[0].subtitle, "library");
    assert.equal(result.groups[1].title, "svc-a");
    assert.equal(result.groups[1].subtitle, "securePipelines");
  });

  it("marks a check as implemented when present in automated", () => {
    const services = [
      makeService({
        automated: [
          { checks: [{ name: "unit" }], phase: "pre-merge", provider: "GitHub", file: "ci.yml" },
        ],
      }),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells[0].status, "implemented");
  });

  it("marks a check as implemented when present in manual", () => {
    const services = [
      makeService({
        manual: [
          { checks: [{ name: "accessibility" }], phase: "staging", details: ["manual audit"] },
        ],
      }),
    ];
    const levelGroups = [{ name: "A", phase: "staging", checks: ["accessibility"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells[0].status, "implemented");
  });

  it("marks a check as implemented when present in outOfBand", () => {
    const services = [
      makeService({
        outOfBand: [
          { checks: [{ name: "integration" }], phase: "production", provider: "GitHub", file: "smoke.yml" },
        ],
      }),
    ];
    const levelGroups = [{ name: "A", phase: "production", checks: ["integration"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells[0].status, "implemented");
  });

  it("marks a check as missing when not present", () => {
    const services = [makeService({ automated: [] })];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells[0].status, "missing");
  });

  it("marks a check as notApplicable when listed in notApplicable", () => {
    const services = [
      makeService({
        automated: [],
        notApplicable: [
          { checks: [{ name: "visual regression", details: ["No UI"] }] },
        ],
      }),
    ];
    const levelGroups = [{ name: "B", phase: "pre-merge", checks: ["visual regression"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells[0].status, "notApplicable");
  });

  it("implemented takes priority over notApplicable", () => {
    const services = [
      makeService({
        automated: [
          { checks: [{ name: "unit" }], phase: "pre-merge", provider: "GitHub", file: "ci.yml" },
        ],
        notApplicable: [
          { checks: [{ name: "unit", details: ["Contradictory"] }] },
        ],
      }),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells[0].status, "implemented");
  });

  it("only includes phases that exist in both promotionType and levelGroups", () => {
    const services = [makeService({ promotionType: "library", automated: [] })];
    const levelGroups = [
      { name: "S", phase: "pre-merge", checks: ["unit"] },
      { name: "A", phase: "build", checks: ["code quality"] },
    ];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    const categories = result.groups[0].columns.categories;
    assert.equal(categories.length, 1);
    assert.equal(categories[0].name, "pre-merge");
  });

  it("includes repositories in the row meta", () => {
    const services = [
      makeService({ repository: "repo-a" }),
      makeService({ repository: "repo-b" }),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].meta, "repo-a, repo-b");
  });

  it("sorts components alphabetically within a group", () => {
    const services = [
      makeService({ component: "zebra" }),
      makeService({ component: "alpha" }),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].label, "alpha");
    assert.equal(result.groups[0].rows[1].label, "zebra");
  });

  it("notApplicable applies across all phases for that check", () => {
    const services = [
      makeService({
        automated: [],
        notApplicable: [
          { checks: [{ name: "unit", details: ["No logic"] }] },
        ],
      }),
    ];
    const levelGroups = [
      { name: "S", phase: "pre-merge", checks: ["unit"] },
      { name: "A", phase: "build", checks: ["unit"] },
    ];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells[0].status, "notApplicable");
    assert.equal(result.groups[0].rows[0].cells[1].status, "notApplicable");
  });

  it("produces multiple column items when a level group has multiple checks", () => {
    const services = [
      makeService({
        automated: [
          { checks: [{ name: "unit" }], phase: "pre-merge", provider: "GitHub", file: "ci.yml" },
        ],
      }),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["code quality", "unit", "vulnerability detection"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    const category = result.groups[0].columns.categories[0];
    assert.equal(category.name, "pre-merge");
    assert.deepEqual(category.items, ["code quality", "unit", "vulnerability detection"]);

    assert.equal(result.groups[0].rows[0].cells[0].status, "missing");
    assert.equal(result.groups[0].rows[0].cells[1].status, "implemented");
    assert.equal(result.groups[0].rows[0].cells[2].status, "missing");
  });

  it("deduplicates checks when multiple level groups reference the same phase", () => {
    const services = [makeService({ automated: [] })];
    const levelGroups = [
      { name: "S", phase: "pre-merge", checks: ["unit", "code quality"] },
      { name: "A", phase: "pre-merge", checks: ["unit", "vulnerability detection"] },
    ];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    const category = result.groups[0].columns.categories[0];
    assert.deepEqual(category.items, ["code quality", "unit", "vulnerability detection"]);
    assert.equal(result.groups[0].rows[0].cells.length, 3);
  });

  it("handles the 'other' promotionType with its union of all phases", () => {
    const services = [
      makeService({
        promotionType: "other",
        automated: [
          { checks: [{ name: "unit" }], phase: "pre-merge", provider: "GitHub", file: "ci.yml" },
          { checks: [{ name: "unit" }], phase: "develop", provider: "GitHub", file: "ci.yml" },
        ],
      }),
    ];
    const levelGroups = [
      { name: "S", phase: "pre-merge", checks: ["unit"] },
      { name: "A", phase: "develop", checks: ["unit"] },
    ];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    const categoryNames = result.groups[0].columns.categories.map(c => c.name);
    assert.ok(categoryNames.includes("pre-merge"));
    assert.ok(categoryNames.includes("develop"));
    const cells = result.groups[0].rows[0].cells;
    assert.ok(cells.every(c => c.status === "implemented"));
  });

  it("handles a service with no check bucket properties at all", () => {
    const services = [makeService({})];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups.length, 1);
    assert.equal(result.groups[0].rows[0].label, "frontend");
    assert.equal(result.groups[0].rows[0].cells[0].status, "missing");
  });

  it("cell array length equals total checks across all applicable phases", () => {
    const services = [makeService({ automated: [] })];
    const levelGroups = [
      { name: "S", phase: "pre-merge", checks: ["unit", "code quality"] },
      { name: "A", phase: "build", checks: ["vulnerability detection"] },
      { name: "B", phase: "staging", checks: ["integration", "system"] },
    ];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells.length, 5);
  });

  it("cell title contains product, component, promotionType, phase, check, and status", () => {
    const services = [
      makeService({
        automated: [
          { checks: [{ name: "unit" }], phase: "pre-merge", provider: "GitHub", file: "ci.yml" },
        ],
      }),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    const title = result.groups[0].rows[0].cells[0].title;
    assert.match(title, /svc-a/);
    assert.match(title, /frontend/);
    assert.match(title, /securePipelines/);
    assert.match(title, /pre-merge/);
    assert.match(title, /unit/);
    assert.match(title, /implemented/);
  });

  it("cell title shows 'missing' status for missing checks", () => {
    const services = [makeService({ automated: [] })];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    const title = result.groups[0].rows[0].cells[0].title;
    assert.match(title, /missing/);
  });

  it("produces groups with empty categories and cells when levelGroups is empty", () => {
    const services = [makeService({ automated: [] })];
    const levelGroups = [];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups.length, 1);
    assert.equal(result.groups[0].columns.categories.length, 0);
    assert.equal(result.groups[0].rows[0].cells.length, 0);
  });
});

describe("buildIntegrationScopeGrid", () => {
  const phasesByPromotionType = {
    securePipelines: ["pre-merge", "build", "staging", "production"],
    library: ["pre-merge", "pre-release"],
  };
  const scopes = ["component", "product", "neighbour", "e2e"];
  const purposes = ["regression", "new feature", "smoke", "performance"];

  it("returns empty groups when services array is empty", () => {
    const result = buildIntegrationScopeGrid("svc-a", [], phasesByPromotionType, scopes, purposes);
    assert.deepEqual(result, { groups: [] });
  });

  it("produces a group even without integration checks", () => {
    const services = [makeService({ automated: [] })];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    assert.equal(result.groups.length, 1);
    assert.equal(result.groups[0].title, "svc-a");
  });

  it("rows are purposes including 'not specified'", () => {
    const services = [makeService({ automated: [] })];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    const rowLabels = result.groups[0].rows.map(r => r.label);
    assert.deepEqual(rowLabels, [...purposes, "not specified"]);
  });

  it("columns are phases (excluding pre-merge/pre-upload) with scopes including 'not specified'", () => {
    const services = [makeService({ automated: [] })];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    const categories = result.groups[0].columns.categories;
    assert.equal(categories.length, 3); // build, staging, production
    assert.equal(categories[0].name, "build");
    assert.deepEqual(categories[0].items, [...scopes, "not specified"]);
    assert.equal(categories[2].name, "production");
    assert.deepEqual(categories[2].items, [...scopes, "not specified"]);
  });

  it("marks cell as implemented when any component has that purpose at that phase/scope", () => {
    const services = [
      makeService({
        automated: [
          {
            checks: [{ name: "integration", scope: "e2e", purpose: ["smoke"] }],
            phase: "production",
            provider: "GitHub",
            file: "smoke.yml",
          },
        ],
      }),
    ];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    // phases (after filtering): build, staging, production
    // scopes per phase: component, product, neighbour, e2e, not specified (5)
    // production is phase index 2, e2e is scope index 3
    // cell index = (2 * 5) + 3 = 13
    const smokeRow = result.groups[0].rows[2]; // "smoke"
    assert.equal(smokeRow.cells[13].status, "implemented");
  });

  it("aggregates across components — any component implementing counts", () => {
    const services = [
      makeService({
        component: "frontend",
        automated: [
          {
            checks: [{ name: "integration", scope: "e2e", purpose: ["smoke"] }],
            phase: "production",
            provider: "GitHub",
            file: "smoke.yml",
          },
        ],
      }),
      makeService({
        component: "api",
        automated: [],
      }),
    ];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    const smokeRow = result.groups[0].rows[2];
    assert.equal(smokeRow.cells[13].status, "implemented");
  });

  it("marks non-matching purpose/phase/scope combinations as empty", () => {
    const services = [
      makeService({
        automated: [
          {
            checks: [{ name: "integration", scope: "e2e", purpose: ["smoke"] }],
            phase: "production",
            provider: "GitHub",
            file: "smoke.yml",
          },
        ],
      }),
    ];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    assert.equal(result.groups[0].rows[0].cells[0].status, "empty");
  });

  it("marks integration as notApplicable when in notApplicable array", () => {
    const services = [
      makeService({
        automated: [],
        notApplicable: [
          { checks: [{ name: "integration", details: ["Standalone service"] }] },
        ],
      }),
    ];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    for (const row of result.groups[0].rows) {
      for (const cell of row.cells) {
        assert.equal(cell.status, "notApplicable");
      }
    }
  });

  it("implemented takes priority over notApplicable", () => {
    const services = [
      makeService({
        automated: [
          {
            checks: [{ name: "integration", scope: "e2e", purpose: ["smoke"] }],
            phase: "production",
            provider: "GitHub",
            file: "smoke.yml",
          },
        ],
        notApplicable: [
          { checks: [{ name: "integration", details: ["Contradictory"] }] },
        ],
      }),
    ];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    const smokeRow = result.groups[0].rows[2];
    assert.equal(smokeRow.cells[13].status, "implemented");
    assert.equal(result.groups[0].rows[0].cells[0].status, "notApplicable");
  });

  it("rows have no meta property", () => {
    const services = [makeService({ automated: [] })];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    for (const row of result.groups[0].rows) {
      assert.equal(row.meta, undefined);
    }
  });

  it("handles integration checks without scope (null scope)", () => {
    const services = [
      makeService({
        automated: [
          {
            checks: [{ name: "integration", purpose: ["regression"] }],
            phase: "build",
            provider: "GitHub",
            file: "test.yml",
          },
        ],
      }),
    ];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    // Without a scope, maps to "not specified" scope column (index 4)
    const regressionRow = result.groups[0].rows[0];
    assert.equal(regressionRow.cells[0].status, "empty"); // build / component
    assert.equal(regressionRow.cells[1].status, "empty"); // build / product
    assert.equal(regressionRow.cells[2].status, "empty"); // build / neighbour
    assert.equal(regressionRow.cells[3].status, "empty"); // build / e2e
    assert.equal(regressionRow.cells[4].status, "implemented"); // build / not specified
  });

  it("integration checks with no purpose show in 'not specified' row", () => {
    const services = [
      makeService({
        automated: [
          {
            checks: [{ name: "integration", scope: "component" }],
            phase: "build",
            provider: "GitHub",
            file: "test.yml",
          },
        ],
      }),
    ];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    // "not specified" purpose is the last row (index 4)
    // build is phase index 0, component is scope index 0
    const notSpecifiedRow = result.groups[0].rows[4];
    assert.equal(notSpecifiedRow.label, "not specified");
    assert.equal(notSpecifiedRow.cells[0].status, "implemented");

    // Named purpose rows should be empty for this cell
    assert.equal(result.groups[0].rows[0].cells[0].status, "empty"); // regression
    assert.equal(result.groups[0].rows[2].cells[0].status, "empty"); // smoke
  });
});
