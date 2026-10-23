import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { groupServicesByPod, prepareServicesWithPod } from "./pod-grouping.js";

function makeService(overrides) {
  return {
    product: "my-product",
    component: "frontend",
    promotionType: "securePipelines",
    pod: "Account",
    repository: "repo-a",
    ...overrides,
  };
}

describe("groupServicesByPod", () => {
  it("returns empty pods and empty noPod when given an empty array", () => {
    const result = groupServicesByPod([]);
    assert.deepEqual(result, { pods: [], noPod: {} });
  });

  it("groups a single service into its pod", () => {
    const services = [makeService({ product: "Auth", pod: "Account" })];
    const result = groupServicesByPod(services);

    assert.equal(result.pods.length, 1);
    assert.equal(result.pods[0].name, "Account");
    assert.deepEqual(Object.keys(result.pods[0].products), ["Auth"]);
    assert.equal(result.pods[0].products["Auth"].length, 1);
    assert.deepEqual(result.noPod, {});
  });

  it("groups multiple products under the same pod", () => {
    const services = [
      makeService({ product: "Auth", pod: "Account" }),
      makeService({ product: "Home", pod: "Account" }),
    ];
    const result = groupServicesByPod(services);

    assert.equal(result.pods.length, 1);
    assert.equal(result.pods[0].name, "Account");
    assert.deepEqual(Object.keys(result.pods[0].products).sort(), ["Auth", "Home"]);
  });

  it("groups products into separate pods", () => {
    const services = [
      makeService({ product: "Auth", pod: "Account" }),
      makeService({ product: "IPV-Core", pod: "Identity" }),
    ];
    const result = groupServicesByPod(services);

    assert.equal(result.pods.length, 2);
    const podNames = result.pods.map(p => p.name);
    assert.ok(podNames.includes("Account"));
    assert.ok(podNames.includes("Identity"));
  });

  it("assigns a product to majority pod when it spans repos in different pods", () => {
    const services = [
      makeService({ product: "Auth", pod: "Account", repository: "repo-a" }),
      makeService({ product: "Auth", pod: "Account", repository: "repo-b" }),
      makeService({ product: "Auth", pod: "Identity", repository: "repo-c" }),
    ];
    const result = groupServicesByPod(services);

    // Account has 2 repos, Identity has 1 — product goes to Account
    assert.equal(result.pods.length, 1);
    assert.equal(result.pods[0].name, "Account");
    assert.equal(result.pods[0].products["Auth"].length, 3);
  });

  it("includes ALL services for a product under the majority pod (even those from minority pods)", () => {
    const services = [
      makeService({ product: "Auth", pod: "Account", repository: "repo-a", component: "api" }),
      makeService({ product: "Auth", pod: "Account", repository: "repo-b", component: "frontend" }),
      makeService({ product: "Auth", pod: "Identity", repository: "repo-c", component: "shared" }),
    ];
    const result = groupServicesByPod(services);

    // All 3 services should be under Account pod
    assert.equal(result.pods[0].products["Auth"].length, 3);
    const components = result.pods[0].products["Auth"].map(s => s.component).sort();
    assert.deepEqual(components, ["api", "frontend", "shared"]);
  });

  it("puts services with null pod into noPod", () => {
    const services = [makeService({ product: "Orphan", pod: null })];
    const result = groupServicesByPod(services);

    assert.equal(result.pods.length, 0);
    assert.deepEqual(Object.keys(result.noPod), ["Orphan"]);
    assert.equal(result.noPod["Orphan"].length, 1);
  });

  it("puts services with undefined pod into noPod", () => {
    const services = [makeService({ product: "Orphan", pod: undefined })];
    const result = groupServicesByPod(services);

    assert.equal(result.pods.length, 0);
    assert.deepEqual(Object.keys(result.noPod), ["Orphan"]);
  });

  it("puts services with empty string pod into noPod", () => {
    const services = [makeService({ product: "Orphan", pod: "" })];
    const result = groupServicesByPod(services);

    assert.equal(result.pods.length, 0);
    assert.deepEqual(Object.keys(result.noPod), ["Orphan"]);
  });

  it("sorts pods alphabetically by name", () => {
    const services = [
      makeService({ product: "Z-Service", pod: "Zebra" }),
      makeService({ product: "A-Service", pod: "Alpha" }),
      makeService({ product: "M-Service", pod: "Middle" }),
    ];
    const result = groupServicesByPod(services);

    const podNames = result.pods.map(p => p.name);
    assert.deepEqual(podNames, ["Alpha", "Middle", "Zebra"]);
  });

  it("sorts products alphabetically within each pod", () => {
    const services = [
      makeService({ product: "Zebra-Product", pod: "Account" }),
      makeService({ product: "Alpha-Product", pod: "Account" }),
      makeService({ product: "Middle-Product", pod: "Account" }),
    ];
    const result = groupServicesByPod(services);

    const productNames = Object.keys(result.pods[0].products);
    assert.deepEqual(productNames, ["Alpha-Product", "Middle-Product", "Zebra-Product"]);
  });

  it("sorts products alphabetically in noPod", () => {
    const services = [
      makeService({ product: "Zebra", pod: null }),
      makeService({ product: "Alpha", pod: null }),
    ];
    const result = groupServicesByPod(services);

    const productNames = Object.keys(result.noPod);
    assert.deepEqual(productNames, ["Alpha", "Zebra"]);
  });

  it("handles a mix of pod and noPod services", () => {
    const services = [
      makeService({ product: "Auth", pod: "Account" }),
      makeService({ product: "IPV", pod: "Identity" }),
      makeService({ product: "Orphan", pod: null }),
    ];
    const result = groupServicesByPod(services);

    assert.equal(result.pods.length, 2);
    assert.deepEqual(Object.keys(result.noPod), ["Orphan"]);
  });

  it("groups multiple services for same product under same pod entry", () => {
    const services = [
      makeService({ product: "Auth", pod: "Account", component: "api" }),
      makeService({ product: "Auth", pod: "Account", component: "frontend" }),
    ];
    const result = groupServicesByPod(services);

    assert.equal(result.pods[0].products["Auth"].length, 2);
  });

  it("handles tie-break for majority pod deterministically (alphabetical pod wins)", () => {
    const services = [
      makeService({ product: "Shared", pod: "Identity", repository: "repo-a" }),
      makeService({ product: "Shared", pod: "Account", repository: "repo-b" }),
    ];
    const result = groupServicesByPod(services);

    // Tie: 1 each — alphabetically first pod wins ("Account" < "Identity")
    assert.equal(result.pods.length, 1);
    assert.equal(result.pods[0].name, "Account");
    assert.equal(result.pods[0].products["Shared"].length, 2);
  });
});

