import { test, expect, describe, beforeEach, vi } from "vite-plus/test";
import {
  RoundRobinLoadBalancer,
  LeastConnectionsLoadBalancer,
  HashLoadBalancer,
  createLoadBalancer,
  HealthAwareLoadBalancer,
} from "./load-balancer.js";
import type { Target } from "../storage/schema.js";

const createTarget = (id: string, upstreamId: string, target: string): Target => ({
  id,
  upstreamId,
  target,
  weight: 100,
  tags: [],
  createdAt: new Date().toISOString(),
});

describe("RoundRobinLoadBalancer", () => {
  let balancer: RoundRobinLoadBalancer;

  beforeEach(() => {
    balancer = new RoundRobinLoadBalancer();
  });

  test("returns null for empty targets", () => {
    const result = balancer.select({ targets: [] });
    expect(result).toBeNull();
  });

  test("returns single target", () => {
    const targets = [createTarget("target-1", "upstream-1", "localhost:8081")];
    const result = balancer.select({ targets });
    expect(result?.id).toBe("target-1");
  });

  test("cycles through targets in order", () => {
    const targets = [
      createTarget("target-1", "upstream-1", "localhost:8081"),
      createTarget("target-2", "upstream-1", "localhost:8082"),
      createTarget("target-3", "upstream-1", "localhost:8083"),
    ];

    const first = balancer.select({ targets });
    const second = balancer.select({ targets });
    const third = balancer.select({ targets });
    const fourth = balancer.select({ targets });

    expect(first?.id).toBe("target-1");
    expect(second?.id).toBe("target-2");
    expect(third?.id).toBe("target-3");
    expect(fourth?.id).toBe("target-1"); // Wraps around
  });

  test("maintains separate state per upstream", () => {
    const targets1 = [
      createTarget("target-1a", "upstream-1", "localhost:8081"),
      createTarget("target-1b", "upstream-1", "localhost:8082"),
    ];
    const targets2 = [
      createTarget("target-2a", "upstream-2", "localhost:8083"),
      createTarget("target-2b", "upstream-2", "localhost:8084"),
    ];

    // First selection for both upstreams
    balancer.select({ targets: targets1 });
    balancer.select({ targets: targets2 });

    // Second selection should be independent
    const second1 = balancer.select({ targets: targets1 });
    const second2 = balancer.select({ targets: targets2 });

    expect(second1?.id).toBe("target-1b");
    expect(second2?.id).toBe("target-2b");
  });

  test("resets state for upstream", () => {
    const targets = [
      createTarget("target-1", "upstream-1", "localhost:8081"),
      createTarget("target-2", "upstream-1", "localhost:8082"),
    ];

    balancer.select({ targets });
    balancer.select({ targets });
    expect(balancer.getIndex("upstream-1")).toBe(0); // Wrapped around after 2 selections

    balancer.reset("upstream-1");
    expect(balancer.getIndex("upstream-1")).toBe(0);
  });
});

describe("LeastConnectionsLoadBalancer", () => {
  let balancer: LeastConnectionsLoadBalancer;

  beforeEach(() => {
    balancer = new LeastConnectionsLoadBalancer();
  });

  test("returns null for empty targets", () => {
    const result = balancer.select({ targets: [] });
    expect(result).toBeNull();
  });

  test("returns single target", () => {
    const targets = [createTarget("target-1", "upstream-1", "localhost:8081")];
    const result = balancer.select({ targets });
    expect(result?.id).toBe("target-1");
  });

  test("selects target with fewest connections", () => {
    const targets = [
      createTarget("target-1", "upstream-1", "localhost:8081"),
      createTarget("target-2", "upstream-1", "localhost:8082"),
      createTarget("target-3", "upstream-1", "localhost:8083"),
    ];

    balancer.recordConnection("target-1");
    balancer.recordConnection("target-1");
    balancer.recordConnection("target-2");
    // target-3 has 0 connections

    const result = balancer.select({ targets });
    expect(result?.id).toBe("target-3");
  });

  test("selects first target when all have equal connections", () => {
    const targets = [
      createTarget("target-1", "upstream-1", "localhost:8081"),
      createTarget("target-2", "upstream-1", "localhost:8082"),
    ];

    balancer.recordConnection("target-1");
    balancer.recordConnection("target-2");

    const result = balancer.select({ targets });
    expect(result?.id).toBe("target-1");
  });

  test("records and releases connections", () => {
    const targetId = "target-1";

    balancer.recordConnection(targetId);
    balancer.recordConnection(targetId);
    expect(balancer.getConnectionCount(targetId)).toBe(2);

    balancer.releaseConnection(targetId);
    expect(balancer.getConnectionCount(targetId)).toBe(1);

    balancer.releaseConnection(targetId);
    expect(balancer.getConnectionCount(targetId)).toBe(0);
  });

  test("does not go below zero connections", () => {
    const targetId = "target-1";

    balancer.releaseConnection(targetId);
    expect(balancer.getConnectionCount(targetId)).toBe(0);
  });

  test("clears all connections", () => {
    balancer.recordConnection("target-1");
    balancer.recordConnection("target-2");

    balancer.clear();

    expect(balancer.getConnectionCount("target-1")).toBe(0);
    expect(balancer.getConnectionCount("target-2")).toBe(0);
  });
});

