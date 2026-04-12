---
title: CLI Overview
description: MiniGateway command-line interface
---

MiniGateway provides a command-line interface for server management and administration.

## Installation

```bash
# From npm
npm install -g @minigateway/cli
minigateway [command]

# Or use npx
npx @minigateway/cli [command]
```

## Available Commands

| Command      | Description                   |
| ------------ | ----------------------------- |
| `start`      | Start the unified server      |
| `init`       | Initialize configuration file |
| `status`     | Check server status           |
| `admin`      | Entity management commands    |
| `llm-router` | LLM-specific commands         |

## Global Options

| Option          | Description  |
| --------------- | ------------ |
| `-h, --help`    | Show help    |
| `-V, --version` | Show version |

## init Command

Initialize a new configuration file:

```bash
minigateway init [path] [options]
```

### Arguments

| Argument | Default                            | Description      |
| -------- | ---------------------------------- | ---------------- |
| `[path]` | Platform-specific config directory | Config file path |

### Options

| Option        | Description                    |
| ------------- | ------------------------------ |
| `-f, --force` | Overwrite existing config file |

### Examples

```bash
# Create default config
minigateway init

# Create config in current directory
minigateway init ./minigateway.yaml

# Force overwrite
minigateway init --force
```

## start Command

Start the MiniGateway server:

```bash
minigateway start [options]
```

### Options

| Option                | Default                                                                  | Description           |
| --------------------- | ------------------------------------------------------------------------ | --------------------- |
| `-p, --port <port>`   | 8080                                                                     | Server port           |
| `--db <path>`         | Platform-specific (see [Configuration](/getting-started/configuration/)) | Database path         |
| `--ui-dist <path>`    | auto                                                                     | Web UI dist directory |
| `--log-level <level>` | info                                                                     | Log verbosity         |
| `--no-ui`             | false                                                                    | Disable Web UI        |

### Examples

```bash
# Start with default settings
minigateway start

# Start on custom port
minigateway start --port 3000

# Start without Web UI
minigateway start --no-ui

# Start with custom database
minigateway start --db /data/minigateway.db
```

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