describe("prepareServicesWithPod", () => {
  function makeNode(overrides) {
    return {
      name: "repo-a",
      owner: { login: "org" },
      pod: { value: "Account" },
      manifest: {
        text: {
          services: [
            { product: "Auth", component: "api", promotionType: "securePipelines" }
          ]
        }
      },
      ...overrides,
    };
  }

  it("returns an empty array when given no repositories", () => {
    const result = prepareServicesWithPod([]);
    assert.deepEqual(result, []);
  });

  it("skips repositories without manifests", () => {
    const nodes = [makeNode({ manifest: null })];
    const result = prepareServicesWithPod(nodes);
    assert.deepEqual(result, []);
  });

  it("skips repositories where manifest.text has no services", () => {
    const nodes = [makeNode({ manifest: { text: {} } })];
    const result = prepareServicesWithPod(nodes);
    assert.deepEqual(result, []);
  });

  it("attaches repository name to each service", () => {
    const nodes = [makeNode({ name: "my-repo" })];
    const result = prepareServicesWithPod(nodes);
    assert.equal(result[0].repository, "my-repo");
  });

  it("attaches repositoryUrl to each service", () => {
    const nodes = [makeNode({ name: "my-repo", owner: { login: "my-org" } })];
    const result = prepareServicesWithPod(nodes);
    assert.equal(result[0].repositoryUrl, "https://github.com/my-org/my-repo");
  });

  it("attaches pod value from the node to each service", () => {
    const nodes = [makeNode({ pod: { value: "Identity" } })];
    const result = prepareServicesWithPod(nodes);
    assert.equal(result[0].pod, "Identity");
  });

  it("attaches null pod when node has no pod property", () => {
    const nodes = [makeNode({ pod: null })];
    const result = prepareServicesWithPod(nodes);
    assert.equal(result[0].pod, null);
  });

  it("attaches null pod when pod has no value", () => {
    const nodes = [makeNode({ pod: {} })];
    const result = prepareServicesWithPod(nodes);
    assert.equal(result[0].pod, null);
  });

  it("flattens multiple services from a single repo", () => {
    const nodes = [makeNode({
      manifest: {
        text: {
          services: [
            { product: "Auth", component: "api", promotionType: "securePipelines" },
            { product: "Auth", component: "frontend", promotionType: "securePipelines" },
          ]
        }
      }
    })];
    const result = prepareServicesWithPod(nodes);
    assert.equal(result.length, 2);
    assert.equal(result[0].component, "api");
    assert.equal(result[1].component, "frontend");
  });

  it("flattens services from multiple repos", () => {
    const nodes = [
      makeNode({ name: "repo-a", pod: { value: "Account" } }),
      makeNode({ name: "repo-b", pod: { value: "Identity" }, manifest: { text: { services: [{ product: "IPV", component: "core", promotionType: "securePipelines" }] } } }),
    ];
    const result = prepareServicesWithPod(nodes);
    assert.equal(result.length, 2);
    assert.equal(result[0].pod, "Account");
    assert.equal(result[1].pod, "Identity");
  });

  it("skips services missing a product (e.g. authored against a different schema version)", () => {
    const nodes = [makeNode({
      manifest: {
        text: {
          services: [
            { component: "api", promotionType: "securePipelines" },
            { product: "Auth", component: "frontend", promotionType: "securePipelines" },
          ]
        }
      }
    })];
    const result = prepareServicesWithPod(nodes);
    assert.equal(result.length, 1);
    assert.equal(result[0].product, "Auth");
    assert.equal(result[0].component, "frontend");
  });

  it("skips services missing a component", () => {
    const nodes = [makeNode({
      manifest: {
        text: {
          services: [
            { product: "Auth", promotionType: "securePipelines" },
          ]
        }
      }
    })];
    const result = prepareServicesWithPod(nodes);
    assert.deepEqual(result, []);
  });

  it("does not throw and yields no malformed services when every service lacks identity fields", () => {
    const nodes = [makeNode({
      manifest: { text: { services: [{ promotionType: "securePipelines" }] } }
    })];
    const result = prepareServicesWithPod(nodes);
    assert.deepEqual(result, []);
  });

  it("preserves all original service properties", () => {
    const nodes = [makeNode({
      manifest: {
        text: {
          services: [
            { product: "Auth", component: "api", promotionType: "securePipelines", automated: [{ checks: [{ name: "unit" }] }] }
          ]
        }
      }
    })];
    const result = prepareServicesWithPod(nodes);
    assert.equal(result[0].product, "Auth");
    assert.equal(result[0].component, "api");
    assert.equal(result[0].promotionType, "securePipelines");
    assert.deepEqual(result[0].automated, [{ checks: [{ name: "unit" }] }]);
  });
});
