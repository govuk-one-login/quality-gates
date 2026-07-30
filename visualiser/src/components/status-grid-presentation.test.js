import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { toCheckLevelTableModel, toIntegrationTableModel, toAllChecksTableModel } from "./status-grid-presentation.js";

const iconsMapping = {
  implemented: { color: "#28a745", symbol: "✓" },
  missing: { color: "#dc3545", symbol: "✗" },
  notApplicable: { color: "#cccccc", symbol: "-" },
  empty: { color: "#f9f9f9", symbol: " " },
};

describe("toCheckLevelTableModel", () => {
  const group = {
    title: "svc-a",
    subtitle: "securePipelines",
    columns: {
      categories: [
        { name: "pre-merge", items: ["unit", "code quality"] },
        { name: "build", items: [] },
      ]
    },
    rows: [
      {
        label: "frontend",
        meta: [{ name: "repo-a", url: "https://github.com/org/repo-a" }],
        cells: [
          { status: "implemented", title: "svc-a / frontend\nsecurePipelines: pre-merge → unit\nimplemented" },
          { status: "missing", title: "svc-a / frontend\nsecurePipelines: pre-merge → code quality\nmissing" },
          { status: "empty", title: "" },
        ]
      }
    ]
  };

  it("produces 3 header rows", () => {
    const model = toCheckLevelTableModel(group, iconsMapping);
    assert.equal(model.headerRows.length, 3);
  });

  it("header row 1 has Component with rowspan 3, subtitle with correct colspan, and Repositories", () => {
    const model = toCheckLevelTableModel(group, iconsMapping);
    const row1 = model.headerRows[0];
    assert.equal(row1[0].text, "Component");
    assert.equal(row1[0].rowspan, 3);
    assert.equal(row1[0].style, "header");
    assert.equal(row1[1].text, "securePipelines");
    assert.equal(row1[1].colspan, 3); // 2 items + 1 empty phase
    assert.equal(row1[1].style, "subtitle");
    assert.equal(row1[2].text, "Repositories");
    assert.equal(row1[2].rowspan, 3);
  });

  it("header row 2 has phase categories with correct colspans", () => {
    const model = toCheckLevelTableModel(group, iconsMapping);
    const row2 = model.headerRows[1];
    assert.equal(row2[0].text, "pre-merge");
    assert.equal(row2[0].colspan, 2);
    assert.equal(row2[0].style, "category");
    assert.equal(row2[1].text, "build");
    assert.equal(row2[1].colspan, 1); // empty phase gets colspan 1
  });

  it("header row 3 has check-type items and empty placeholder", () => {
    const model = toCheckLevelTableModel(group, iconsMapping);
    const row3 = model.headerRows[2];
    assert.equal(row3[0].text, "unit");
    assert.equal(row3[0].style, "vertical");
    assert.equal(row3[1].text, "code quality");
    assert.equal(row3[1].style, "vertical");
    assert.equal(row3[2].text, "");
    assert.equal(row3[2].style, "empty-header");
  });

  it("body row starts with label cell", () => {
    const model = toCheckLevelTableModel(group, iconsMapping);
    const row = model.bodyRows[0];
    assert.equal(row[0].text, "frontend");
    assert.equal(row[0].style, "label");
  });

  it("body row has status cells with resolved icons", () => {
    const model = toCheckLevelTableModel(group, iconsMapping);
    const row = model.bodyRows[0];
    // Cell 1: implemented
    assert.equal(row[1].symbol, "✓");
    assert.equal(row[1].background, "#28a745");
    assert.equal(row[1].color, "white");
    assert.equal(row[1].style, "status");
    assert.match(row[1].title, /implemented/);
    // Cell 2: missing
    assert.equal(row[2].symbol, "✗");
    assert.equal(row[2].background, "#dc3545");
    // Cell 3: empty
    assert.equal(row[3].symbol, " ");
    assert.equal(row[3].background, "#f9f9f9");
  });

  it("body row ends with meta cell containing links", () => {
    const model = toCheckLevelTableModel(group, iconsMapping);
    const row = model.bodyRows[0];
    const metaCell = row[row.length - 1];
    assert.equal(metaCell.style, "meta");
    assert.deepEqual(metaCell.links, [{ text: "repo-a", href: "https://github.com/org/repo-a" }]);
  });

  it("omits Repositories column when meta is undefined", () => {
    const groupNoMeta = {
      ...group,
      rows: [{ label: "frontend", cells: [{ status: "implemented", title: "" }] }],
      columns: { categories: [{ name: "pre-merge", items: ["unit"] }] }
    };
    const model = toCheckLevelTableModel(groupNoMeta, iconsMapping);
    // Header row 1 should not have Repositories
    assert.equal(model.headerRows[0].length, 2);
    // Body row should not end with meta
    const lastCell = model.bodyRows[0][model.bodyRows[0].length - 1];
    assert.equal(lastCell.style, "status");
  });

  it("handles multiple rows", () => {
    const multiRowGroup = {
      ...group,
      rows: [
        { label: "frontend", meta: [], cells: [{ status: "implemented", title: "" }, { status: "missing", title: "" }, { status: "empty", title: "" }] },
        { label: "api", meta: [], cells: [{ status: "missing", title: "" }, { status: "implemented", title: "" }, { status: "empty", title: "" }] },
      ]
    };
    const model = toCheckLevelTableModel(multiRowGroup, iconsMapping);
    assert.equal(model.bodyRows.length, 2);
    assert.equal(model.bodyRows[0][0].text, "frontend");
    assert.equal(model.bodyRows[1][0].text, "api");
  });
});

