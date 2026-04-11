---
title: Load Balancing
description: Distribute requests across multiple backend targets
---

MiniGateway supports multiple load balancing algorithms to distribute requests across upstream targets.

## Available Algorithms

| Algorithm           | Description                                  | Best For                |
| ------------------- | -------------------------------------------- | ----------------------- |
| `round-robin`       | Distribute evenly in rotation                | Equal-capacity backends |
| `least-connections` | Route to server with fewest active requests  | Varying load patterns   |
| `hash`              | Consistent hashing based on request key      | Session affinity        |
| `health-aware`      | Combine least-connections with health checks | Production deployments  |

## Algorithm Details

## Target Weight

Targets can have different weights for weighted distribution:

```json
{
  "upstreamId": "upstream_123",
  "target": "http://server-a:5000",
  "weight": 3 // Receives 3x more requests
}
```

With weights `[A:3, B:1]` and round-robin:

- Requests: A→A→A→B→A→A→A→B...

## Target Health

The load balancer tracks target health:

- **Healthy** - Successfully responding
- **Unhealthy** - Failed responses or timeouts

Unhealthy targets are automatically excluded from selection until they recover.

## Creating Load Balancers

You can create load balancers programmatically:

```typescript
import { createLoadBalancer } from "@minigateway/core";

const lb = createLoadBalancer("round-robin", {
  targets: [
    { url: "http://server-a:5000", weight: 1 },
    { url: "http://server-b:5000", weight: 2 },
  ],
});

const target = lb.select();
```

## Configuration Example

Complete upstream with targets:

```json
// Create upstream
{
  "name": "backend-pool",
  "algorithm": "health-aware"
}

// Add targets
{
  "upstreamId": "upstream_xyz",
  "target": "http://10.0.0.1:5000",
  "weight": 1
}
{
  "upstreamId": "upstream_xyz",
  "target": "http://10.0.0.2:5000",
  "weight": 2
}
```

## Next Steps

- [Upstreams Configuration](/configuration/upstreams/) - Configure upstreams and targets
- [Proxy Engine](/core-concepts/proxy-engine/) - Request processing flow
- [Plugins](/plugins/overview/) - Modify request routing behavior
