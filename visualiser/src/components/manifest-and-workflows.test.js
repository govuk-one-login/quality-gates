import {describe, it} from 'node:test';
import assert from 'node:assert/strict';

import {
    flattenJobs,
    nodesWithManifests,
    flattenQualityGatesJobs,
    qualityGatesJobsToCheckStepRunUses,
    cleanupValues
} from "./manifest-and-workflows.js";

describe("manifest-and-workflows", () => {
    describe("#nodesWithManifests", () => {
        it("excludes nodes without a manifest", () => {
            const nodes = [{name: "a"}, {
                name: "b",
                manifest: {text: {$schema: "https://example.com/tags/v1.2.3/schemas/schema.json"}}
            }];
            assert.equal(nodesWithManifests(nodes).length, 1);
        });

        it("extracts the version from the $schema URL", () => {
            const nodes = [{
                name: "a",
                manifest: {text: {$schema: "https://example.com/tags/v1.2.3/schemas/schema.json"}}
            }];
            assert.equal(nodesWithManifests(nodes)[0].manifest.text.version, "1.2.3");
        });

        it("sets version to undefined when $schema does not match", () => {
            const nodes = [{name: "a", manifest: {text: {$schema: "https://example.com/no-version-here"}}}];
            assert.equal(nodesWithManifests(nodes)[0].manifest.text.version, undefined);
        });
    })

    describe('#flattenQualityGateJobs', () => {
        it("flattens quality gates with jobs", () => {

            const nodes = [
                {
                    name: "repo-a",
                    manifest: {
                        text: {
                            services: [
                                {
                                    "product": "service-a",
                                    "checks": [
                                        {
                                            "checkTypes": ["code style and linting", "vulnerability detection"],
                                            "config": {
                                                file: ".github/workflows/ci.yaml",
                                                path: "$.jobs.build"
                                            }
                                        },
                                        {
                                            "checkTypes": ["unit"],
                                            "config": {
                                                file: ".github/workflows/ci.yaml",
                                                path: "$.jobs.test"
                                            }
                                        }
                                    ]
                                },
                                {
                                    "product": "service-b",
                                    "checks": [
                                        {
                                            "checkTypes": ["code style and linting", "vulnerability detection"],
                                            "config": {
                                                file: ".github/workflows/ci.yaml",
                                                path: "$.jobs.build"
                                            }
                                        },
                                        {
                                            "checkTypes": ["unit"],
                                            "config": {
                                                file: ".github/workflows/ci.yaml",
                                                path: "$.jobs.test"
                                            }
                                        },
                                        {
                                            "checkTypes": ["component", "regression"],
                                            "config": {
                                                file: ".github/workflows/ci.yaml",
                                                path: "$.jobs.integration-test"
                                            }
                                        }
                                    ]
                                }
                            ]
                        }
                    },
                    workflows: {
                        entries: [
                            {
                                name: "ci.yaml",
                                object: {
                                    text: {
                                        name: "CI",
                                        jobs: {
                                            build: {name: "Build"},
                                            test: {name: "Run Tests"},
                                            "integration-test": {name: "Run Integration Tests"}
                                        }
                                    }
                                }
                            },
                            {
                                name: "deploy.yaml",
                                object: {
                                    text: {
                                        name: "Deploy",
                                        jobs: {test: {name: "Run Tests"}, release: {name: "Release"}}
                                    }
                                }
                            }
                        ]
                    }
                }
            ];

            const flattenedQualityGatesJobs = [
                {
                    "checkTypes": ["code style and linting", "vulnerability detection"],
                    "job": {
                        "__workflow-file": "ci.yaml",
                        "__workflow-name": "CI",
                        "__path": "$.jobs.build",
                        "__repoName": "repo-a",
                        "__serviceTag": "service-a",
                        name: "Build"
                    }
                },
                {
                    "checkTypes": ["unit"],
                    "job": {
                        "__workflow-file": "ci.yaml",
                        "__workflow-name": "CI",
                        "__path": "$.jobs.test",
                        "__repoName": "repo-a",
                        "__serviceTag": "service-a",
                        name: "Run Tests"
                    }
                },
                {
                    "checkTypes": ["code style and linting", "vulnerability detection"],
                    "job": {
                        "__workflow-file": "ci.yaml",
                        "__workflow-name": "CI",
                        "__path": "$.jobs.build",
                        "__repoName": "repo-a",
                        "__serviceTag": "service-b",
                        name: "Build"
                    }
                },
                {
                    "checkTypes": ["unit"],
                    "job": {
                        "__workflow-file": "ci.yaml",
                        "__workflow-name": "CI",
                        "__path": "$.jobs.test",
                        "__repoName": "repo-a",
                        "__serviceTag": "service-b",
                        name: "Run Tests"
                    }
                },
                {
                    "checkTypes": ["component", "regression"],
                    "job": {
                        "__workflow-file": "ci.yaml",
                        "__workflow-name": "CI",
                        "__path": "$.jobs.integration-test",
                        "__repoName": "repo-a",
                        "__serviceTag": "service-b",
                        name: "Run Integration Tests"
                    }
                }
            ]

            const result = flattenQualityGatesJobs(nodes);

            assert.deepEqual(result, flattenedQualityGatesJobs);
        })

        it("handles bracket-notation paths", () => {
            const nodes = [{
                name: "repo-a",
                manifest: {
                    text: {
                        services: [{
                            "product": "service-a",
                            "checks": [{
                                "checkTypes": ["unit"],
                                "config": {file: ".github/workflows/ci.yaml", path: "$.jobs['my-job']"}
                            }]
                        }]
                    }
                },
                workflows: {
                    entries: [{
                        name: "ci.yaml",
                        object: {text: {name: "CI", jobs: {"my-job": {name: "My Job"}}}}
                    }]
                }
            }];
            const result = flattenQualityGatesJobs(nodes);
            assert.equal(result.length, 1);
            assert.equal(result[0].job.name, "My Job");
            assert.equal(result[0].job["__path"], "$.jobs['my-job']");
        })

        it("extracts job from step-level paths", () => {
            const nodes = [{
                name: "repo-a",
                manifest: {
                    text: {
                        services: [{
                            "product": "service-a",
                            "checks": [{
                                "checkTypes": ["unit"],
                                "config": {file: ".github/workflows/ci.yaml", path: "$.jobs.build.steps[?@.name=='Run tests']"}
                            }]
                        }]
                    }
                },
                workflows: {
                    entries: [{
                        name: "ci.yaml",
                        object: {text: {name: "CI", jobs: {build: {name: "Build", steps: [{name: "Run tests"}]}}}}
                    }]
                }
            }];
            const result = flattenQualityGatesJobs(nodes);
            assert.equal(result.length, 1);
            assert.equal(result[0].job.name, "Build");
            assert.equal(result[0].job["__path"], "$.jobs.build.steps[?@.name=='Run tests']");
        })

        it("skips invalid JSONPath paths", () => {
            const nodes = [{
                name: "repo-a",
                manifest: {
                    text: {
                        services: [{
                            "product": "service-a",
                            "checks": [{
                                "checkTypes": ["unit"],
                                "config": {file: ".github/workflows/ci.yaml", path: "$.invalid[syntax"}
                            }]
                        }]
                    }
                },
                workflows: {
                    entries: [{
                        name: "ci.yaml",
                        object: {text: {name: "CI", jobs: {build: {name: "Build"}}}}
                    }]
                }
            }];
            assert.deepEqual(flattenQualityGatesJobs(nodes), []);
        })

        it("skips when parsed job does not exist in workflow", () => {
            const nodes = [{
                name: "repo-a",
                manifest: {
                    text: {
                        services: [{
                            "product": "service-a",
                            "checks": [{
                                "checkTypes": ["unit"],
                                "config": {file: ".github/workflows/ci.yaml", path: "$.jobs.missing"}
                            }]
                        }]
                    }
                },
                workflows: {
                    entries: [{
                        name: "ci.yaml",
                        object: {text: {name: "CI", jobs: {build: {name: "Build"}}}}
                    }]
                }
            }];
            assert.deepEqual(flattenQualityGatesJobs(nodes), []);
        })

        it("still supports legacy paths without $ prefix", () => {
            const nodes = [{
                name: "repo-a",
                manifest: {
                    text: {
                        services: [{
                            "product": "service-a",
                            "checks": [{
                                "checkTypes": ["unit"],
                                "config": {file: ".github/workflows/ci.yaml", path: "jobs.build"}
                            }]
                        }]
                    }
                },
                workflows: {
                    entries: [{
                        name: "ci.yaml",
                        object: {text: {name: "CI", jobs: {build: {name: "Build"}}}}
                    }]
                }
            }];
            const result = flattenQualityGatesJobs(nodes);
            assert.equal(result.length, 1);
            assert.equal(result[0].job.name, "Build");
        })

        it("returns empty array for service with empty checks", () => {
            const nodes = [{
                name: "repo-a",
                manifest: {text: {services: [{"product": "service-a", "checks": []}]}},
                workflows: {entries: []}
            }];
            assert.deepEqual(flattenQualityGatesJobs(nodes), []);
        })

        it("skips quality gates where the workflow file is not found", () => {
            const nodes = [{
                name: "repo-a",
                manifest: {
                    text: {
                        services: [{
                            "product": "service-a", "checks": [{
                                "checkTypes": ["unit"],
                                "config": {file: ".github/workflows/missing.yaml", path: "$.jobs.test"}
                            }]
                        }]
                    }
                },
                workflows: {entries: []}
            }];
            assert.deepEqual(flattenQualityGatesJobs(nodes), []);
        })

        it("skips quality gates without a config", () => {
            const nodes = [{
                name: "repo-a",
                manifest: {
                    text: {
                        services: [{
                            "product": "service-a",
                            "checks": [{"checkTypes": ["unit"]}]
                        }]
                    }
                },
                workflows: {entries: []}
            }];
            assert.deepEqual(flattenQualityGatesJobs(nodes), []);
        })

    });

    describe('#qualityGatesJobsToCheckRunUses', () => {
        it("transforms", () => {
            const qualityGatesJobs = [
                {
                    "checkTypes": ["code style and linting"],
                    "job": {
                        steps: [
                            {
                                name: "📦 Check Out Repository Code",
                                uses: "actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd"
                            },
                            {
                                name: "✅ Run Pre-commit Hooks",
                                run: "pre-commit run --show-diff-on-failure --color=alwa…-ref \"${{ github.event.pull_request.head.sha }}\"\n"
                            }
                        ]
                    }
                }
            ];

            const expected = [
                {
                    "check-type": "code style and linting",
                    "run-use-type": "use",
                    "value": "actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd"
                },
                {
                    "check-type": "code style and linting",
                    "run-use-type": "run",
                    "value": "pre-commit run --show-diff-on-failure --color=alwa…-ref \"${{ github.event.pull_request.head.sha }}\"\n"
                },

            ]
            assert.deepEqual(qualityGatesJobsToCheckStepRunUses(qualityGatesJobs), expected);
        })
    })

    describe("#cleanupValues", () => {
        describe("on uses", () => {
            it("removes versions", () => {
                assert.equal(cleanupValues("actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd"), "actions/checkout")
            })
        })

        describe("on run", () => {
            it("removes \n", () => {
                assert.equal(cleanupValues("pre-commit run \n"), "pre-commit run")
            })
        })
    })
    describe("#flattenJobs", () => {
        it("returns an empty array for an empty node list", () => {
            assert.deepEqual(flattenJobs([]), []);
        });

        it("returns an empty array for a node with no workflows", () => {
            assert.deepEqual(flattenJobs([{name: "a"}]), []);
        });

        it("returns an empty array for a workflow with no jobs", () => {
            const nodes = [{
                name: "a",
                workflows: {entries: [{name: "ci.yaml", object: {text: {name: "CI"}}}]}
            }];
            assert.deepEqual(flattenJobs(nodes), []);
        });

        it("sets __owner, __pod, __teamResponsible to undefined when absent", () => {
            const nodes = [{
                name: "my-repo",
                workflows: {
                    entries: [{
                        name: "ci.yaml",
                        object: {text: {name: "CI", jobs: {build: {}}}}
                    }]
                }
            }];
            const [job] = flattenJobs(nodes);
            assert.equal(job["__owner"], undefined);
            assert.equal(job["__pod"], undefined);
            assert.equal(job["__teamResponsible"], undefined);
        });

        it("flattens jobs with node and workflow metadata", () => {
            const nodes = [{
                name: "my-repo",
                owner: {login: "my-org"},
                pod: {value: "my-pod"},
                teamResponsible: {value: "my-team"},
                workflows: {
                    entries: [{
                        name: "ci.yaml",
                        object: {text: {name: "CI", jobs: {build: {runs_on: "ubuntu-latest"}}}}
                    }]
                }
            }];
            assert.deepEqual(flattenJobs(nodes), [{
                "runs_on": "ubuntu-latest",
                "__workflow-file": "ci.yaml",
                "__workflow-name": "CI",
                "__path": "jobs.build",
                "__name": "my-repo",
                "__owner": "my-org",
                "__pod": "my-pod",
                "__teamResponsible": "my-team"
            }]);
        });
        it("flattens jobs across multiple workflows and nodes", () => {
            const nodes = [
                {
                    name: "repo-a",
                    workflows: {
                        entries: [
                            {name: "ci.yaml", object: {text: {name: "CI", jobs: {build: {}, test: {}}}}},
                            {name: "deploy.yaml", object: {text: {name: "Deploy", jobs: {release: {}}}}}
                        ]
                    }
                },
                {
                    name: "repo-b",
                    workflows: {
                        entries: [
                            {name: "lint.yaml", object: {text: {name: "Lint", jobs: {lint: {}}}}}
                        ]
                    }
                }
            ];
            const result = flattenJobs(nodes);
            assert.equal(result.length, 4);
            assert.deepEqual(result.map(j => j["__path"]), ["jobs.build", "jobs.test", "jobs.release", "jobs.lint"]);
            assert.deepEqual(result.map(j => j["__name"]), ["repo-a", "repo-a", "repo-a", "repo-b"]);
        });
    })

    describe("#allUses", () => {
        it("should return all uses from jobs and steps", () => {
        })
    })

    describe("#allRuns", () => {
        it("should return all runs from jobs and steps", () => {

        })
    })
})
