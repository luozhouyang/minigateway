import type { Target } from "../storage/schema.js";

/**
 * Load balancer algorithm types
 */
export type LoadBalancingAlgorithm = "round-robin" | "least-connections" | "hash";

/**
 * Options for load balancer selection
 */
export interface LoadBalancerOptions {
  targets: Target[];
  request?: Request;
  algorithm?: LoadBalancingAlgorithm;
}

/**
 * State interface for round-robin load balancer
 */
export interface RoundRobinState {
  currentIndex: number;
}

/**
 * LoadBalancer interface for different algorithms
 */
export interface LoadBalancer {
  select(options: LoadBalancerOptions): Target | null;
}

/**
 * Round-robin load balancer
 * Cycles through targets in order, distributing load evenly
 */
export class RoundRobinLoadBalancer implements LoadBalancer {
  private state: Map<string, RoundRobinState> = new Map();

  select(options: LoadBalancerOptions): Target | null {
    const { targets } = options;

    if (targets.length === 0) {
      return null;
    }

    if (targets.length === 1) {
      return targets[0];
    }

    const upstreamId = targets[0].upstreamId!;
    const currentState = this.state.get(upstreamId) || { currentIndex: 0 };
    const selectedIndex = currentState.currentIndex;
    const nextIndex = (selectedIndex + 1) % targets.length;

    this.state.set(upstreamId, { currentIndex: nextIndex });

    return targets[selectedIndex];
  }

  /**
   * Reset round-robin state for an upstream
   */
  reset(upstreamId: string): void {
    this.state.delete(upstreamId);
  }

  /**
   * Get current index for an upstream (for testing)
   */
  getIndex(upstreamId: string): number {
    return this.state.get(upstreamId)?.currentIndex || 0;
  }
}

/**
 * Least-connections load balancer
 * Selects the target with the fewest active connections
 */
export class LeastConnectionsLoadBalancer implements LoadBalancer {
  private connections: Map<string, number> = new Map();

  select(options: LoadBalancerOptions): Target | null {
    const { targets } = options;

    if (targets.length === 0) {
      return null;
    }

    if (targets.length === 1) {
      return targets[0];
    }

    let minConnections = Infinity;
    let selected: Target = targets[0];

    for (const target of targets) {
      const connections = this.connections.get(target.id) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selected = target;
      }
    }

    return selected;
  }

  /**
   * Record a new connection
   */
  recordConnection(targetId: string): void {
    const current = this.connections.get(targetId) || 0;
    this.connections.set(targetId, current + 1);
  }

  /**
   * Release a connection
   */
  releaseConnection(targetId: string): void {
    const current = this.connections.get(targetId) || 0;
    this.connections.set(targetId, Math.max(0, current - 1));
  }

  /**
   * Get connection count for a target
   */
  getConnectionCount(targetId: string): number {
    return this.connections.get(targetId) || 0;
  }

  /**
   * Clear all connection tracking
   */
  clear(): void {
    this.connections.clear();
  }
}

/**
 * Hash-based load balancer
 * Consistently routes same key to same target
 */
export class HashLoadBalancer implements LoadBalancer {
  select(options: LoadBalancerOptions): Target | null {
    const { targets, request } = options;

    if (targets.length === 0) {
      return null;
    }

    if (targets.length === 1) {
      return targets[0];
    }

    if (!request) {
      return targets[0];
    }

    // Use X-User-ID or X-API-Key as hash key, fallback to IP
    const hashKey =
      request.headers.get("x-user-id") ||
      request.headers.get("x-api-key") ||
      request.headers.get("x-forwarded-for") ||
      "default";

    const hash = this.hashString(hashKey);
    const index = Math.abs(hash) % targets.length;

    return targets[index];
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }
}

/**
 * Factory function to create load balancer by algorithm type
 */
export function createLoadBalancer(algorithm: LoadBalancingAlgorithm): LoadBalancer {
  switch (algorithm) {
    case "round-robin":
      return new RoundRobinLoadBalancer();
    case "least-connections":
      return new LeastConnectionsLoadBalancer();
    case "hash":
      return new HashLoadBalancer();
    default:
      return new RoundRobinLoadBalancer();
  }
}

/**
 * Health-aware target selector wrapper
 * Filters unhealthy targets before applying load balancing algorithm
 */
export class HealthAwareLoadBalancer {
  constructor(
    private balancer: LoadBalancer,
    private healthCheck: (targetId: string) => boolean = () => true,
  ) {}

  select(options: LoadBalancerOptions): Target | null {
    const { targets } = options;

    // Filter out unhealthy targets
    const healthyTargets = targets.filter((t) => this.healthCheck(t.id));

    if (healthyTargets.length === 0) {
      return null;
    }

    return this.balancer.select({ ...options, targets: healthyTargets });
  }

  /**
   * Update health check function
   */
  setHealthCheck(healthCheck: (targetId: string) => boolean): void {
    this.healthCheck = healthCheck;
  }
}
