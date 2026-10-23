import {describe, it} from 'node:test';
import assert from 'node:assert/strict';

import {readFileSync} from "fs";
import {fileURLToPath} from "url";
import {dirname, join} from "path";

import {renderAsFlowChart, createGraph} from "./graph.js";


describe("graph", () => {
    describe("#renderAsFlowChart", () => {
        it("colours matched job nodes green when jobNames is provided", () => {
            const ghaFiles = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "__fixtures/graph__ghafiles.json"), "utf8"));
            const expectedMermaidGraph = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "__fixtures/graph__mermaid_green.txt"), "utf8");

            const graph = createGraph(ghaFiles);
            const mermaidGraph = renderAsFlowChart(graph, "govuk-one-login/quality-gates", { jobNames: ["pre-commit", "run-tests"] });

            assert.strictEqual(mermaidGraph, expectedMermaidGraph);
        })

        it("renders gha files as a mermaid flowchart", () => {
            const ghaFiles = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "__fixtures/graph__ghafiles.json"), "utf8"));
            const expectedMermaidGraph = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "__fixtures/graph__mermaid.txt"), "utf8");

            const graph = createGraph(ghaFiles);
            const mermaidGraph = renderAsFlowChart(graph, "govuk-one-login/quality-gates");

            assert.strictEqual(mermaidGraph, expectedMermaidGraph);
        })
    })
})
