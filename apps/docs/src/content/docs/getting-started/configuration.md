---
title: Configuration
description: Configure MiniGateway for your environment
---

MiniGateway uses a SQLite database for configuration storage. You can manage settings through:

- **Admin API** - RESTful endpoints for all operations
- **Web Dashboard** - Visual interface at `/ui/`
- **CLI Commands** - Command-line administration

## Database Configuration

By default, MiniGateway stores its database at:

You can customize the database location:

```bash
node packages/cli/dist/index.mjs start --db /custom/path/database.db
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
# Default port
node packages/cli/dist/index.mjs start --port 8080

# Custom port
node packages/cli/dist/index.mjs start --port 3000
```

### Logging Levels

## CORS Configuration

MiniGateway enables CORS by default for development. Configure in production:

## Web UI Configuration

### Enable/Disable UI

```bash
# With UI (default)
node packages/cli/dist/index.mjs start

# Without UI (Admin API only)
node packages/cli/dist/index.mjs start --no-ui
```

### Custom UI Path

```bash
node packages/cli/dist/index.mjs start --ui-dist /path/to/custom/ui
```

## Next Steps

- [Services Configuration](/configuration/services/) - Configure API services
- [Routes Configuration](/configuration/routes/) - Set up routing rules
- [Upstreams & Targets](/configuration/upstreams/) - Configure backend servers
- [Plugins](/plugins/overview/) - Add functionality with plugins
