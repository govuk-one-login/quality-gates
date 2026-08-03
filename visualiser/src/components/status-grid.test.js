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
    const levelGroups = [
      { name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["unit"] },
      { name: "S", promotionType: "library", phase: "pre-merge", checks: ["unit"] },
    ];

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
    const levelGroups = [{ name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    // pre-merge is the first phase in securePipelines, unit is the only check there
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
    const levelGroups = [{ name: "A", promotionType: "securePipelines", phase: "staging", checks: ["accessibility"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    // Find the staging category and its cell
    const categories = result.groups[0].columns.categories;
    const stagingIdx = categories.findIndex(c => c.name === "staging");
    const cellOffset = categories.slice(0, stagingIdx).reduce((sum, c) => sum + Math.max(c.items.length, 1), 0);
    assert.equal(result.groups[0].rows[0].cells[cellOffset].status, "implemented");
  });

  it("marks a check as implemented when present in outOfBand", () => {
    const services = [
      makeService({
        outOfBand: [
          { checks: [{ name: "integration" }], phase: "production", provider: "GitHub", file: "smoke.yml" },
        ],
      }),
    ];
    const levelGroups = [{ name: "A", promotionType: "securePipelines", phase: "production", checks: ["integration"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    const categories = result.groups[0].columns.categories;
    const prodIdx = categories.findIndex(c => c.name === "production");
    const cellOffset = categories.slice(0, prodIdx).reduce((sum, c) => sum + Math.max(c.items.length, 1), 0);
    assert.equal(result.groups[0].rows[0].cells[cellOffset].status, "implemented");
  });

  it("marks a check as missing when not present", () => {
    const services = [makeService({ automated: [] })];
    const levelGroups = [{ name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["unit"] }];

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
    const levelGroups = [{ name: "B", promotionType: "securePipelines", phase: "pre-merge", checks: ["visual regression"] }];

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
    const levelGroups = [{ name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells[0].status, "implemented");
  });

  it("only shows check columns for phases that have levelGroup entries", () => {
    const services = [makeService({ promotionType: "library", automated: [] })];
    const levelGroups = [
      { name: "S", promotionType: "library", phase: "pre-merge", checks: ["unit"] },
    ];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    // All library phases should appear as categories
    const categories = result.groups[0].columns.categories;
    assert.equal(categories.length, 2); // pre-merge, pre-release
    assert.equal(categories[0].name, "pre-merge");
    assert.deepEqual(categories[0].items, ["unit"]);
    // pre-release has no level group entry, so empty items
    assert.equal(categories[1].name, "pre-release");
    assert.deepEqual(categories[1].items, []);
  });

  it("includes repositories in the row meta", () => {
    const services = [
      makeService({ repository: "repo-a", repositoryUrl: "https://github.com/org/repo-a" }),
      makeService({ repository: "repo-b", repositoryUrl: "https://github.com/org/repo-b" }),
    ];
    const levelGroups = [{ name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.deepEqual(result.groups[0].rows[0].meta, [
      { name: "repo-a", url: "https://github.com/org/repo-a" },
      { name: "repo-b", url: "https://github.com/org/repo-b" },
    ]);
  });

  it("sorts components alphabetically within a group", () => {
    const services = [
      makeService({ component: "zebra" }),
      makeService({ component: "alpha" }),
    ];
    const levelGroups = [{ name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["unit"] }];

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
      { name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["unit"] },
      { name: "A", promotionType: "securePipelines", phase: "build", checks: ["unit"] },
    ];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    // Find pre-merge and build cells
    const categories = result.groups[0].columns.categories;
    const preMergeIdx = categories.findIndex(c => c.name === "pre-merge");
    const buildIdx = categories.findIndex(c => c.name === "build");
    const preMergeOffset = categories.slice(0, preMergeIdx).reduce((sum, c) => sum + Math.max(c.items.length, 1), 0);
    const buildOffset = categories.slice(0, buildIdx).reduce((sum, c) => sum + Math.max(c.items.length, 1), 0);
    assert.equal(result.groups[0].rows[0].cells[preMergeOffset].status, "notApplicable");
    assert.equal(result.groups[0].rows[0].cells[buildOffset].status, "notApplicable");
  });

  it("phase-scoped notApplicable only marks the specified phase cell", () => {
    const services = [
      makeService({
        automated: [],
        notApplicable: [
          { phase: "build", checks: [{ name: "integration", details: ["No AWS resources at build"] }] },
        ],
      }),
    ];
    const levelGroups = [
      { name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["integration"] },
      { name: "A", promotionType: "securePipelines", phase: "build", checks: ["integration"] },
      { name: "B", promotionType: "securePipelines", phase: "staging", checks: ["integration"] },
    ];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    const categories = result.groups[0].columns.categories;
    const preMergeIdx = categories.findIndex(c => c.name === "pre-merge");
    const buildIdx = categories.findIndex(c => c.name === "build");
    const stagingIdx = categories.findIndex(c => c.name === "staging");
    const preMergeOffset = categories.slice(0, preMergeIdx).reduce((sum, c) => sum + Math.max(c.items.length, 1), 0);
    const buildOffset = categories.slice(0, buildIdx).reduce((sum, c) => sum + Math.max(c.items.length, 1), 0);
    const stagingOffset = categories.slice(0, stagingIdx).reduce((sum, c) => sum + Math.max(c.items.length, 1), 0);

    assert.equal(result.groups[0].rows[0].cells[preMergeOffset].status, "missing");
    assert.equal(result.groups[0].rows[0].cells[buildOffset].status, "notApplicable");
    assert.equal(result.groups[0].rows[0].cells[stagingOffset].status, "missing");
  });

  it("implemented takes priority over phase-scoped notApplicable", () => {
    const services = [
      makeService({
        automated: [
          { checks: [{ name: "integration" }], phase: "build", provider: "GitHub", file: "ci.yml" },
        ],
        notApplicable: [
          { phase: "build", checks: [{ name: "integration", details: ["Contradictory"] }] },
        ],
      }),
    ];
    const levelGroups = [{ name: "A", promotionType: "securePipelines", phase: "build", checks: ["integration"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    const categories = result.groups[0].columns.categories;
    const buildIdx = categories.findIndex(c => c.name === "build");
    const buildOffset = categories.slice(0, buildIdx).reduce((sum, c) => sum + Math.max(c.items.length, 1), 0);
    assert.equal(result.groups[0].rows[0].cells[buildOffset].status, "implemented");
  });

  it("produces multiple column items when a level group has multiple checks", () => {
    const services = [
      makeService({
        automated: [
          { checks: [{ name: "unit" }], phase: "pre-merge", provider: "GitHub", file: "ci.yml" },
        ],
      }),
    ];
    const levelGroups = [{ name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["code quality", "unit", "vulnerability detection"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    const categories = result.groups[0].columns.categories;
    const preMerge = categories.find(c => c.name === "pre-merge");
    assert.deepEqual(preMerge.items, ["code quality", "unit", "vulnerability detection"]);

    // Find cell offset for pre-merge
    const preMergeIdx = categories.findIndex(c => c.name === "pre-merge");
    const offset = categories.slice(0, preMergeIdx).reduce((sum, c) => sum + c.items.length, 0);
    assert.equal(result.groups[0].rows[0].cells[offset + 0].status, "missing");     // code quality
    assert.equal(result.groups[0].rows[0].cells[offset + 1].status, "implemented"); // unit
    assert.equal(result.groups[0].rows[0].cells[offset + 2].status, "missing");     // vulnerability detection
  });

  it("deduplicates checks when multiple level groups reference the same phase", () => {
    const services = [makeService({ automated: [] })];
    const levelGroups = [
      { name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["unit", "code quality"] },
      { name: "A", promotionType: "securePipelines", phase: "pre-merge", checks: ["unit", "vulnerability detection"] },
    ];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    const categories = result.groups[0].columns.categories;
    const preMerge = categories.find(c => c.name === "pre-merge");
    assert.deepEqual(preMerge.items, ["code quality", "unit", "vulnerability detection"]);
    // Total cells = 3 checks + 3 empty phases (build, staging, production)
    const totalCells = categories.reduce((sum, c) => sum + Math.max(c.items.length, 1), 0);
    assert.equal(result.groups[0].rows[0].cells.length, totalCells);
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
      { name: "S", promotionType: "other", phase: "pre-merge", checks: ["unit"] },
      { name: "A", promotionType: "other", phase: "develop", checks: ["unit"] },
    ];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    const categories = result.groups[0].columns.categories;
    const categoryNames = categories.map(c => c.name);
    assert.ok(categoryNames.includes("pre-merge"));
    assert.ok(categoryNames.includes("develop"));
    // All phases with items should have implemented cells
    const preMerge = categories.find(c => c.name === "pre-merge");
    const develop = categories.find(c => c.name === "develop");
    assert.deepEqual(preMerge.items, ["unit"]);
    assert.deepEqual(develop.items, ["unit"]);
  });

  it("handles a service with no check bucket properties at all", () => {
    const services = [makeService({})];
    const levelGroups = [{ name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    assert.equal(result.groups.length, 1);
    assert.equal(result.groups[0].rows[0].label, "frontend");
    assert.equal(result.groups[0].rows[0].cells[0].status, "missing");
  });

  it("cell array length equals total check items plus one per empty phase", () => {
    const services = [makeService({ automated: [] })];
    const levelGroups = [
      { name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["unit", "code quality"] },
      { name: "A", promotionType: "securePipelines", phase: "build", checks: ["vulnerability detection"] },
      { name: "B", promotionType: "securePipelines", phase: "staging", checks: ["integration", "system"] },
    ];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    // pre-merge: 2, build: 1, staging: 2, production: 0 (1 empty cell) = 6
    const categories = result.groups[0].columns.categories;
    const expectedCells = categories.reduce((sum, c) => sum + Math.max(c.items.length, 1), 0);
    assert.equal(expectedCells, 6);
    assert.equal(result.groups[0].rows[0].cells.length, 6);
  });

  it("cell title contains product, component, promotionType, phase, check, and status", () => {
    const services = [
      makeService({
        automated: [
          { checks: [{ name: "unit" }], phase: "pre-merge", provider: "GitHub", file: "ci.yml" },
        ],
      }),
    ];
    const levelGroups = [{ name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["unit"] }];

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
    const levelGroups = [{ name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    const title = result.groups[0].rows[0].cells[0].title;
    assert.match(title, /missing/);
  });

  it("all phases appear as categories even with no levelGroup entries", () => {
    const services = [makeService({ automated: [] })];
    const levelGroups = [];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    // All securePipelines phases should appear
    const categories = result.groups[0].columns.categories;
    assert.equal(categories.length, 4); // pre-merge, build, staging, production
    // But all have empty items
    assert.ok(categories.every(c => c.items.length === 0));
    // One empty cell per phase with no items
    assert.equal(result.groups[0].rows[0].cells.length, 4);
    assert.ok(result.groups[0].rows[0].cells.every(c => c.status === "empty"));
  });

  it("level groups for other promotionTypes are ignored", () => {
    const services = [makeService({ promotionType: "library", automated: [] })];
    const levelGroups = [
      { name: "S", promotionType: "securePipelines", phase: "pre-merge", checks: ["unit"] },
      { name: "A", promotionType: "library", phase: "pre-merge", checks: ["code quality"] },
    ];

    const result = buildCheckLevelGrid("svc-a", services, levelGroups, phasesByPromotionType);

    const categories = result.groups[0].columns.categories;
    const preMerge = categories.find(c => c.name === "pre-merge");
    // Only the library level group's checks should appear
    assert.deepEqual(preMerge.items, ["code quality"]);
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

  it("columns are phases with scopes including 'not specified'", () => {
    const services = [makeService({ automated: [] })];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    const categories = result.groups[0].columns.categories;
    assert.equal(categories.length, 4); // build, staging, production
    assert.equal(categories[1].name, "build");
    assert.deepEqual(categories[0].items, [...scopes, "not specified"]);
    assert.equal(categories[3].name, "production");
    assert.deepEqual(categories[3].items, [...scopes, "not specified"]);
  });

  it("marks cell as 'automated' when check is in automated bucket", () => {
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

    // phases: pre-merge, build, staging, production
    // scopes per phase: component, product, neighbour, e2e, not specified (5)
    // production is phase index 3, e2e is scope index 3
    // cell index = (3 * 5) + 3 = 18
    const smokeRow = result.groups[0].rows[2]; // "smoke"
    assert.equal(smokeRow.cells[18].status, "automated");
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
    assert.equal(smokeRow.cells[18].status, "automated");
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

  it("source status takes priority over notApplicable", () => {
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
    assert.equal(smokeRow.cells[18].status, "automated");
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

    // Without a scope, maps to "not specified" scope column (index 4 within phase)
    // build is phase index 1, so build/component = (1*5)+0 = 5, build/not specified = (1*5)+4 = 9
    const regressionRow = result.groups[0].rows[0];
    assert.equal(regressionRow.cells[5].status, "empty"); // build / component
    assert.equal(regressionRow.cells[6].status, "empty"); // build / product
    assert.equal(regressionRow.cells[7].status, "empty"); // build / neighbour
    assert.equal(regressionRow.cells[8].status, "empty"); // build / e2e
    assert.equal(regressionRow.cells[9].status, "automated"); // build / not specified
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
    // build is phase index 1, component is scope index 0
    // cell index = (1 * 5) + 0 = 5
    const notSpecifiedRow = result.groups[0].rows[4];
    assert.equal(notSpecifiedRow.label, "not specified");
    assert.equal(notSpecifiedRow.cells[5].status, "automated");

    // Named purpose rows should be empty for this cell
    assert.equal(result.groups[0].rows[0].cells[5].status, "empty"); // regression
    assert.equal(result.groups[0].rows[2].cells[5].status, "empty"); // smoke
  });

  it("marks cell as 'manual' when check is only in manual bucket", () => {
    const services = [
      makeService({
        manual: [
          {
            checks: [{ name: "integration", scope: "e2e", purpose: ["regression"] }],
            phase: "production",
            details: ["QA verified"],
          },
        ],
      }),
    ];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    // production/e2e = (3*5)+3 = 18, regression is row 0
    assert.equal(result.groups[0].rows[0].cells[18].status, "manual");
  });

  it("marks cell as 'outOfBand' when check is only in outOfBand bucket", () => {
    const services = [
      makeService({
        outOfBand: [
          {
            checks: [{ name: "integration", scope: "component", purpose: ["smoke"] }],
            phase: "build",
            provider: "GitHub",
            file: "weekly.yml",
          },
        ],
      }),
    ];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    // build/component = (1*5)+0 = 5, smoke is row 2
    assert.equal(result.groups[0].rows[2].cells[5].status, "outOfBand");
  });

  it("marks cell as 'multiple' when check is in more than one bucket", () => {
    const services = [
      makeService({
        automated: [
          {
            checks: [{ name: "integration", scope: "e2e", purpose: ["regression"] }],
            phase: "production",
            provider: "GitHub",
            file: "ci.yml",
          },
        ],
        manual: [
          {
            checks: [{ name: "integration", scope: "e2e", purpose: ["regression"] }],
            phase: "production",
            details: ["QA verified"],
          },
        ],
      }),
    ];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    // production/e2e = (3*5)+3 = 18, regression is row 0
    assert.equal(result.groups[0].rows[0].cells[18].status, "multiple");
  });

  it("phase-scoped notApplicable integration only marks that phase", () => {
    const services = [
      makeService({
        automated: [],
        notApplicable: [
          { phase: "build", checks: [{ name: "integration", details: ["No AWS resources at build"] }] },
        ],
      }),
    ];

    const result = buildIntegrationScopeGrid("svc-a", services, phasesByPromotionType, scopes, purposes);

    // build is phase index 1, 5 scopes per phase
    // All build cells should be notApplicable
    for (const row of result.groups[0].rows) {
      for (let i = 0; i < 5; i++) {
        assert.equal(row.cells[5 + i].status, "notApplicable", `build cell ${i} should be notApplicable`);
      }
    }
    // pre-merge cells (phase index 0) should be empty
    for (const row of result.groups[0].rows) {
      for (let i = 0; i < 5; i++) {
        assert.equal(row.cells[i].status, "empty", `pre-merge cell ${i} should be empty`);
      }
    }
    // staging cells (phase index 2) should be empty
    for (const row of result.groups[0].rows) {
      for (let i = 0; i < 5; i++) {
        assert.equal(row.cells[10 + i].status, "empty", `staging cell ${i} should be empty`);
      }
    }
  });

  it("global notApplicable integration marks all phases", () => {
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
});
