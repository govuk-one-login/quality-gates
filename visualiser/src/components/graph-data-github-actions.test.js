import {describe, it} from 'node:test';
import assert from 'node:assert/strict';

import {readFileSync} from "fs";
import {fileURLToPath} from "url";
import {dirname, join} from "path";

import {githubActionCounts, isLocalOrgOrExternal} from "./graph-data-github-actions.js";

describe("graph data - github actions", () => {
    describe("#temporaryGithubActionCounts", () => {
        it("handles workflows without jobs", () => {
            const fixture = {
                organization: {
                    repositories: {
                        nodes: [{
                            name: "test-repo",
                            workflows: {
                                entries: [
                                    {
                                        name: "no-jobs.yml",
                                        object: {
                                            text: {
                                                jobs: null
                                            }
                                        }
                                    },
                                    {
                                        name: "deploy.yml",
                                        object: {
                                            text: {
                                                jobs: {
                                                    "job": {
                                                        steps: [{uses: "actions/checkout@v4"}]
                                                    }
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }]
                    }
                }
            }

            const result = githubActionCounts(fixture)

            assert.deepStrictEqual(result, [
                {name: "actions/checkout", count: 1, versions: [
                    {version: "v4", count: 1, sources: [
                            {repo: "test-repo", filePath: ".github/workflows/deploy.yml"}
                        ]}
                ]}
            ])
        })
    });

    describe("#githubActionCounts", () => {
        it("handles workflows without jobs", () => {
            const fixture = {
                organization: {
                    repositories: {
                        nodes: [{
                            name: "repo-with-no-jobs",
                            workflows: {
                                entries: [
                                    {
                                        name: "no-jobs.yml",
                                        object: {
                                            text: {
                                                jobs: null
                                            }
                                        }
                                    },
                                    {
                                        name: "deploy.yml",
                                        object: {
                                            text: {
                                                jobs: {
                                                    "job": {
                                                        steps: [{uses: "actions/checkout@v4"}]
                                                    }
                                                }
                                            }
                                        }
                                    }
                                ]
                            }
                        }]
                    }
                }
            }

            const result = githubActionCounts(fixture)

            assert.deepStrictEqual(result, [
                {name: "actions/checkout", count: 1, versions: [{version: "v4", count: 1, sources: [{repo: "repo-with-no-jobs", filePath: ".github/workflows/deploy.yml"}]}]}
            ])
        })

        it("handles repos without workflows", () => {
            const fixture = {
                organization: {
                    repositories: {
                        nodes: [
                            {
                                name: "repo-with-no-workflows",
                                workflows: null
                            },
                            {
                                name: "other-repo",
                                workflows: {
                                    entries: [{
                                        name: "deploy.yml",
                                        object: {
                                            text: {
                                                jobs: {
                                                    "job": {
                                                        steps: [{uses: "actions/checkout@v4"}]
                                                    }
                                                }
                                            }
                                        }
                                    }]
                                }
                            }
                        ]
                    }
                }
            }

            const result = githubActionCounts(fixture)

            assert.deepStrictEqual(result, [
                {name: "actions/checkout", count: 1, versions: [{version: "v4", count: 1, sources: [{repo: "other-repo", filePath: ".github/workflows/deploy.yml"}]}]}
            ])
        })

        it("handles jobs without steps", () => {
            const fixture = {
                organization: {
                    repositories: {
                        nodes: [{
                            name: "repo-with-no-steps",
                            workflows: {
                                entries: [{
                                    name: "deploy.yml",
                                    object: {
                                        text: {
                                            jobs: {
                                                "reusable-job": {
                                                    uses: "./.github/workflows/other.yml"
                                                },
                                                "normal-job": {
                                                    steps: [{
                                                        uses: "actions/checkout@v4"
                                                    }]
                                                }
                                            }
                                        }
                                    }
                                }]
                            }
                        }]
                    }
                }
            }

            const result = githubActionCounts(fixture)

            assert.deepStrictEqual(result, [
                {name: "actions/checkout", count: 1, versions: [{version: "v4", count: 1, sources: [{repo: "repo-with-no-steps", filePath: ".github/workflows/deploy.yml"}]}]}
            ])
        })

        it("generates counts for github actions in file", () => {
            const fixture = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "__fixtures/small-graphql.json"), "utf8"));

            const expectedResult = [
                {
                    name: "actions/checkout",
                    count: 5,
                    versions: [
                        {version: "v5", count: 1, sources: [{repo: "central-backend", filePath: ".github/workflows/validate-template.yml"}]},
                        {version: "v6", count: 4, sources: [
                            {repo: "central-frontend", filePath: ".github/workflows/checkov.yaml"},
                            {repo: "central-frontend", filePath: ".github/workflows/checkov.yaml"},
                            {repo: "central-frontend", filePath: ".github/workflows/codeql.yaml"},
                            {repo: "central-backend", filePath: ".github/workflows/validate-template.yml"}
                        ]}
                    ]
                },
                {name: "actions/setup-python", count: 2, versions: [{version: "v6", count: 2, sources: [
                    {repo: "central-frontend", filePath: ".github/workflows/checkov.yaml"},
                    {repo: "central-backend", filePath: ".github/workflows/validate-template.yml"}
                ]}]},
                {
                    name: "aws-actions/setup-sam",
                    count: 2,
                    versions: [
                        {version: "d78e1a4", count: 1, sources: [{repo: "central-backend", filePath: ".github/workflows/validate-template.yml"}]},
                        {version: "v2", count: 1, sources: [{repo: "central-frontend", filePath: ".github/workflows/checkov.yaml"}]}
                    ]
                },
                {
                    name: "github/codeql-action",
                    count: 3,
                    versions: [
                        {version: "0d579ff", count: 3, sources: [
                            {repo: "central-frontend", filePath: ".github/workflows/codeql.yaml"},
                            {repo: "central-frontend", filePath: ".github/workflows/codeql.yaml"},
                            {repo: "central-frontend", filePath: ".github/workflows/codeql.yaml"}
                        ]}
                    ]
                },
                {
                    name: "github/codeql-action/analyze",
                    count: 1,
                    versions: [{version: "0d579ff", count: 1, sources: [{repo: "central-frontend", filePath: ".github/workflows/codeql.yaml"}]}]
                },
                {
                    name: "github/codeql-action/autobuild",
                    count: 1,
                    versions: [{version: "0d579ff", count: 1, sources: [{repo: "central-frontend", filePath: ".github/workflows/codeql.yaml"}]}]
                },
                {
                    name: "github/codeql-action/init",
                    count: 1,
                    versions: [{version: "0d579ff", count: 1, sources: [{repo: "central-frontend", filePath: ".github/workflows/codeql.yaml"}]}]
                }
            ]

            const result = githubActionCounts(fixture)

            assert.deepStrictEqual(result, expectedResult)
        })
    })

    describe("#isLocalOrgOrExternal", () => {
        describe("local", ()=> {
            ["./.github/actions/build", "./.github/actions/push"].forEach((useName) => {
                it(`should return local for ${useName}`, () => {
                    assert.strictEqual(isLocalOrgOrExternal(useName), "local");
                });
            });
        })

        describe("org", ()=> {
            ["govuk-one-login/action", "alphagov/action"].forEach((useName) => {
                it(`should return org for ${useName}`, () => {
                    assert.strictEqual(isLocalOrgOrExternal(useName), "org");
                });
            });
        })

        describe("external", ()=> {
            ["actions/checkout", "aws-actions/setup-same"].forEach((useName) => {
                it(`should return external for ${useName}`, () => {
                    assert.strictEqual(isLocalOrgOrExternal(useName), "external");
                });
            });
        })

    })
})
