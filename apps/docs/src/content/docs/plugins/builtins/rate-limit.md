---
title: rate-limit
description: Request rate limiting plugin
---

The `rate-limit` plugin throttles requests based on configurable limits per consumer, route, or global scope.

## Overview

- **Phase**: Request
- **Purpose**: Prevent abuse and ensure fair resource distribution
- **Behavior**: Returns 429 when limit exceeded

## Configuration

```json
{
  "pluginName": "rate-limit",
  "config": {
    "limit": 100,
    "window": 60,
    "scope": "consumer",
    "keyBy": "consumer.id"
  }
}
```

| Option   | Type   | Default       | Description                          |
| -------- | ------ | ------------- | ------------------------------------ |
| `limit`  | number | 100           | Maximum requests allowed             |
| `window` | number | 60            | Time window in seconds               |
| `scope`  | string | `consumer`    | Limit scope: consumer, route, global |
| `keyBy`  | string | `consumer.id` | Custom key for rate tracking         |

## Scopes

## Usage Example

### Bind to Service

```bash
curl -X POST http://localhost:8080/api/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "service_xyz",
    "pluginName": "rate-limit",
    "config": {
      "limit": 1000,
      "window": 3600,
      "scope": "consumer"
    }
  }'
```

This allows each consumer 1000 requests per hour.

### Bind to Route

```bash
curl -X POST http://localhost:8080/api/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "routeId": "route_abc",
    "pluginName": "rate-limit",
    "config": {
      "limit": 10,
      "window": 60,
      "scope": "consumer"
    }
  }'
```

Stricter limit for specific routes (e.g., expensive operations).

## Error Response

When limit exceeded (429):

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Rate limit exceeded",
    "details": {
      "limit": 100,
      "window": 60,
      "retryAfter": 45
    }
  }
}
```

The `retryAfter` field indicates seconds until the limit resets.

## Response Headers

The plugin adds informational headers:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 75
X-RateLimit-Reset: 1681234567
```

## Best Practices

## See Also

- [key-auth](/plugins/builtins/key-auth/) - Authentication for consumer identification
- [Custom Plugins](/plugins/custom/) - Advanced rate limiting with external storage