describe("toIntegrationTableModel", () => {
  const group = {
    title: null,
    subtitle: "securePipelines",
    columns: {
      categories: [
        { name: "build", items: ["component", "product", "neighbour", "e2e", "not specified"] },
        { name: "staging", items: ["component", "product", "neighbour", "e2e", "not specified"] },
      ]
    },
    rows: [
      { label: "regression", cells: [
        { status: "empty", title: "" }, { status: "empty", title: "" }, { status: "empty", title: "" },
        { status: "implemented", title: "smoke" }, { status: "empty", title: "" },
        { status: "empty", title: "" }, { status: "empty", title: "" }, { status: "empty", title: "" },
        { status: "empty", title: "" }, { status: "empty", title: "" },
      ]},
    ]
  };

  it("produces 3 header rows", () => {
    const model = toIntegrationTableModel(group, iconsMapping);
    assert.equal(model.headerRows.length, 3);
  });

  it("does not include Repositories column when rows have no meta", () => {
    const model = toIntegrationTableModel(group, iconsMapping);
    assert.equal(model.headerRows[0].length, 2); // Component + subtitle only
  });

  it("header row 2 has phase categories", () => {
    const model = toIntegrationTableModel(group, iconsMapping);
    const row2 = model.headerRows[1];
    assert.equal(row2[0].text, "build");
    assert.equal(row2[0].colspan, 5);
    assert.equal(row2[1].text, "staging");
    assert.equal(row2[1].colspan, 5);
  });

  it("header row 3 has scope items", () => {
    const model = toIntegrationTableModel(group, iconsMapping);
    const row3 = model.headerRows[2];
    assert.equal(row3.length, 10);
    assert.equal(row3[0].text, "component");
    assert.equal(row3[4].text, "not specified");
    assert.equal(row3[0].style, "vertical");
  });

  it("body row label is the purpose", () => {
    const model = toIntegrationTableModel(group, iconsMapping);
    assert.equal(model.bodyRows[0][0].text, "regression");
    assert.equal(model.bodyRows[0][0].style, "label");
  });

  it("resolves status cells correctly", () => {
    const model = toIntegrationTableModel(group, iconsMapping);
    const row = model.bodyRows[0];
    // Cell index 4 (0-indexed from after label): build/e2e = implemented
    assert.equal(row[4].symbol, "✓");
    assert.equal(row[4].background, "#28a745");
    // Cell index 1: build/component = empty
    assert.equal(row[1].symbol, " ");
    assert.equal(row[1].background, "#f9f9f9");
  });

  it("body rows have no meta cell when meta is undefined", () => {
    const model = toIntegrationTableModel(group, iconsMapping);
    const row = model.bodyRows[0];
    const lastCell = row[row.length - 1];
    assert.equal(lastCell.style, "status");
  });
});

describe("toAllChecksTableModel", () => {
  const group = {
    title: "svc-a",
    subtitle: "securePipelines",
    columns: {
      categories: [{ name: "", items: ["unit", "integration", "code quality"] }]
    },
    rows: [
      {
        label: "frontend",
        meta: [{ name: "repo-a", url: "https://github.com/org/repo-a" }],
        cells: [
          { status: "implemented", title: "svc-a / frontend\nunit\nimplemented" },
          { status: "missing", title: "svc-a / frontend\nintegration\nmissing" },
          { status: "implemented", title: "svc-a / frontend\ncode quality\nimplemented" },
        ]
      }
    ]
  };

  it("produces 2 header rows (no phase sub-row)", () => {
    const model = toAllChecksTableModel(group, iconsMapping);
    assert.equal(model.headerRows.length, 2);
  });

  it("header row 1 has Component with rowspan 2 and subtitle", () => {
    const model = toAllChecksTableModel(group, iconsMapping);
    const row1 = model.headerRows[0];
    assert.equal(row1[0].text, "Component");
    assert.equal(row1[0].rowspan, 2);
    assert.equal(row1[1].text, "securePipelines");
    assert.equal(row1[1].colspan, 3);
    assert.equal(row1[2].text, "Repositories");
    assert.equal(row1[2].rowspan, 2);
  });

  it("header row 2 has check-type items directly", () => {
    const model = toAllChecksTableModel(group, iconsMapping);
    const row2 = model.headerRows[1];
    assert.equal(row2.length, 3);
    assert.equal(row2[0].text, "unit");
    assert.equal(row2[1].text, "integration");
    assert.equal(row2[2].text, "code quality");
    assert.ok(row2.every(c => c.style === "vertical"));
  });

  it("body row has label, status cells, and meta", () => {
    const model = toAllChecksTableModel(group, iconsMapping);
    const row = model.bodyRows[0];
    assert.equal(row[0].text, "frontend");
    assert.equal(row[0].style, "label");
    assert.equal(row[1].symbol, "✓");
    assert.equal(row[2].symbol, "✗");
    assert.equal(row[3].symbol, "✓");
    assert.equal(row[4].style, "meta");
    assert.deepEqual(row[4].links, [{ text: "repo-a", href: "https://github.com/org/repo-a" }]);
  });

  it("handles group with no meta", () => {
    const groupNoMeta = {
      ...group,
      rows: [{ label: "frontend", cells: group.rows[0].cells }]
    };
    const model = toAllChecksTableModel(groupNoMeta, iconsMapping);
    assert.equal(model.headerRows[0].length, 2); // No Repositories
    const lastCell = model.bodyRows[0][model.bodyRows[0].length - 1];
    assert.equal(lastCell.style, "status");
  });
});