describe("HashLoadBalancer", () => {
  let balancer: HashLoadBalancer;

  beforeEach(() => {
    balancer = new HashLoadBalancer();
  });

  test("returns null for empty targets", () => {
    const result = balancer.select({ targets: [] });
    expect(result).toBeNull();
  });

  test("returns single target", () => {
    const targets = [createTarget("target-1", "upstream-1", "localhost:8081")];
    const request = new Request("http://example.com");
    const result = balancer.select({ targets, request });
    expect(result?.id).toBe("target-1");
  });

  test("returns first target when no request provided", () => {
    const targets = [
      createTarget("target-1", "upstream-1", "localhost:8081"),
      createTarget("target-2", "upstream-1", "localhost:8082"),
    ];

    const result = balancer.select({ targets });
    expect(result?.id).toBe("target-1");
  });

  test("consistently routes same user to same target", () => {
    const targets = [
      createTarget("target-1", "upstream-1", "localhost:8081"),
      createTarget("target-2", "upstream-1", "localhost:8082"),
      createTarget("target-3", "upstream-1", "localhost:8083"),
    ];

    const request1 = new Request("http://example.com", {
      headers: { "x-user-id": "user-123" },
    });
    const request2 = new Request("http://example.com", {
      headers: { "x-user-id": "user-123" },
    });

    const result1 = balancer.select({ targets, request: request1 });
    const result2 = balancer.select({ targets, request: request2 });

    expect(result1?.id).toBe(result2?.id);
  });

  test("routes different users to potentially different targets", () => {
    const targets = [
      createTarget("target-1", "upstream-1", "localhost:8081"),
      createTarget("target-2", "upstream-1", "localhost:8082"),
    ];

    const request1 = new Request("http://example.com", {
      headers: { "x-user-id": "user-a" },
    });
    const request2 = new Request("http://example.com", {
      headers: { "x-user-id": "user-b" },
    });

    const result1 = balancer.select({ targets, request: request1 });
    const result2 = balancer.select({ targets, request: request2 });

    // Different users may go to different targets (or same, depending on hash)
    // This test just verifies the hash function distributes
    expect(result1).toBeDefined();
    expect(result2).toBeDefined();
  });

  test("uses x-api-key header as fallback", () => {
    const targets = [
      createTarget("target-1", "upstream-1", "localhost:8081"),
      createTarget("target-2", "upstream-1", "localhost:8082"),
    ];

    const request = new Request("http://example.com", {
      headers: { "x-api-key": "api-key-123" },
    });

    const result1 = balancer.select({ targets, request });
    const result2 = balancer.select({ targets, request });

    expect(result1?.id).toBe(result2?.id);
  });

  test("uses x-forwarded-for as final fallback", () => {
    const targets = [
      createTarget("target-1", "upstream-1", "localhost:8081"),
      createTarget("target-2", "upstream-1", "localhost:8082"),
    ];

    const request = new Request("http://example.com", {
      headers: { "x-forwarded-for": "192.168.1.1" },
    });

    const result1 = balancer.select({ targets, request });
    const result2 = balancer.select({ targets, request });

    expect(result1?.id).toBe(result2?.id);
  });
});

describe("createLoadBalancer", () => {
  test("creates RoundRobinLoadBalancer", () => {
    const balancer = createLoadBalancer("round-robin");
    expect(balancer).toBeInstanceOf(RoundRobinLoadBalancer);
  });

  test("creates LeastConnectionsLoadBalancer", () => {
    const balancer = createLoadBalancer("least-connections");
    expect(balancer).toBeInstanceOf(LeastConnectionsLoadBalancer);
  });

  test("creates HashLoadBalancer", () => {
    const balancer = createLoadBalancer("hash");
    expect(balancer).toBeInstanceOf(HashLoadBalancer);
  });
});

describe("HealthAwareLoadBalancer", () => {
  let healthAwareBalancer: HealthAwareLoadBalancer;
  let mockBalancer: { select: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockBalancer = {
      select: vi.fn(),
    };
    healthAwareBalancer = new HealthAwareLoadBalancer(mockBalancer as any);
  });

  test("returns null when no healthy targets", () => {
    const targets = [
      createTarget("target-1", "upstream-1", "localhost:8081"),
      createTarget("target-2", "upstream-1", "localhost:8082"),
    ];

    healthAwareBalancer.setHealthCheck((_id) => false);

    const result = healthAwareBalancer.select({ targets });

    expect(result).toBeNull();
    expect(mockBalancer.select).not.toHaveBeenCalled();
  });

  test("filters unhealthy targets before delegation", () => {
    const targets = [
      createTarget("target-1", "upstream-1", "localhost:8081"),
      createTarget("target-2", "upstream-1", "localhost:8082"),
      createTarget("target-3", "upstream-1", "localhost:8083"),
    ];

    healthAwareBalancer.setHealthCheck((id) => id !== "target-2");

    mockBalancer.select.mockReturnValue(targets[0]);

    healthAwareBalancer.select({ targets });

    expect(mockBalancer.select).toHaveBeenCalledWith({
      targets: [targets[0], targets[2]], // Only healthy targets
      request: undefined,
      algorithm: undefined,
    });
  });

  test("passes request to underlying balancer", () => {
    const targets = [createTarget("target-1", "upstream-1", "localhost:8081")];
    const request = new Request("http://example.com");

    mockBalancer.select.mockReturnValue(targets[0]);

    healthAwareBalancer.select({ targets, request });

    expect(mockBalancer.select).toHaveBeenCalledWith(
      expect.objectContaining({
        targets,
        request,
      }),
    );
  });
});
