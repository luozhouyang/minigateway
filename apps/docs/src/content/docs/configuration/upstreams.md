---
title: Upstreams & Targets
description: Configure backend server pools and load balancing
---

Upstreams are backend server pools. Targets are individual servers within an upstream.

## Upstream Structure

```typescript
interface Upstream {
  id: string;
  name: string;
  algorithm?: string; // Load balancing algorithm
  hashOn?: string; // Hash input for hash algorithm
  slots?: number; // Consistent hash slots
  healthcheck?: object; // Health check config
  tags?: string[];
}
```

## Target Structure

```typescript
interface Target {
  id: string;
  upstreamId: string;
  target: string; // URL or IP:port
  weight?: number; // Weight for weighted algorithms
  tags?: string[];
}
```

## Creating Upstreams

## Load Balancing Algorithms

## Target Weight

Distribute requests proportionally:

```json
// Targets with weights
{ "target": "server-a", "weight": 3 }
{ "target": "server-b", "weight": 1 }
```

Distribution: A receives 75% of requests, B receives 25%.

## Managing Upstreams

### List Upstreams

```bash
curl http://localhost:8080/api/upstreams
```

### Get Upstream Details

```bash
curl http://localhost:8080/api/upstreams/upstream_abc123
```

### Update Algorithm

```bash
curl -X PATCH http://localhost:8080/api/upstreams/upstream_abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "algorithm": "least-connections"
  }'
```

### Delete Upstream

```bash
curl -X DELETE http://localhost:8080/api/upstreams/upstream_abc123
```

## Managing Targets

### List Targets for Upstream

```bash
curl http://localhost:8080/api/targets?upstreamId=upstream_abc123
```

### Update Target Weight

```bash
curl -X PATCH http://localhost:8080/api/targets/target_xyz789 \
  -H "Content-Type: application/json" \
  -d '{
    "weight": 5
  }'
```

### Remove Target

```bash
curl -X DELETE http://localhost:8080/api/targets/target_xyz789
```

## Target URLs

Targets can use various formats:

## Connecting Routes to Upstreams

Routes reference upstreams through service configuration:

1. Create route pointing to service
2. Service defines upstream connection
3. Upstream provides targets

## Next Steps

- [Load Balancing](/core-concepts/load-balancing/) - Algorithm details
- [Routes](/configuration/routes/) - Route to upstreams
- [Services](/configuration/services/) - Service configuration
