---
title: cors
description: Cross-origin resource sharing configuration plugin
---

The `cors` plugin controls cross-origin requests and handles preflight responses.

## Overview

- **Phase**: Access, Response
- **Purpose**: Configure CORS headers for cross-origin requests
- **Behavior**: Handles preflight requests and adds CORS headers

## Configuration

```json
{
  "pluginName": "cors",
  "config": {
    "origins": ["https://example.com", "https://app.example.com"],
    "methods": ["GET", "POST", "PUT", "DELETE"],
    "headers": ["Content-Type", "Authorization"],
    "exposed_headers": ["X-Custom-Header"],
    "credentials": true,
    "max_age": 3600
  }
}
```

| Option               | Type     | Default                | Description                        |
| -------------------- | -------- | ---------------------- | ---------------------------------- |
| `origins`            | string[] | `["*"]`                | Allowed origins                    |
| `methods`            | string[] | Default HTTP verbs     | Allowed methods                    |
| `headers`            | string[] | Mirror request headers | Allowed request headers            |
| `exposed_headers`    | string[] | `[]`                   | Headers exposed to client          |
| `credentials`        | boolean  | `false`                | Allow cookies/credentials          |
| `max_age`            | number   | `0`                    | Preflight cache duration (seconds) |
| `private_network`    | boolean  | `false`                | Allow private network access       |
| `preflight_continue` | boolean  | `false`                | Forward OPTIONS upstream           |

## Origin Configuration

## Preflight Handling

OPTIONS requests are handled automatically:

1. Check origin against allowed list
2. Verify requested method is allowed
3. Return 204 with CORS headers

## Usage Example

## Error Responses

### Origin Not Allowed (403)

When origin is not in the allowed list, preflight returns 403.

### Method Not Allowed

When requested method is not in the allowed methods list.

## Private Network Access

Allow requests from public network to private network:

```json
{
  "private_network": true
}
```

Handles `Access-Control-Request-Private-Network` header.

## Forward Preflight Upstream

To forward OPTIONS to backend instead of handling locally:

```json
{
  "preflight_continue": true
}
```

Use when backend needs to handle CORS itself.

## Best Practices

## See Also

- [key-auth](/plugins/builtins/key-auth/) - Combine with authentication
- [rate-limit](/plugins/builtins/rate-limit/) - Limit cross-origin requests
