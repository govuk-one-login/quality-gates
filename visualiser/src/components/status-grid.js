import {html} from "npm:htl";
export {buildCheckLevelGrid, buildIntegrationScopeGrid} from "./status-grid-data.js";

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
    const totalColumns = group.columns.categories.reduce((sum, cat) => sum + cat.items.length, 0);

    return html`<h3>${group.title}</h3>${group.subtitle ? html`<table style="border-collapse: collapse; font-size: 0.85rem; width: 100%;">
      <thead>
        <tr>
          <th rowspan="3" style="border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;">Component</th>
          <th colspan="${totalColumns}" style="border: 1px solid #ddd; padding: 6px 10px; text-align: center; background: #e8e8e8; font-weight: bold;">${group.subtitle}</th>
          ${group.rows[0]?.meta !== undefined ? html`<th rowspan="3" style="border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;">Repositories</th>` : ""}
        </tr>
        <tr>
          ${group.columns.categories.map(cat =>
            html`<th colspan="${cat.items.length}" style="border: 1px solid #ddd; padding: 6px 10px; text-align: center; background: #f5f5f5;">${cat.name}</th>`
          )}
        </tr>
        <tr>
          ${group.columns.categories.flatMap(cat =>
            cat.items.map(item =>
              html`<th style="border: 1px solid #ddd; padding: 4px 6px; text-align: center; font-weight: normal; writing-mode: vertical-rl; transform: rotate(180deg); height: 120px; font-size: 0.75rem;">${item}</th>`
            )
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
          ${row.meta !== undefined ? html`<td style="border: 1px solid #ddd; padding: 6px 10px; white-space: nowrap;">${row.meta}</td>` : ""}
        </tr>`)}
      </tbody>
    </table>` : html`<table style="border-collapse: collapse; font-size: 0.85rem; width: 100%;">
      <thead>
        <tr>
          <th rowspan="2" style="border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;">Component</th>
          ${group.columns.categories.map(cat =>
            html`<th colspan="${cat.items.length}" style="border: 1px solid #ddd; padding: 6px 10px; text-align: center; background: #f5f5f5;">${cat.name}</th>`
          )}
          ${group.rows[0]?.meta !== undefined ? html`<th rowspan="2" style="border: 1px solid #ddd; padding: 6px 10px; text-align: left; vertical-align: bottom;">Repositories</th>` : ""}
        </tr>
        <tr>
          ${group.columns.categories.flatMap(cat =>
            cat.items.map(item =>
              html`<th style="border: 1px solid #ddd; padding: 4px 6px; text-align: center; font-weight: normal; writing-mode: vertical-rl; transform: rotate(180deg); height: 120px; font-size: 0.75rem;">${item}</th>`
            )
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
          ${row.meta !== undefined ? html`<td style="border: 1px solid #ddd; padding: 6px 10px; white-space: nowrap;">${row.meta}</td>` : ""}
        </tr>`)}
      </tbody>
    </table>`}`;
  })}`;
}
