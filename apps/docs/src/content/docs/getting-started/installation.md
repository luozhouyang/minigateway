---
title: Installation
description: Install and set up MiniGateway in your environment
---

## Prerequisites

Before installing MiniGateway, ensure you have the following:

- **Node.js** 24.x or later
- **pnpm** 10.x or later (recommended package manager)

## Installation Options

## Directory Structure

After cloning, you'll see the following structure:

```
minigateway/
├── apps/
│   ├── web/          # Web dashboard application
│   ├── docs/         # Documentation site
│   └── website/      # Landing page
├── packages/
│   ├── core/         # Core gateway engine
│   ├── cli/          # CLI tools
│   └── utils/        # Shared utilities
├── tools/            # Development tools
├── pnpm-workspace.yaml
└── package.json
```

## Verify Installation

Run the following command to verify everything is working:

```bash
vp check
vp test run
```

All checks and tests should pass.

## Next Steps

- [Quick Start](/getting-started/quick-start/) - Start using MiniGateway immediately
- [Configuration](/getting-started/configuration/) - Learn about configuration options
- [Architecture](/core-concepts/architecture/) - Understand how MiniGateway works
