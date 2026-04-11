---
title: file-log
description: Persistent file-based request logging
---

The `file-log` plugin writes request logs to files for persistent storage.

## Overview

- **Phase**: Log
- **Purpose**: Write request logs to files
- **Behavior**: Creates append-only log files

## Configuration

```json
{
  "pluginName": "file-log",
  "config": {
    "path": "/var/log/minigateway/access.log",
    "format": "json",
    "rotate": true,
    "maxSize": "100MB",
    "maxFiles": 10
  }
}
```

| Option     | Type    | Default  | Description                     |
| ---------- | ------- | -------- | ------------------------------- |
| `path`     | string  | Required | Log file path                   |
| `format`   | string  | `json`   | Output format: json, text       |
| `rotate`   | boolean | `false`  | Enable file rotation            |
| `maxSize`  | string  | `10MB`   | Max file size before rotation   |
| `maxFiles` | number  | `5`      | Number of rotated files to keep |

## File Rotation

When `rotate` is enabled:

1. Log file grows until `maxSize`
2. File is renamed: `access.log` → `access.log.1`
3. New file created at original path
4. Old files beyond `maxFiles` are deleted

## Usage Example

## Log Format

## Path Configuration

## Integration with Log Analysis

File logs can be processed by:

- **Logrotate**: System-level rotation
- **Logstash**: ELK stack ingestion
- **Grafana Loki**: Promtail ingestion
- **Fluentd**: Log forwarding

## Permissions

Ensure the gateway process has write permissions:

```bash
mkdir -p /var/log/minigateway
chmod 755 /var/log/minigateway
```

## See Also

- [logger](/plugins/builtins/logger/) - Console logging
- [rate-limit](/plugins/builtins/rate-limit/) - Rate limiting
