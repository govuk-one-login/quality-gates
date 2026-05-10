import {describe, it} from 'node:test';
import assert from 'node:assert/strict';
import {invertNodesToHooks} from "./pre-commit-config.js";

describe('pre-commit-config', () => {
    describe('#invertNodesToHooks', () => {
        it("should remap nodes as hooks with all parent details", () => {

            const nodes = {
                "name": "quality-gates",
                "owner": {
                    "login": "govuk-one-login"
                },
                "isArchived": false,
                "isPrivate": false,
                "pod": {
                    "value": "PodName"
                },
                "productionAssets": {
                    "value": "true"
                },
                "teamResponsible": {
                    "value": "TeamName"
                },
                "preCommitConfig": {
                    "isBinary": false,
                    "text": {
                        "repos": [
                            {
                                "repo": "https://github.com/pre-commit/pre-commit-hooks",
                                "rev": "v4.4.0",
                                "hooks": [
                                    {
                                        "id": "check-json"
                                    },
                                    {
                                        "id": "end-of-file-fixer"
                                    },
                                    {
                                        "id": "trailing-whitespace"
                                    }
                                ]
                            },
                            {
                                "repo": "https://github.com/bridgecrewio/checkov.git",
                                "rev": "2.5.4",
                                "hooks": [
                                    {
                                        "id": "checkov",
                                        "verbose": true,
                                        "args": [
                                            "--soft-fail"
                                        ]
                                    }
                                ]
                            }
                        ],
                        "exclude": "^tsconfig.json$"
                    }
                }
            };

            const expected = [
                {
                    id: "check-json",
                    repositoryProperties: {
                        "name": "quality-gates",
                        "owner": {
                            "login": "govuk-one-login"
                        },
                        "isArchived": false,
                        "isPrivate": false,
                        "pod": {
                            "value": "PodName"
                        },
                        "productionAssets": {
                            "value": "true"
                        },
                        "teamResponsible": {
                            "value": "TeamName"
                        }
                    },
                    "preCommitReposProperties": {
                        "repo": "https://github.com/pre-commit/pre-commit-hooks",
                        "rev": "v4.4.0"
                    }
                },
                {
                    id: "end-of-file-fixer",
                    repositoryProperties: {
                        "name": "quality-gates",
                        "owner": {
                            "login": "govuk-one-login"
                        },
                        "isArchived": false,
                        "isPrivate": false,
                        "pod": {
                            "value": "PodName"
                        },
                        "productionAssets": {
                            "value": "true"
                        },
                        "teamResponsible": {
                            "value": "TeamName"
                        }
                    },
                    "preCommitReposProperties": {
                        "repo": "https://github.com/pre-commit/pre-commit-hooks",
                        "rev": "v4.4.0"
                    }
                },
                {
                    id: "trailing-whitespace",
                    repositoryProperties: {
                        "name": "quality-gates",
                        "owner": {
                            "login": "govuk-one-login"
                        },
                        "isArchived": false,
                        "isPrivate": false,
                        "pod": {
                            "value": "PodName"
                        },
                        "productionAssets": {
                            "value": "true"
                        },
                        "teamResponsible": {
                            "value": "TeamName"
                        }
                    },
                    "preCommitReposProperties": {
                        "repo": "https://github.com/pre-commit/pre-commit-hooks",
                        "rev": "v4.4.0"
                    }
                },
                {
                    id: "checkov",
                    hookProperties: {
                        "verbose": true,
                        "args": [
                            "--soft-fail"
                        ]
                    },
                    repositoryProperties: {
                        "name": "quality-gates",
                        "owner": {
                            "login": "govuk-one-login"
                        },
                        "isArchived": false,
                        "isPrivate": false,
                        "pod": {
                            "value": "PodName"
                        },
                        "productionAssets": {
                            "value": "true"
                        },
                        "teamResponsible": {
                            "value": "TeamName"
                        }
                    },
                    "preCommitReposProperties": {
                        "repo": "https://github.com/bridgecrewio/checkov.git",
                        "rev": "2.5.4"
                    }
                },

            ]

            const result = invertNodesToHooks(nodes);

            assert.deepEqual(result, expected);
        })
    })
})
