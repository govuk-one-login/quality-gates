/**
 * Presentation Model layer for status grids.
 *
 * Transforms semantic grid data into fully-resolved TableModel structures
 * that describe the exact contents, spanning, and styles of every cell.
 *
 * TableModel shape:
 * {
 *   headerRows: [ [{ text, colspan?, rowspan?, style }] ],
 *   bodyRows:   [ [{ text?, symbol?, background?, color?, title?, links?, style }] ]
 * }
 *
 * Cell styles:
 * - "header"   : standard header cell
 * - "subtitle" : promotion type spanning header
 * - "category" : phase header
 * - "vertical" : rotated check-type header
 * - "label"    : row label (component/purpose)
 * - "status"   : coloured status cell (has symbol, background, color, title)
 * - "meta"     : repositories cell (has links array)
 * - "empty-header" : empty placeholder header
 */

/**
 * Converts a check-level grid group into a TableModel.
 *
 * @param {Object} group - A single group from buildCheckLevelGrid output
 * @param {Object} iconsMapping - Map of status → {color, symbol}
 * @returns {Object} TableModel
 */
export function toCheckLevelTableModel(group, iconsMapping) {
  const categories = group.columns.categories;
  const totalColumns = categories.reduce((sum, cat) => sum + Math.max(cat.items.length, 1), 0);
  const showMeta = group.rows[0]?.meta !== undefined;

  // Header row 1: Component + subtitle spanning + optional Repositories
  const headerRow1 = [
    { text: "Component", rowspan: 3, style: "header" },
    { text: group.subtitle, colspan: totalColumns, style: "subtitle" },
  ];
  if (showMeta) {
    headerRow1.push({ text: "Repositories", rowspan: 3, style: "header" });
  }

  // Header row 2: phase categories
  const headerRow2 = categories.map(cat => ({
    text: cat.name,
    colspan: Math.max(cat.items.length, 1),
    style: "category"
  }));

  // Header row 3: check-type items (or empty placeholder)
  const headerRow3 = categories.flatMap(cat =>
    cat.items.length > 0
      ? cat.items.map(item => ({ text: item, style: "vertical" }))
      : [{ text: "", style: "empty-header" }]
  );

  // Body rows
  const bodyRows = group.rows.map(row => {
    const cells = [{ text: row.label, style: "label" }];

    for (const cell of row.cells) {
      const icon = iconsMapping[cell.status];
      cells.push({
        symbol: icon.symbol,
        background: icon.color,
        color: "white",
        title: cell.title ?? "",
        style: "status"
      });
    }

    if (showMeta) {
      const links = Array.isArray(row.meta)
        ? row.meta.map(r => ({ text: r.name, href: r.url }))
        : [];
      cells.push({ links, style: "meta" });
    }

    return cells;
  });

  return {
    headerRows: [headerRow1, headerRow2, headerRow3],
    bodyRows
  };
}

/**
 * Converts an integration scope grid group into a TableModel.
 *
 * @param {Object} group - A single group from buildIntegrationScopeGrid output
 * @param {Object} iconsMapping - Map of status → {color, symbol}
 * @returns {Object} TableModel
 */
export function toIntegrationTableModel(group, iconsMapping) {
  const categories = group.columns.categories;
  const totalColumns = categories.reduce((sum, cat) => sum + Math.max(cat.items.length, 1), 0);
  const showMeta = group.rows[0]?.meta !== undefined;

  // Header row 1: Component + subtitle spanning + optional Repositories
  const headerRow1 = [
    { text: "Component", rowspan: 3, style: "header" },
    { text: group.subtitle, colspan: totalColumns, style: "subtitle" },
  ];
  if (showMeta) {
    headerRow1.push({ text: "Repositories", rowspan: 3, style: "header" });
  }

  // Header row 2: phase categories
  const headerRow2 = categories.map(cat => ({
    text: cat.name,
    colspan: Math.max(cat.items.length, 1),
    style: "category"
  }));

  // Header row 3: scope items
  const headerRow3 = categories.flatMap(cat =>
    cat.items.length > 0
      ? cat.items.map(item => ({ text: item, style: "vertical" }))
      : [{ text: "", style: "empty-header" }]
  );

  // Body rows
  const bodyRows = group.rows.map(row => {
    const cells = [{ text: row.label, style: "label" }];

    for (const cell of row.cells) {
      const icon = iconsMapping[cell.status];
      cells.push({
        symbol: icon.symbol,
        background: icon.color,
        color: "white",
        title: cell.title ?? "",
        style: "status"
      });
    }

    if (showMeta) {
      const links = Array.isArray(row.meta)
        ? row.meta.map(r => ({ text: r.name, href: r.url }))
        : [];
      cells.push({ links, style: "meta" });
    }

    return cells;
  });

  return {
    headerRows: [headerRow1, headerRow2, headerRow3],
    bodyRows
  };
}

/**
 * Converts an all-checks grid group into a TableModel.
 * Uses a 2-row header (no subtitle spanning row) since there's only one category.
 *
 * @param {Object} group - A single group from buildAllChecksGrid output
 * @param {Object} iconsMapping - Map of status → {color, symbol}
 * @returns {Object} TableModel
 */
export function toAllChecksTableModel(group, iconsMapping) {
  const categories = group.columns.categories;
  const totalColumns = categories.reduce((sum, cat) => sum + Math.max(cat.items.length, 1), 0);
  const showMeta = group.rows[0]?.meta !== undefined;

  // Header row 1: Component + subtitle spanning + optional Repositories
  const headerRow1 = [
    { text: "Component", rowspan: 2, style: "header" },
    { text: group.subtitle, colspan: totalColumns, style: "subtitle" },
  ];
  if (showMeta) {
    headerRow1.push({ text: "Repositories", rowspan: 2, style: "header" });
  }

  // Header row 2: check-type items (flat, no phase grouping)
  const headerRow2 = categories.flatMap(cat =>
    cat.items.length > 0
      ? cat.items.map(item => ({ text: item, style: "vertical" }))
      : [{ text: "", style: "empty-header" }]
  );

  // Body rows
  const bodyRows = group.rows.map(row => {
    const cells = [{ text: row.label, style: "label" }];

    for (const cell of row.cells) {
      const icon = iconsMapping[cell.status];
      cells.push({
        symbol: icon.symbol,
        background: icon.color,
        color: "white",
        title: cell.title ?? "",
        style: "status"
      });
    }

    if (showMeta) {
      const links = Array.isArray(row.meta)
        ? row.meta.map(r => ({ text: r.name, href: r.url }))
        : [];
      cells.push({ links, style: "meta" });
    }

    return cells;
  });

  return {
    headerRows: [headerRow1, headerRow2],
    bodyRows
  };
}
