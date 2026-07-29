import {html} from "npm:htl";
export {buildCheckLevelGrid, buildIntegrationScopeGrid, buildAllChecksGrid} from "./status-grid-data.js";

/**
 * Renders a status grid as HTML tables with grouped headings.
 *
 * @param {Object} gridData - The intermediate data structure
 * @param {Array} gridData.groups - Array of group objects
 * @param {Object} iconsMapping - Map of status → {color, symbol}
 * @returns {HTMLElement}
 */
export function renderStatusGrid(gridData, iconsMapping) {
  return html`${gridData.groups.map(group => {
    const totalColumns = group.columns.categories.reduce((sum, cat) => sum + Math.max(cat.items.length, 1), 0);
    const showMeta = group.rows[0]?.meta !== undefined;

    return html`${group.title ? html`<h4>${group.title}</h4>` : ""}${group.subtitle ? html`<table style="border-collapse: collapse; font-size: 0.85rem; width: 100%;">
      <thead>
        <tr>
          <th rowspan="3" style="border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;">Component</th>
          <th colspan="${totalColumns}" style="border: 1px solid #ddd; padding: 6px 10px; text-align: center; background: #e8e8e8; font-weight: bold;">${group.subtitle}</th>
          ${showMeta ? html`<th rowspan="3" style="border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;">Repositories</th>` : ""}
        </tr>
        <tr>
          ${group.columns.categories.map(cat =>
            html`<th colspan="${Math.max(cat.items.length, 1)}" style="border: 1px solid #ddd; padding: 6px 10px; text-align: center; background: #f5f5f5;">${cat.name}</th>`
          )}
        </tr>
        <tr>
          ${group.columns.categories.flatMap(cat =>
            cat.items.length > 0
              ? cat.items.map(item =>
                  html`<th style="border: 1px solid #ddd; padding: 4px 6px; text-align: center; font-weight: normal; writing-mode: vertical-rl; transform: rotate(180deg); height: 120px; font-size: 0.75rem;">${item}</th>`
                )
              : [html`<th style="border: 1px solid #ddd; padding: 4px 6px;"></th>`]
          )}
        </tr>
      </thead>
      <tbody>
        ${group.rows.map(row => html`<tr>
          <td style="border: 1px solid #ddd; padding: 6px 10px; white-space: nowrap;">${row.label}</td>
          ${row.cells.map(cell => {
            const icon = iconsMapping[cell.status];
            return html`<td style="border: 1px solid #ddd; padding: 4px 8px; text-align: center; background: ${icon.color}; color: white;" title="${cell.title ?? ""}">${icon.symbol}</td>`;
          })}
          ${showMeta ? html`<td style="border: 1px solid #ddd; padding: 6px 10px; white-space: nowrap;">${Array.isArray(row.meta) ? row.meta.map((r, i) => html`${i > 0 ? ", " : ""}${r.url ? html`<a href="${r.url}">${r.name}</a>` : r.name}`) : (row.meta ?? "")}</td>` : ""}
        </tr>`)}
      </tbody>
    </table>` : html`<table style="border-collapse: collapse; font-size: 0.85rem; width: 100%;">
      <thead>
        <tr>
          <th rowspan="2" style="border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;">Component</th>
          ${group.columns.categories.map(cat =>
            html`<th colspan="${Math.max(cat.items.length, 1)}" style="border: 1px solid #ddd; padding: 6px 10px; text-align: center; background: #f5f5f5;">${cat.name}</th>`
          )}
          ${showMeta ? html`<th rowspan="2" style="border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;">Repositories</th>` : ""}
        </tr>
        <tr>
          ${group.columns.categories.flatMap(cat =>
            cat.items.length > 0
              ? cat.items.map(item =>
                  html`<th style="border: 1px solid #ddd; padding: 4px 6px; text-align: center; font-weight: normal; writing-mode: vertical-rl; transform: rotate(180deg); height: 120px; font-size: 0.75rem;">${item}</th>`
                )
              : [html`<th style="border: 1px solid #ddd; padding: 4px 6px;"></th>`]
          )}
        </tr>
      </thead>
      <tbody>
        ${group.rows.map(row => html`<tr>
          <td style="border: 1px solid #ddd; padding: 6px 10px; white-space: nowrap;">${row.label}</td>
          ${row.cells.map(cell => {
            const icon = iconsMapping[cell.status];
            return html`<td style="border: 1px solid #ddd; padding: 4px 8px; text-align: center; background: ${icon.color}; color: white;" title="${cell.title ?? ""}">${icon.symbol}</td>`;
          })}
          ${showMeta ? html`<td style="border: 1px solid #ddd; padding: 6px 10px; white-space: nowrap;">${Array.isArray(row.meta) ? row.meta.map((r, i) => html`${i > 0 ? ", " : ""}${r.url ? html`<a href="${r.url}">${r.name}</a>` : r.name}`) : (row.meta ?? "")}</td>` : ""}
        </tr>`)}
      </tbody>
    </table>`}`;
  })}`;
}
