---
title: Configuration
description: Configure MiniGateway for your environment
---

MiniGateway stores configuration in a SQLite database. You can manage settings through:

- **Admin API** - RESTful endpoints at `/admin/`
- **Web Dashboard** - Visual interface at `/ui/`
- **CLI Commands** - `minigateway admin` command-line administration

## Configuration Paths

MiniGateway uses platform-specific directories for storing configuration and data files:

| Platform | Config Directory                                                             |
| -------- | ---------------------------------------------------------------------------- |
| macOS    | `~/Library/Application Support/minigateway/`                                 |
| Linux    | `~/.config/minigateway/`                                                     |
| Windows  | `%APPDATA%/minigateway/` (e.g., `C:\Users\...\AppData\Roaming\minigateway\`) |

### Key Files

| File              | Description                                       |
| ----------------- | ------------------------------------------------- |
| `minigateway.db`  | SQLite database (services, routes, plugins, etc.) |
| `cli-config.json` | CLI configuration (API URL, auth token)           |

### Initialize Configuration

Create a YAML configuration template:

```bash
# Default path (platform-specific config directory)
minigateway init

# Custom path
minigateway init ./my-config.yaml

# Force overwrite existing file
minigateway init --force
```

## Database Configuration

By default, MiniGateway stores its database in the platform-specific config directory.

Customize the database location:

```bash
minigateway start --db /custom/path/database.db
```

## Configuration Entities

MiniGateway manages several interconnected entities:

| Entity             | Description                                |
| ------------------ | ------------------------------------------ |
| **Service**        | Top-level API service grouping             |
| **Route**          | Path matching rules for incoming requests  |
| **Upstream**       | Backend server pool with load balancing    |
| **Target**         | Individual backend server in an upstream   |
| **Consumer**       | API consumer/client identity               |
| **Credential**     | Authentication credentials for consumers   |
| **Plugin Binding** | Plugin configurations attached to entities |
| **LLM Provider**   | LLM API provider configuration             |
| **LLM Model**      | Model mapping and routing rules            |

## Entity Relationships

The entities form a hierarchical structure:

```
Service
├── Route (matches incoming requests)
│   ├── Upstream (load balancing pool)
│   │   └── Target (backend servers)
│   └── Plugin Bindings (route-level plugins)
├── Consumer (API client)
│   └── Credential (authentication)
└── Plugin Bindings (service-level plugins)
```

## Server Options

### Port Configuration

```bash
# Default port (8080)
minigateway start

# Custom port
minigateway start --port 3000
```

### Logging Levels

## CORS Configuration

MiniGateway enables CORS by default for development. Configure in production:

## Web UI Configuration

### Enable/Disable UI

```bash
# With UI (default)
minigateway start

# Without UI (Admin API only)
minigateway start --no-ui
```

### Custom UI Path

```bash
minigateway start --ui-dist /path/to/custom/ui
```

## Next Steps

- [Services Configuration](/configuration/services/) - Configure API services
- [Routes Configuration](/configuration/routes/) - Set up routing rules
- [Upstreams & Targets](/configuration/upstreams/) - Configure backend servers
- [Plugins](/plugins/overview/) - Add functionality with plugins
