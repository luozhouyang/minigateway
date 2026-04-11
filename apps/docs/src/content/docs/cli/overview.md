---
title: CLI Overview
description: MiniGateway command-line interface
---

MiniGateway provides a command-line interface for server management and administration.

## Installation

```bash
# From source
node packages/cli/dist/index.mjs [command]

# From npm (when published)
npx minigateway [command]
```

## Available Commands

| Command      | Description                |
| ------------ | -------------------------- |
| `start`      | Start the unified server   |
| `status`     | Check server status        |
| `admin`      | Entity management commands |
| `llm-router` | LLM-specific commands      |

## Global Options

| Option          | Description  |
| --------------- | ------------ |
| `-h, --help`    | Show help    |
| `-V, --version` | Show version |

## start Command

Start the MiniGateway server:

```bash
minigateway start [options]
```

### Options

| Option                | Default                         | Description           |
| --------------------- | ------------------------------- | --------------------- |
| `-p, --port <port>`   | 8080                            | Server port           |
| `--db <path>`         | `~/.minigateway/minigateway.db` | Database path         |
| `--ui-dist <path>`    | auto                            | Web UI dist directory |
| `--log-level <level>` | info                            | Log verbosity         |
| `--no-ui`             | false                           | Disable Web UI        |

### Examples

## admin Command

Manage entities via CLI:

```bash
minigateway admin <entity> <action> [options]
```

### Subcommands

| Entity          | Actions                      |
| --------------- | ---------------------------- |
| `services`      | list, create, update, delete |
| `routes`        | list, create, update, delete |
| `upstreams`     | list, create, update, delete |
| `targets`       | list, create, update, delete |
| `consumers`     | list, create, update, delete |
| `credentials`   | list, create, update, delete |
| `plugins`       | list, create, update, delete |
| `llm-models`    | list, create, update, delete |
| `llm-providers` | list, create, update, delete |

### Example

```bash
# List services
minigateway admin services list

# Create service
minigateway admin services create --name "my-api"

# Create route
minigateway admin routes create \
  --service-id "service_abc" \
  --path "/api/v1/*" \
  --methods "GET,POST"
```

## Environment Variables

| Variable                | Description        |
| ----------------------- | ------------------ |
| `MINIGATEWAY_LOG_LEVEL` | Default log level  |
| `MINIGATEWAY_UI_DIST`   | Web UI dist path   |
| `MINIGATEWAY_DB_PATH`   | Database file path |

## Next Steps

- [Admin API](/admin-api/overview/) - RESTful alternative to CLI
- [Configuration](/getting-started/configuration/) - Server options
