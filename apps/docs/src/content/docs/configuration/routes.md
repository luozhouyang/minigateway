---
title: Routes
description: Define routing rules for incoming requests
---

Routes define how incoming requests are matched and routed to backend services.

## Route Structure

```typescript
interface Route {
  id: string;
  name: string;
  serviceId?: string;
  protocols?: string[]; // ["http", "https"]
  methods?: string[]; // ["GET", "POST", ...]
  hosts?: string[]; // ["api.example.com"]
  paths?: string[]; // ["/api/v1/*"]
  headers?: Record<string, string | string[]>;
  stripPath?: boolean;
  preserveHost?: boolean;
  tags?: string[];
}
```

## Path Matching Patterns

## Creating Routes

## Path Handling Options

### Strip Path

Remove matched prefix before forwarding:

```json
{
  "paths": ["/api/v1/*"],
  "stripPath": true
}
```

Request: `/api/v1/users` → Backend receives: `/users`

### Preserve Host

Keep original host header when forwarding:

```json
{
  "preserveHost": true
}
```

Default: gateway replaces host with backend target host.

## Route Priority

Routes are matched by specificity:

1. **Exact paths** before wildcards
2. **More specific wildcards** before broader ones
3. **Regex priority** can override order

```json
{
  "regexPriority": 100 // Higher priority wins
}
```

## Managing Routes

### List Routes

```bash
curl http://localhost:8080/api/routes
```

### Get Routes by Service

```bash
curl http://localhost:8080/api/routes?serviceId=service_abc123
```

### Update Route

```bash
curl -X PATCH http://localhost:8080/api/routes/route_xyz789 \
  -H "Content-Type: application/json" \
  -d '{
    "methods": ["GET", "POST", "PUT", "DELETE"]
  }'
```

### Delete Route

```bash
curl -X DELETE http://localhost:8080/api/routes/route_xyz789
```

## Route-Level Plugins

Bind plugins to specific routes:

```bash
curl -X POST http://localhost:8080/api/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "routeId": "route_xyz789",
    "pluginName": "key-auth",
    "config": {
      "required": true
    }
  }'
```

## Host-Based Routing

Route based on domain:

```json
{
  "hosts": ["api.example.com", "internal.example.com"]
}
```

Different domains can route to different services.

## Protocol Restrictions

Limit to specific protocols:

```json
{
  "protocols": ["https"] // Only HTTPS requests
}
```

## Next Steps

- [Services](/configuration/services/) - Services contain routes
- [Upstreams](/configuration/upstreams/) - Backend server pools
- [Proxy Engine](/core-concepts/proxy-engine/) - Request processing
