import {html} from "npm:htl";
export {buildCheckLevelGrid, buildIntegrationScopeGrid, buildAllChecksGrid} from "./status-grid-data.js";
export {toCheckLevelTableModel, toIntegrationTableModel, toAllChecksTableModel} from "./status-grid-presentation.js";

/**
 * Renders a TableModel as an HTML table.
 *
 * @param {Object} tableModel - A TableModel with headerRows and bodyRows
 * @returns {HTMLElement}
 */
export function renderStatusGrid(tableModel) {
  return html`<table style="border-collapse: collapse; font-size: 0.85rem; width: 100%;">
    <thead>
      ${tableModel.headerRows.map(row => html`<tr>
        ${row.map(cell => renderHeaderCell(cell))}
      </tr>`)}
    </thead>
    <tbody>
      ${tableModel.bodyRows.map(row => html`<tr>
        ${row.map(cell => renderBodyCell(cell))}
      </tr>`)}
    </tbody>
  </table>`;
}

function createTh(cell, style) {
  const th = document.createElement("th");
  if (cell.colspan) th.setAttribute("colspan", cell.colspan);
  if (cell.rowspan) th.setAttribute("rowspan", cell.rowspan);
  th.setAttribute("style", style);
  th.textContent = cell.text ?? "";
  return th;
}

function renderHeaderCell(cell) {
  switch (cell.style) {
    case "header":
      return createTh(cell, "border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;");
    case "subtitle":
      return createTh(cell, "border: 1px solid #ddd; padding: 6px 10px; text-align: center; background: #e8e8e8; font-weight: bold;");
    case "category":
      return createTh(cell, "border: 1px solid #ddd; padding: 6px 10px; text-align: center; background: #f5f5f5;");
    case "vertical":
      return createTh(cell, "border: 1px solid #ddd; padding: 4px 6px; text-align: center; font-weight: normal; writing-mode: vertical-rl; transform: rotate(180deg); height: 120px; font-size: 0.75rem;");
    case "empty-header":
      return createTh(cell, "border: 1px solid #ddd; padding: 4px 6px;");
    default:
      return createTh(cell, "border: 1px solid #ddd; padding: 6px 10px;");
  }
}

function renderBodyCell(cell) {
  switch (cell.style) {
    case "label":
      return html`<td style="border: 1px solid #ddd; padding: 6px 10px; white-space: nowrap;">${cell.text}</td>`;
    case "status": {
      const td = document.createElement("td");
      td.setAttribute("style", `border: 1px solid #ddd; padding: 4px 8px; text-align: center; background: ${cell.background}; color: ${cell.color};`);
      td.setAttribute("title", cell.title);
      td.textContent = cell.symbol;
      return td;
    }
    case "meta":
      return html`<td style="border: 1px solid #ddd; padding: 6px 10px; white-space: nowrap;">${renderLinks(cell.links)}</td>`;
    default:
      return html`<td style="border: 1px solid #ddd; padding: 6px 10px;">${cell.text ?? ""}</td>`;
  }
}

function renderLinks(links) {
  if (!links || links.length === 0) return "";
  return links.map((link, i) =>
    html`${i > 0 ? ", " : ""}${link.href ? html`<a href="${link.href}">${link.text}</a>` : link.text}`
  );
}
