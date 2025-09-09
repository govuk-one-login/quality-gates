import {html} from "npm:htl";
import _ from "npm:lodash"

export function renderCellForPhase(checks, phase) {
    const cellsToRender = _.filter(checks, ["phase", phase])
    return html`<ul style="list-style-type:none; margin-left:0px; padding-left:0px">${cellsToRender.map((c) => html`<li>${c.enforced ? `✅` : `➖`} ${c.config.name ?? c.config.path.replace("jobs.", "")} (${c.config.file.replace(".github/workflows/", "")})</li>`)}</ul>`
}
export function renderDataTable(dataTable) {
    const columnHeaders = ["check","pre-merge","build","staging","production","integration"]

    const header =  html`<tr>${columnHeaders.map((h) => html`<td><b>${h}</b></td>`)}</tr>`

    const rows = _.map(dataTable, (value, key) => {
        return html`<tr><td>${key}</td><td>${renderCellForPhase(value, "pre-merge")}</td></tr>`
    })
    return html`<table>${header}${rows}</table>`
}
