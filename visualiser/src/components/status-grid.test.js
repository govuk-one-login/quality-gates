import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCheckLevelGrid, buildIntegrationScopeGrid } from "./status-grid-data.js";

const iconsMapping = {
  implemented: { color: "#28a745", symbol: "✓" },
  missing: { color: "#dc3545", symbol: "✗" },
  notApplicable: { color: "#cccccc", symbol: "-" },
};

function makeRepository(name, services) {
  return {
    name,
    manifest: { text: { services } },
  };
}

describe("buildCheckLevelGrid", () => {
  const phasesByPromotionType = {
    securePipelines: ["pre-merge", "build", "staging", "production"],
    gitFlow: ["pre-develop", "develop", "pre-release", "release", "main"],
    library: ["pre-merge", "pre-release"],
    other: ["pre-merge", "build", "staging", "production", "pre-develop", "develop", "pre-release", "release", "main"],
  };

  it("returns empty groups when no repositories have manifests", () => {
    const result = buildCheckLevelGrid([], [], phasesByPromotionType);
    assert.deepEqual(result, { groups: [] });
  });

  it("returns empty groups when repositories have no manifest", () => {
    const repos = [{ name: "repo-a" }];
    const result = buildCheckLevelGrid(repos, [], phasesByPromotionType);
    assert.deepEqual(result, { groups: [] });
  });

  it("produces a group per product/promotionType combination", () => {
    const repos = [
      makeRepository("repo-a", [
        { product: "svc-a", component: "frontend", promotionType: "securePipelines", automated: [] },
      ]),
      makeRepository("repo-b", [
        { product: "svc-b", component: "api", promotionType: "library", automated: [] },
      ]),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    assert.equal(result.groups.length, 2);
    assert.equal(result.groups[0].title, "svc-a");
    assert.equal(result.groups[0].subtitle, "securePipelines");
    assert.equal(result.groups[1].title, "svc-b");
    assert.equal(result.groups[1].subtitle, "library");
  });

  it("marks a check as implemented when present in automated", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          automated: [
            { checks: [{ name: "unit" }], phase: "pre-merge", provider: "GitHub", file: "ci.yml" },
          ],
        },
      ]),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells[0].status, "implemented");
  });

  it("marks a check as implemented when present in manual", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          manual: [
            { checks: [{ name: "accessibility" }], phase: "staging", details: ["manual audit"] },
          ],
        },
      ]),
    ];
    const levelGroups = [{ name: "A", phase: "staging", checks: ["accessibility"] }];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells[0].status, "implemented");
  });

  it("marks a check as implemented when present in outOfBand", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          outOfBand: [
            { checks: [{ name: "integration" }], phase: "production", provider: "GitHub", file: "smoke.yml" },
          ],
        },
      ]),
    ];
    const levelGroups = [{ name: "A", phase: "production", checks: ["integration"] }];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells[0].status, "implemented");
  });

  it("marks a check as missing when not present", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          automated: [],
        },
      ]),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells[0].status, "missing");
  });

  it("marks a check as notApplicable when listed in notApplicable", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "api",
          promotionType: "securePipelines",
          automated: [],
          notApplicable: [
            { checks: [{ name: "visual regression", details: ["No UI"] }] },
          ],
        },
      ]),
    ];
    const levelGroups = [{ name: "B", phase: "pre-merge", checks: ["visual regression"] }];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells[0].status, "notApplicable");
  });

  it("implemented takes priority over notApplicable", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          automated: [
            { checks: [{ name: "unit" }], phase: "pre-merge", provider: "GitHub", file: "ci.yml" },
          ],
          notApplicable: [
            { checks: [{ name: "unit", details: ["Contradictory"] }] },
          ],
        },
      ]),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].cells[0].status, "implemented");
  });

  it("only includes phases that exist in both promotionType and levelGroups", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "library",
          automated: [],
        },
      ]),
    ];
    // "build" is not a valid phase for library, so it should be excluded
    const levelGroups = [
      { name: "S", phase: "pre-merge", checks: ["unit"] },
      { name: "A", phase: "build", checks: ["code quality"] },
    ];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    const categories = result.groups[0].columns.categories;
    assert.equal(categories.length, 1);
    assert.equal(categories[0].name, "pre-merge");
  });

  it("includes repositories in the row meta", () => {
    const repos = [
      makeRepository("repo-a", [
        { product: "svc-a", component: "frontend", promotionType: "securePipelines", automated: [] },
      ]),
      makeRepository("repo-b", [
        { product: "svc-a", component: "frontend", promotionType: "securePipelines", automated: [] },
      ]),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].meta, "repo-a, repo-b");
  });

  it("sorts components alphabetically within a group", () => {
    const repos = [
      makeRepository("repo-a", [
        { product: "svc-a", component: "zebra", promotionType: "securePipelines", automated: [] },
        { product: "svc-a", component: "alpha", promotionType: "securePipelines", automated: [] },
      ]),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    assert.equal(result.groups[0].rows[0].label, "alpha");
    assert.equal(result.groups[0].rows[1].label, "zebra");
  });

  it("notApplicable applies across all phases for that check", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "api",
          promotionType: "securePipelines",
          automated: [],
          notApplicable: [
            { checks: [{ name: "unit", details: ["No logic"] }] },
          ],
        },
      ]),
    ];
    const levelGroups = [
      { name: "S", phase: "pre-merge", checks: ["unit"] },
      { name: "A", phase: "build", checks: ["unit"] },
    ];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    // Both phases should show notApplicable for "unit"
    assert.equal(result.groups[0].rows[0].cells[0].status, "notApplicable");
    assert.equal(result.groups[0].rows[0].cells[1].status, "notApplicable");
  });

  it("produces multiple column items when a level group has multiple checks", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          automated: [
            { checks: [{ name: "unit" }], phase: "pre-merge", provider: "GitHub", file: "ci.yml" },
          ],
        },
      ]),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["code quality", "unit", "vulnerability detection"] }];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    const category = result.groups[0].columns.categories[0];
    assert.equal(category.name, "pre-merge");
    assert.deepEqual(category.items, ["code quality", "unit", "vulnerability detection"]);

    // Cells should match: code quality=missing, unit=implemented, vulnerability detection=missing
    assert.equal(result.groups[0].rows[0].cells[0].status, "missing");
    assert.equal(result.groups[0].rows[0].cells[1].status, "implemented");
    assert.equal(result.groups[0].rows[0].cells[2].status, "missing");
  });

  it("deduplicates checks when multiple level groups reference the same phase", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          automated: [],
        },
      ]),
    ];
    const levelGroups = [
      { name: "S", phase: "pre-merge", checks: ["unit", "code quality"] },
      { name: "A", phase: "pre-merge", checks: ["unit", "vulnerability detection"] },
    ];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    const category = result.groups[0].columns.categories[0];
    // Should be deduplicated and sorted
    assert.deepEqual(category.items, ["code quality", "unit", "vulnerability detection"]);
    // 3 cells per row (not 4 with a duplicate)
    assert.equal(result.groups[0].rows[0].cells.length, 3);
  });

  it("produces separate groups for same product with different promotionTypes", () => {
    const repos = [
      makeRepository("repo-a", [
        { product: "svc-a", component: "frontend", promotionType: "securePipelines", automated: [] },
        { product: "svc-a", component: "sdk", promotionType: "library", automated: [] },
      ]),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    assert.equal(result.groups.length, 2);
    assert.equal(result.groups[0].title, "svc-a");
    assert.equal(result.groups[0].subtitle, "library");
    assert.equal(result.groups[0].rows[0].label, "sdk");
    assert.equal(result.groups[1].title, "svc-a");
    assert.equal(result.groups[1].subtitle, "securePipelines");
    assert.equal(result.groups[1].rows[0].label, "frontend");
  });

  it("handles the 'other' promotionType with its union of all phases", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "custom",
          promotionType: "other",
          automated: [
            { checks: [{ name: "unit" }], phase: "pre-merge", provider: "GitHub", file: "ci.yml" },
            { checks: [{ name: "unit" }], phase: "develop", provider: "GitHub", file: "ci.yml" },
          ],
        },
      ]),
    ];
    const levelGroups = [
      { name: "S", phase: "pre-merge", checks: ["unit"] },
      { name: "A", phase: "develop", checks: ["unit"] },
    ];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    // "other" should include both pre-merge and develop since both are in the union
    const categoryNames = result.groups[0].columns.categories.map(c => c.name);
    assert.ok(categoryNames.includes("pre-merge"));
    assert.ok(categoryNames.includes("develop"));
    // Both should be implemented
    const cells = result.groups[0].rows[0].cells;
    assert.ok(cells.every(c => c.status === "implemented"));
  });

  it("handles a service with no check bucket properties at all", () => {
    const repos = [
      makeRepository("repo-a", [
        { product: "svc-a", component: "minimal", promotionType: "securePipelines" },
      ]),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    assert.equal(result.groups.length, 1);
    assert.equal(result.groups[0].rows[0].label, "minimal");
    assert.equal(result.groups[0].rows[0].cells[0].status, "missing");
  });

  it("cell array length equals total checks across all applicable phases", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          automated: [],
        },
      ]),
    ];
    const levelGroups = [
      { name: "S", phase: "pre-merge", checks: ["unit", "code quality"] },
      { name: "A", phase: "build", checks: ["vulnerability detection"] },
      { name: "B", phase: "staging", checks: ["integration", "system"] },
    ];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    // pre-merge: 2 checks, build: 1 check, staging: 2 checks = 5 total
    assert.equal(result.groups[0].rows[0].cells.length, 5);
  });

  it("cell title contains product, component, promotionType, phase, check, and status", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          automated: [
            { checks: [{ name: "unit" }], phase: "pre-merge", provider: "GitHub", file: "ci.yml" },
          ],
        },
      ]),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    const title = result.groups[0].rows[0].cells[0].title;
    assert.match(title, /svc-a/);
    assert.match(title, /frontend/);
    assert.match(title, /securePipelines/);
    assert.match(title, /pre-merge/);
    assert.match(title, /unit/);
    assert.match(title, /implemented/);
  });

  it("cell title shows 'missing' status for missing checks", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          automated: [],
        },
      ]),
    ];
    const levelGroups = [{ name: "S", phase: "pre-merge", checks: ["unit"] }];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

    const title = result.groups[0].rows[0].cells[0].title;
    assert.match(title, /missing/);
  });

  it("produces groups with empty categories and cells when levelGroups is empty", () => {
    const repos = [
      makeRepository("repo-a", [
        { product: "svc-a", component: "frontend", promotionType: "securePipelines", automated: [] },
      ]),
    ];
    const levelGroups = [];

    const result = buildCheckLevelGrid(repos, levelGroups, phasesByPromotionType);

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

  it("returns empty groups when no repositories have manifests", () => {
    const result = buildIntegrationScopeGrid([], phasesByPromotionType, scopes, purposes);
    assert.deepEqual(result, { groups: [] });
  });

  it("produces groups for all services, not just those with integration checks", () => {
    const repos = [
      makeRepository("repo-a", [
        { product: "svc-a", component: "frontend", promotionType: "securePipelines", automated: [] },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes, purposes);

    assert.equal(result.groups.length, 1);
    assert.equal(result.groups[0].title, "svc-a");
  });

  it("rows are purposes including 'not specified'", () => {
    const repos = [
      makeRepository("repo-a", [
        { product: "svc-a", component: "frontend", promotionType: "securePipelines", automated: [] },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes, purposes);

    const rowLabels = result.groups[0].rows.map(r => r.label);
    assert.deepEqual(rowLabels, [...purposes, "not specified"]);
  });

  it("columns are phases (excluding pre-merge/pre-upload) with scopes including 'not specified'", () => {
    const repos = [
      makeRepository("repo-a", [
        { product: "svc-a", component: "frontend", promotionType: "securePipelines", automated: [] },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes, purposes);

    const categories = result.groups[0].columns.categories;
    assert.equal(categories.length, 3); // build, staging, production (pre-merge excluded)
    assert.equal(categories[0].name, "build");
    assert.deepEqual(categories[0].items, [...scopes, "not specified"]);
    assert.equal(categories[2].name, "production");
    assert.deepEqual(categories[2].items, [...scopes, "not specified"]);
  });

  it("marks cell as implemented when any component has that purpose at that phase/scope", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          automated: [
            {
              checks: [{ name: "integration", scope: "e2e", purpose: ["smoke"] }],
              phase: "production",
              provider: "GitHub",
              file: "smoke.yml",
            },
          ],
        },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes, purposes);

    // "smoke" is purpose index 2
    // phases (after filtering): build, staging, production
    // scopes per phase: component, product, neighbour, e2e, not specified (5)
    // production is phase index 2, e2e is scope index 3
    // cell index = (2 * 5) + 3 = 13
    const smokeRow = result.groups[0].rows[2]; // "smoke"
    assert.equal(smokeRow.cells[13].status, "implemented");
  });

  it("aggregates across components — any component implementing counts", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          automated: [
            {
              checks: [{ name: "integration", scope: "e2e", purpose: ["smoke"] }],
              phase: "production",
              provider: "GitHub",
              file: "smoke.yml",
            },
          ],
        },
        {
          product: "svc-a",
          component: "api",
          promotionType: "securePipelines",
          automated: [],
        },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes, purposes);

    // Even though "api" doesn't have it, "frontend" does — so "smoke" at production/e2e is implemented
    const smokeRow = result.groups[0].rows[2];
    assert.equal(smokeRow.cells[13].status, "implemented");
  });

  it("marks non-matching purpose/phase/scope combinations as missing", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          automated: [
            {
              checks: [{ name: "integration", scope: "e2e", purpose: ["smoke"] }],
              phase: "production",
              provider: "GitHub",
              file: "smoke.yml",
            },
          ],
        },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes, purposes);

    // "regression" row (index 0), build/component (index 0) = missing
    assert.equal(result.groups[0].rows[0].cells[0].status, "missing");
  });

  it("marks integration as notApplicable when in notApplicable array", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "api",
          promotionType: "securePipelines",
          automated: [],
          notApplicable: [
            { checks: [{ name: "integration", details: ["Standalone service"] }] },
          ],
        },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes, purposes);

    // All cells for all purposes should be notApplicable
    for (const row of result.groups[0].rows) {
      for (const cell of row.cells) {
        assert.equal(cell.status, "notApplicable");
      }
    }
  });

  it("implemented takes priority over notApplicable", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
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
        },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes, purposes);

    // smoke at production/e2e should be implemented
    const smokeRow = result.groups[0].rows[2];
    assert.equal(smokeRow.cells[13].status, "implemented");
    // regression at build/component should be notApplicable
    assert.equal(result.groups[0].rows[0].cells[0].status, "notApplicable");
  });

  it("rows have no meta property", () => {
    const repos = [
      makeRepository("repo-a", [
        { product: "svc-a", component: "frontend", promotionType: "securePipelines", automated: [] },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes, purposes);

    for (const row of result.groups[0].rows) {
      assert.equal(row.meta, undefined);
    }
  });

  it("handles integration checks without scope (null scope)", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          automated: [
            {
              checks: [{ name: "integration", purpose: ["regression"] }],
              phase: "build",
              provider: "GitHub",
              file: "test.yml",
            },
          ],
        },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes, purposes);

    // Without a scope, maps to "not specified" scope column (index 4)
    // Named scope columns should be missing, "not specified" should be implemented
    const regressionRow = result.groups[0].rows[0];
    assert.equal(regressionRow.cells[0].status, "missing"); // build / component
    assert.equal(regressionRow.cells[1].status, "missing"); // build / product
    assert.equal(regressionRow.cells[2].status, "missing"); // build / neighbour
    assert.equal(regressionRow.cells[3].status, "missing"); // build / e2e
    assert.equal(regressionRow.cells[4].status, "implemented"); // build / not specified
  });

  it("integration checks with no purpose show in 'not specified' row", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          automated: [
            {
              checks: [{ name: "integration", scope: "component" }],
              phase: "build",
              provider: "GitHub",
              file: "test.yml",
            },
          ],
        },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes, purposes);

    // "not specified" purpose is the last row (index 4)
    // build is phase index 0, component is scope index 0
    // cell index = (0 * 5) + 0 = 0
    const notSpecifiedRow = result.groups[0].rows[4];
    assert.equal(notSpecifiedRow.label, "not specified");
    assert.equal(notSpecifiedRow.cells[0].status, "implemented");

    // Named purpose rows should be missing for this cell
    assert.equal(result.groups[0].rows[0].cells[0].status, "missing"); // regression
    assert.equal(result.groups[0].rows[2].cells[0].status, "missing"); // smoke
  });
});
