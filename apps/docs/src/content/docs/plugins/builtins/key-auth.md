---
title: key-auth
description: API key authentication plugin
---

The `key-auth` plugin validates API keys from incoming requests and associates them with registered consumers.

## Overview

- **Phase**: Request
- **Purpose**: Authentication via API key
- **Behavior**: Rejects requests without valid API key

## Configuration

```json
{
  "pluginName": "key-auth",
  "config": {
    "headerName": "X-API-Key",
    "queryParam": "api_key",
    "required": true
  }
}
```

| Option       | Type    | Default     | Description                   |
| ------------ | ------- | ----------- | ----------------------------- |
| `headerName` | string  | `X-API-Key` | Header containing the API key |
| `queryParam` | string  | `api_key`   | Query parameter alternative   |
| `required`   | boolean | `true`      | Reject if key not found       |

## Key Lookup Order

The plugin checks for the API key in this order:

1. **Header**: `X-API-Key` (or custom header name)
2. **Query parameter**: `api_key` (or custom param name)

## Usage Example

## Error Responses

### Missing Key (401)

```json
{
  "success": false,
  "error": {
    "code": "AUTH_MISSING_KEY",
    "message": "API key is required"
  }
}
```

### Invalid Key (401)

```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_KEY",
    "message": "Invalid API key"
  }
}
```

## Consumer Association

When authentication succeeds, the consumer is available in plugin context:

```typescript
// In subsequent plugins
ctx.consumer; // The authenticated consumer
ctx.consumer.id;
ctx.consumer.username;
ctx.consumer.customId;
```

## Best Practices

## See Also

- [Consumers & Credentials](/configuration/consumers/) - Managing API consumers
- [rate-limit](/plugins/builtins/rate-limit/) - Combine with rate limiting
