---
title: Plugin Overview
description: Extend MiniGateway functionality with plugins
---

The plugin system is MiniGateway's extensibility mechanism. Plugins can modify requests, responses, and implement custom logic.

## Plugin Lifecycle

Plugins execute in two phases:

### Request Phase

Runs before the request is proxied to the target:

```typescript
interface RequestPlugin {
  name: string;
  onRequest?: (ctx: PluginContext) => Promise<void | Response>;
}
```

Use cases:

- Authentication and authorization
- Rate limiting
- Request validation
- Header/body transformation
- Request logging

### Response Phase

Runs after receiving the backend response:

```typescript
interface ResponsePlugin {
  name: string;
  onResponse?: (ctx: ResponseContext) => Promise<void>;
}
```

Use cases:

- Response transformation
- Caching
- Logging
- Error handling

## Plugin Context

Both phases receive rich context:

```typescript
interface PluginContext {
  // Original request
  request: Request;

  // Matching entities
  route: Route;
  service: Service;
  upstream: Upstream;
  target?: Target;
  consumer?: Consumer;

  // Path parameters
  params: Record<string, string>;

  // Shared state (persist across phases)
  state: Record<string, unknown>;

  // Storage access
  storage: StorageContext;
}
```

## Built-in Plugins
