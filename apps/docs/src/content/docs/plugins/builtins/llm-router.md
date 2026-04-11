---
title: llm-router
description: LLM-specific routing with model mapping and retries
---

The `llm-router` plugin handles LLM API requests with provider resolution, model mapping, retries, and circuit breaker.

## Overview

- **Phase**: Access
- **Purpose**: Route LLM requests to configured providers
- **Behavior**: Normalizes requests, resolves models, handles retries

## Configuration

```json
{
  "pluginName": "llm-router",
  "config": {
    "clientProfile": "auto",
    "requestTimeoutMs": 60000,
    "maxRetries": 2,
    "retryOnStatus": [429, 500, 502, 503],
    "circuitBreaker": {
      "failureThreshold": 5,
      "successThreshold": 3,
      "openTimeoutMs": 30000,
      "minimumRequests": 10,
      "errorRateThreshold": 0.5
    },
    "logging": {
      "enabled": true,
      "storeBodies": false
    }
  }
}
```

| Option             | Type     | Default             | Description                       |
| ------------------ | -------- | ------------------- | --------------------------------- |
| `clientProfile`    | string   | `auto`              | Client type: auto, openai, claude |
| `requestTimeoutMs` | number   | `60000`             | Request timeout (ms)              |
| `maxRetries`       | number   | `0`                 | Additional retry attempts         |
| `retryOnStatus`    | number[] | `[429,500,502,503]` | Status codes to retry             |
| `circuitBreaker`   | object   | See below           | Circuit breaker settings          |
| `logging`          | object   | See below           | Request logging settings          |

## Client Profiles

## Circuit Breaker

Prevent cascading failures by temporarily blocking failing providers:

```json
{
  "circuitBreaker": {
    "failureThreshold": 5, // Failures to open circuit
    "successThreshold": 3, // Successes to close circuit
    "openTimeoutMs": 30000, // Time before retry (half-open)
    "minimumRequests": 10, // Min requests before error rate
    "errorRateThreshold": 0.5 // Error rate to open circuit
  }
}
```

## Retry Configuration

Retry on specific status codes:

```json
{
  "maxRetries": 2,
  "retryOnStatus": [429, 500, 502, 503]
}
```

## Request Logging

Track all LLM requests:

```json
{
  "logging": {
    "enabled": true,
    "storeBodies": false
  }
}
```

| Option        | Description                       |
| ------------- | --------------------------------- |
| `enabled`     | Persist attempt logs to database  |
| `storeBodies` | Store request and response bodies |

## Model Reference Format

Requests use provider/model format:

```
provider-name/model-name
```

Examples:

- `openai/gpt-4` → OpenAI provider, gpt-4 model
- `anthropic/claude-3-opus` → Anthropic provider, claude-3-opus model

## Setup Example

## Provider Authentication

Configure provider auth in LLM Provider entity:

## Request Timeout

Set timeout for upstream LLM requests:

```json
{
  "requestTimeoutMs": 120000 // 2 minutes
}
```

LLM requests can be slow. Set appropriate timeout.

## Error Responses

### Provider Not Found (400)

```json
{
  "error": "Bad Request",
  "message": "Unknown LLM provider \"unknown-provider\""
}
```

### Model Not Found (400)

```json
{
  "error": "Bad Request",
  "message": "Unknown LLM model \"unknown-model\" for provider \"openai\""
}
```

### Provider Disabled (503)

```json
{
  "error": "Provider Unavailable",
  "message": "LLM provider \"openai\" is disabled"
}
```

### Circuit Open (503)

```json
{
  "error": "Provider Unavailable",
  "message": "LLM provider \"openai\" circuit is open"
}
```

## See Also

- [LLM Gateway Overview](/llm-gateway/overview/) - LLM features
- [key-auth](/plugins/builtins/key-auth/) - Protect LLM endpoints
- [rate-limit](/plugins/builtins/rate-limit/) - Limit LLM usage
