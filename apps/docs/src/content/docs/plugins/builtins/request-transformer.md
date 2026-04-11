---
title: request-transformer
description: Modify request headers, query, and body
---

The `request-transformer` plugin modifies requests before they reach the backend.

## Overview

- **Phase**: Access
- **Purpose**: Transform request headers, query, body, and path
- **Behavior**: Applies transformations before proxying

## Configuration

```json
{
  "pluginName": "request-transformer",
  "config": {
    "add": {
      "headers": ["X-Gateway: true"],
      "query": ["source=gateway"]
    },
    "set": {
      "headers": ["X-Forwarded-Proto: https"]
    },
    "remove": {
      "headers": ["X-Internal-*"]
    },
    "rename": {
      "headers": ["X-Old: X-New"]
    },
    "replace": {
      "path": "/api/v1/: /v2/"
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
| `${timestamp}`   | Current timestamp     |
| `${consumer.id}` | Consumer ID (if auth) |
| `${route.id}`    | Matched route ID      |
| `${service.id}`  | Matched service ID    |

Example:

```json
{
  "add": {
    "headers": ["X-Consumer-ID: ${consumer.id}"]
  }
}
```

## Body Transformation

Transform JSON request body fields:

```json
{
  "add": {
    "body": ["source: gateway"]
  },
  "remove": {
    "body": ["internal_field"]
  },
  "rename": {
    "body": ["oldName: newName"]
  }
}
```

## Query Transformation

Add or modify query parameters:

```json
{
  "add": {
    "query": ["api_version=2"]
  },
  "remove": {
    "query": ["debug"]
  }
}
```

## Wildcard Patterns

Use `*` for pattern matching:

```json
{
  "remove": {
    "headers": ["X-Internal-*", "X-Debug-*"]
  }
}
```

Removes all headers matching the pattern.

## Regex Replacement

Use regex for complex replacements:

```json
{
  "replace": {
    "headers": ["User-Agent: (.*): Gateway/$1"]
  }
}
```

## Best Practices

## See Also

- [response-transformer](/plugins/builtins/response-transformer/) - Transform responses
- [key-auth](/plugins/builtins/key-auth/) - Authentication headers
