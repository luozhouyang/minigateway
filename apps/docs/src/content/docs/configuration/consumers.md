---
title: Consumers & Credentials
description: Manage API consumers and authentication credentials
---

Consumers represent API clients. Credentials provide authentication for consumers.

## Consumer Structure

```typescript
interface Consumer {
  id: string;
  username?: string; // Unique username
  customId?: string; // External identifier
  tags?: string[];
}
```

## Credential Structure

```typescript
interface Credential {
  id: string;
  consumerId: string;
  credentialType: string; // "api_key", "jwt", etc.
  credential: object; // Credential data
  tags?: string[];
}
```

## Creating Consumers

## Credential Types

## Managing Consumers

### List Consumers

```bash
curl http://localhost:8080/api/consumers
```

### Get Consumer by Username

```bash
curl http://localhost:8080/api/consumers?username=api-client
```

### Update Consumer

```bash
curl -X PATCH http://localhost:8080/api/consumers/consumer_abc123 \
  -H "Content-Type: application/json" \
  -d '{
    "tags": ["premium", "production"]
  }'
```

### Delete Consumer

```bash
curl -X DELETE http://localhost:8080/api/consumers/consumer_abc123
```

## Managing Credentials

### List Credentials

```bash
curl http://localhost:8080/api/credentials
```

### Get Credentials by Consumer

```bash
curl http://localhost:8080/api/credentials?consumerId=consumer_abc123
```

### Delete Credential

```bash
curl -X DELETE http://localhost:8080/api/credentials/credential_xyz789
```

## Using with key-auth Plugin

Bind `key-auth` plugin to a route or service:

```bash
curl -X POST http://localhost:8080/api/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "serviceId": "service_abc123",
    "pluginName": "key-auth",
    "config": {
      "required": true
    }
  }'
```

Requests must include the API key:

## Consumer in Plugin Context

After authentication, the consumer is available:

```typescript
// In plugin code
ctx.consumer.id; // Consumer ID
ctx.consumer.username; // Username
ctx.consumer.customId; // External ID
ctx.consumer.tags; // Tags
```

Use consumer identity for:

- Rate limiting per consumer
- Access control decisions
- Request logging with identity

## Consumer-Level Plugins

Bind plugins to specific consumers:

```bash
curl -X POST http://localhost:8080/api/plugins \
  -H "Content-Type: application/json" \
  -d '{
    "consumerId": "consumer_abc123",
    "pluginName": "rate-limit",
    "config": {
      "limit": 500
    }
  }'
```

## Best Practices

## Next Steps

- [key-auth Plugin](/plugins/builtins/key-auth/) - API key authentication
- [rate-limit Plugin](/plugins/builtins/rate-limit/) - Per-consumer rate limiting
- [Plugins](/plugins/overview/) - Plugin configuration
