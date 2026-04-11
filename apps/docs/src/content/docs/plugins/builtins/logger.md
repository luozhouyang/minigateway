---
title: logger
description: Request and response logging to console
---

The `logger` plugin writes request and response activity to the process log (console).

## Overview

- **Phase**: Access, Log
- **Purpose**: Log request/response information to console
- **Behavior**: Outputs structured or text logs

## Configuration

```json
{
  "pluginName": "logger",
  "config": {
    "level": "info",
    "format": "json"
  }
}
```

| Option   | Type   | Default | Description                         |
| -------- | ------ | ------- | ----------------------------------- |
| `level`  | string | `info`  | Log level: debug, info, warn, error |
| `format` | string | `json`  | Output format: json, text           |

## Log Levels

## Output Formats

## Usage Example

## Log Fields

### Request Phase (debug level)

| Field        | Description             |
| ------------ | ----------------------- |
| `type`       | "request"               |
| `request_id` | Unique request ID       |
| `method`     | HTTP method             |
| `url`        | Request URL             |
| `headers`    | All request headers     |
| `route_id`   | Matched route ID        |
| `service_id` | Matched service ID      |
| `target`     | Selected backend target |
| `timestamp`  | Log timestamp           |

### Response Phase

| Field          | Description           |
| -------------- | --------------------- |
| `type`         | "response"            |
| `request_id`   | Unique request ID     |
| `method`       | HTTP method           |
| `url`          | Request URL           |
| `upstream_url` | Backend URL           |
| `status`       | Response status code  |
| `duration_ms`  | Request duration (ms) |
| `timestamp`    | Log timestamp         |

## Integrating with Log Systems

JSON format integrates well with:

- Log aggregators (ELK, Loki)
- Cloud logging services
- Monitoring dashboards

## See Also

- [file-log](/plugins/builtins/file-log/) - Persistent file-based logging
- [rate-limit](/plugins/builtins/rate-limit/) - Rate limiting logs
