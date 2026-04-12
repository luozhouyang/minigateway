---
title: Quick Start
description: Get up and running with MiniGateway in minutes
---

This guide will help you start MiniGateway and make your first API proxy request.

## Starting the Server

```bash
# Install MiniGateway
npm install -g @minigateway/cli

# Start the server
minigateway start

# Or with custom options
minigateway start --port 8080 --log-level debug
```

The server will start and display:

```
╔════════════════════════════════════════════════════════════╗
║                   MiniGateway                              ║
╠════════════════════════════════════════════════════════════╣
║  Server: http://localhost:8080                             ║
║                                                            ║
║  Endpoints:                                                ║
║    - Web UI:       http://localhost:8080/ui                ║
║    - Admin API:    http://localhost:8080/admin             ║
║    - Proxy:        http://localhost:8080/ (via routes)     ║
╚════════════════════════════════════════════════════════════╝
```

## Initialize Configuration

Create a configuration template:

```bash
# Create default config file
minigateway init

# View the generated config
cat ~/Library/Application\ Support/minigateway/config.yaml  # macOS
cat ~/.config/minigateway/config.yaml                        # Linux
```

## Create Your First Service

Use the Admin API or CLI to create a service:

```bash
# Via CLI
minigateway admin services create --name "my-api" --url "https://httpbin.org"

# Via Admin API
curl -X POST http://localhost:8080/admin/services \
  -H "Content-Type: application/json" \
  -d '{"name": "my-api", "url": "https://httpbin.org"}'
```

## Create a Route

```bash
# Via CLI
minigateway admin routes create \
  --service-id "<service-id>" \
  --path "/api/*" \
  --methods "GET,POST"

# Via Admin API
curl -X POST http://localhost:8080/admin/routes \
  -H "Content-Type: application/json" \
  -d '{"service_id": "<service-id>", "path": "/api/*", "methods": ["GET", "POST"]}'
```

## Test the Proxy

```bash
# Request through the proxy
curl http://localhost:8080/api/get
```

## Common CLI Options

| Option        | Description                              | Default           |
| ------------- | ---------------------------------------- | ----------------- |
| `--port`      | Server port                              | 8080              |
| `--db`        | Database file path                       | Platform-specific |
| `--log-level` | Log verbosity (debug, info, warn, error) | info              |
| `--no-ui`     | Disable Web UI                           | false             |
| `--ui-dist`   | Custom UI dist path                      | auto-detected     |

## Environment Variables

| Variable                | Description       |
| ----------------------- | ----------------- |
| `MINIGATEWAY_LOG_LEVEL` | Default log level |
| `MINIGATEWAY_UI_DIST`   | Web UI dist path  |

## Next Steps

- [Configuration Guide](/getting-started/configuration/) - Detailed configuration options
- [Core Concepts](/core-concepts/architecture/) - Understand the architecture
- [Plugins](/plugins/overview/) - Add authentication and rate limiting
