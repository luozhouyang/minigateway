---
title: Installation
description: Install and set up MiniGateway in your environment
---

## Prerequisites

Before installing MiniGateway, ensure you have the following:

- **Node.js** 24.x or later

## Installation

### From npm

```bash
# Install globally
npm install -g @minigateway/cli

# Or use npx without installing
npx @minigateway/cli start
```

After installation, verify:

```bash
minigateway --version
minigateway --help
```

### From Source

```bash
git clone https://github.com/luozhouyang/minigateway.git
cd minigateway
pnpm install
pnpm build

# Run locally
node packages/cli/dist/index.mjs start
```

## Directory Structure

When building from source:

```
minigateway/
├── apps/
│   ├── web/          # Web dashboard application
│   ├── docs/         # Documentation site
│   └── website/      # Landing page
├── packages/
│   ├── core/         # Core gateway engine
│   └── cli/          # CLI tools
├── tools/            # Development tools
├── pnpm-workspace.yaml
└── package.json
```

## Verify Installation

```bash
# Verify CLI works
minigateway --help

# Start server
minigateway start --port 8080
```

## Next Steps

- [Quick Start](/getting-started/quick-start/) - Start using MiniGateway immediately
- [Configuration](/getting-started/configuration/) - Learn about configuration options
- [Architecture](/core-concepts/architecture/) - Understand how MiniGateway works
