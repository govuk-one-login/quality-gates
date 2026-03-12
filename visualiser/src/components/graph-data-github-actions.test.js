import {describe, it} from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

import { githubActionCounts} from "./graph-data-github-actions.js";

describe("graph data - github actions", () => {
    describe("#githubActionCounts", () => {
        const fixture = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "__fixtures/small-graphql.json"), "utf8"));

        console.log(fixture)

        const expectedResult = [
            {
                name: "actions/checkout",
                count: 5,
                versions: [
                    {version: "v5", count: 1},
                    {version: "v6", count: 4}
                ]
            },
            {name: "actions/setup-python", count: 2, versions: [{version: "v6", count: 2}]},
            {
                name: "aws-actions/setup-sam",
                count: 2,
                versions: [
                    {version: "d78e1a4", count: 1},
                    {version: "v2", count: 1}
                ]
            },
            {
                name: "github/codeql-action",
                count: 3,
                versions: [
                    {version: "0d579ff", count: 3}
                ]
            },
            {
                name: "github/codeql-action/analyze",
                count: 1,
                versions: [{version: "0d579ff", count: 1}]
            },
            {
                name: "github/codeql-action/autobuild",
                count: 1,
                versions: [{version: "0d579ff", count: 1}]
            },
            {
                name: "github/codeql-action/init",
                count: 1,
                versions: [{version: "0d579ff", count: 1}]
            }
        ]

        const result = githubActionCounts(fixture)

        assert.deepStrictEqual(result, expectedResult)

    })
})
