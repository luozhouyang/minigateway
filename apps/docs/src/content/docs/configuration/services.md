---
title: Services
description: Configure API services in MiniGateway
---

Services are the top-level abstraction in MiniGateway. They group routes, upstreams, and plugins together.

## Service Structure

```typescript
interface Service {
  id: string;
  name: string;
  protocol?: string; // "http" | "https"
  host?: string;
  port?: number;
  path?: string;
  connectTimeout?: number; // milliseconds
  writeTimeout?: number; // milliseconds
  readTimeout?: number; // milliseconds
  retries?: number;
  tags?: string[];
}
```

## Creating Services

## Timeout Configuration

## Managing Services

### List All Services

```bash
curl http://localhost:8080/api/services
```

### Get a Specific Service

```bash
curl http://localhost:8080/api/services/service_abc123
```

### Update a Service

```bash
curl -X PATCH http://localhost:8080/api/services/service_abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "retries": 5,
    "tags": ["production"]
  }'
```

### Delete a Service

```bash
curl -X DELETE http://localhost:8080/api/services/service_abc123
```

## Service-Level Plugins

Bind plugins to apply them to all routes under a service:

```bash
curl -X POST http://localhost:8080/api/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "service_abc123",
    "pluginName": "rate-limit",
    "config": {
      "limit": 1000,
      "window": 60
    }
  }'
```

## Search Services

Filter services by name or tags:

```bash
# Search by name
curl "http://localhost:8080/api/services?name=api"

# Filter by protocol
curl "http://localhost:8080/api/services?protocol=https"
```

## Next Steps

- [Routes](/configuration/routes/) - Define routing rules for services
- [Plugins](/plugins/overview/) - Add functionality to services
- [Upstreams](/configuration/upstreams/) - Configure backend servers
