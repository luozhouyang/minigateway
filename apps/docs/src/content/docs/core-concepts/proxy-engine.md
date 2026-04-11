---
title: Proxy Engine
description: How MiniGateway handles and routes incoming requests
---

The Proxy Engine is the core component that handles incoming API requests and routes them to configured backend targets.

## Request Processing Pipeline

When a request arrives, it goes through several stages:

### 1. Route Matching

The engine matches the incoming request against configured routes:

```typescript
// Route matching logic
const route = routeMatcher.match(request.path, request.method);
```

Matching considers:

- **Path patterns** - Exact, wildcard, or parameterized paths
- **HTTP methods** - GET, POST, PUT, DELETE, etc.
- **Service context** - Routes belong to services

### 2. Plugin Execution (Request Phase)

Before proxying, request-phase plugins execute:

```typescript
// Request phase plugins
for (const plugin of requestPlugins) {
  await plugin.onRequest(requestContext);
}
```

Common request plugins:

- `key-auth` - API key validation
- `rate-limit` - Request throttling
- `request-transformer` - Header/body modification

### 3. Load Balancing

An upstream target is selected:

```typescript
const target = loadBalancer.select(upstream);
```

See [Load Balancing](/core-concepts/load-balancing/) for algorithm details.

### 4. Proxy Request

The request is forwarded to the selected target:

```typescript
const response = await fetch(target.url, {
  method: request.method,
  headers: proxyHeaders,
  body: request.body,
});
```

### 5. Plugin Execution (Response Phase)

After receiving the response:

```typescript
// Response phase plugins
for (const plugin of responsePlugins) {
  await plugin.onResponse(responseContext);
}
```

Common response plugins:

- `response-transformer` - Modify response body/headers
- `logger` - Log request/response details

### 6. Client Response

The processed response is returned to the client.

## Route Matching Patterns

## Request Context

Plugins receive a rich context object:

```typescript
interface PluginContext {
  request: Request;
  route: Route;
  service: Service;
  upstream: Upstream;
  target?: Target;
  consumer?: Consumer;
  params: Record<string, string>;
  state: Record<string, unknown>;
}
```

The `state` object allows plugins to share data through the pipeline.

## Error Handling

## Performance Considerations

The Proxy Engine is optimized for:

- **Minimal latency** - Hono's lightweight routing
- **Efficient matching** - Compiled route patterns
- **Connection reuse** - HTTP client pooling
- **Streaming** - Pass-through for large payloads

## Next Steps

- [Load Balancing](/core-concepts/load-balancing/) - Target selection algorithms
- [Plugins](/plugins/overview/) - Customizing request/response handling
- [Routes Configuration](/configuration/routes/) - Setting up routes
