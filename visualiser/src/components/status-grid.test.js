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
});

describe("buildIntegrationScopeGrid", () => {
  const phasesByPromotionType = {
    securePipelines: ["pre-merge", "build", "staging", "production"],
    library: ["pre-merge", "pre-release"],
  };
  const scopes = ["component", "product", "neighbour", "e2e"];

  it("returns empty groups when no repositories have manifests", () => {
    const result = buildIntegrationScopeGrid([], phasesByPromotionType, scopes);
    assert.deepEqual(result, { groups: [] });
  });

  it("produces groups for all services, not just those with integration checks", () => {
    const repos = [
      makeRepository("repo-a", [
        { product: "svc-a", component: "frontend", promotionType: "securePipelines", automated: [] },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes);

    assert.equal(result.groups.length, 1);
    assert.equal(result.groups[0].title, "svc-a");
  });

  it("marks integration check as implemented when scope matches", () => {
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

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes);

    // phases: pre-merge, build, staging, production
    // scopes per phase: component, product, neighbour, e2e
    // production is index 3, e2e is index 3 within that phase
    // cell index = (3 * 4) + 3 = 15
    const cells = result.groups[0].rows[0].cells;
    assert.equal(cells[15].status, "implemented");
  });

  it("marks non-matching scope/phase combinations as missing", () => {
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

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes);

    // pre-merge / component = index 0
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

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes);

    // All cells should be notApplicable
    const cells = result.groups[0].rows[0].cells;
    for (const cell of cells) {
      assert.equal(cell.status, "notApplicable");
    }
  });

  it("includes purpose in tooltip when present", () => {
    const repos = [
      makeRepository("repo-a", [
        {
          product: "svc-a",
          component: "frontend",
          promotionType: "securePipelines",
          automated: [
            {
              checks: [{ name: "integration", scope: "e2e", purpose: ["smoke", "regression"] }],
              phase: "production",
              provider: "GitHub",
              file: "smoke.yml",
            },
          ],
        },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes);

    // production / e2e = index 15
    const cell = result.groups[0].rows[0].cells[15];
    assert.match(cell.title, /Purpose: /);
    assert.match(cell.title, /smoke/);
    assert.match(cell.title, /regression/);
  });

  it("columns are phases with scopes as items", () => {
    const repos = [
      makeRepository("repo-a", [
        { product: "svc-a", component: "frontend", promotionType: "securePipelines", automated: [] },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes);

    const categories = result.groups[0].columns.categories;
    assert.equal(categories.length, 4); // pre-merge, build, staging, production
    assert.equal(categories[0].name, "pre-merge");
    assert.deepEqual(categories[0].items, scopes);
    assert.equal(categories[3].name, "production");
    assert.deepEqual(categories[3].items, scopes);
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
              phase: "pre-merge",
              provider: "GitHub",
              file: "test.yml",
            },
          ],
        },
      ]),
    ];

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes);

    // Without a scope, it maps to null, which won't match any of the scope columns
    // All cells for pre-merge should be missing
    const cells = result.groups[0].rows[0].cells;
    assert.equal(cells[0].status, "missing"); // pre-merge / component
    assert.equal(cells[1].status, "missing"); // pre-merge / product
    assert.equal(cells[2].status, "missing"); // pre-merge / neighbour
    assert.equal(cells[3].status, "missing"); // pre-merge / e2e
  });

  it("implemented takes priority over notApplicable for integration", () => {
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

    const result = buildIntegrationScopeGrid(repos, phasesByPromotionType, scopes);

    // production / e2e should still be implemented
    assert.equal(result.groups[0].rows[0].cells[15].status, "implemented");
    // But other cells should be notApplicable
    assert.equal(result.groups[0].rows[0].cells[0].status, "notApplicable");
  });
});
