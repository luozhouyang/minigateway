---
title: response-transformer
description: Modify response headers and body
---

The `response-transformer` plugin modifies responses before they reach the client.

## Overview

- **Phase**: Response
- **Purpose**: Transform response headers and body
- **Behavior**: Applies transformations before returning to client

## Configuration

```json
{
  "pluginName": "response-transformer",
  "config": {
    "add": {
      "headers": ["X-Gateway-Version: 1.0"]
    },
    "set": {
      "headers": ["X-Response-Time: ${duration_ms}"]
    },
    "remove": {
      "headers": ["X-Internal-*"]
    },
    "rename": {
      "headers": ["X-Backend: X-Source"]
    }
  }
}
```

## Transformation Types

## Usage Example

## Template Variables

Use variables in transformations:

| Variable         | Description           |
| ---------------- | --------------------- |
| `${request_id}`  | Unique request ID     |
| `${duration_ms}` | Request duration (ms) |
| `${status}`      | Response status code  |
| `${consumer.id}` | Consumer ID (if auth) |
| `${route.id}`    | Matched route ID      |
| `${service.id}`  | Matched service ID    |

Example:

```json
{
  "set": {
    "headers": ["X-Response-Time: ${duration_ms}ms"]
  }
}
```

## Body Transformation

Transform JSON response body fields:

```json
{
  "add": {
    "body": ["gateway_processed: true"]
  },
  "remove": {
    "body": ["internal_metadata", "debug_info"]
  },
  "rename": {
    "body": ["backend_id: gateway_id"]
  }
}
```

## Combining with request-transformer

Use both plugins for full request/response transformation:

```bash
# Request transformation
curl -X POST http://localhost:8080/api/plugins \
  -d '{"serviceId":"service_abc","pluginName":"request-transformer","config":{"add":{"headers":["X-Source: gateway"]}}}'

# Response transformation
curl -X POST http://localhost:8080/api/plugins \
  -d '{"serviceId":"service_abc","pluginName":"response-transformer","config":{"add":{"headers":["X-Via: gateway"]}}}'
```

## Wildcard Patterns

Use `*` for pattern matching:

```json
{
  "remove": {
    "headers": ["X-Backend-*", "X-Debug-*"]
  }
}
```

Removes all headers matching the pattern.

## Regex Replacement

Use regex for complex replacements:

```json
{
  "replace": {
    "headers": ["Server: Apache: MiniGateway"]
  }
}
```

## Best Practices

## See Also

- [request-transformer](/plugins/builtins/request-transformer/) - Transform requests
- [cors](/plugins/builtins/cors/) - CORS headers
- [logger](/plugins/builtins/logger/) - Response logging
