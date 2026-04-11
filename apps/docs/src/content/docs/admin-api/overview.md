---
title: Admin API Overview
description: RESTful API for managing MiniGateway
---

The Admin API provides complete RESTful endpoints for managing all MiniGateway entities.

## Base URL

The Admin API is available at:

```
http://localhost:8080/api/
```

## Response Format

All endpoints return consistent JSON responses:

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "timestamp": "2026-04-11T00:00:00Z"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [ ... ]
  }
}
```

## Authentication

## Common Patterns

### Pagination

List endpoints support pagination:

```bash
GET /api/services?page=1&limit=20
```

Response:

```json
{
  "success": true,
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "totalPages": 5
    }
  }
}
```

### Filtering

Filter by related entities:

```bash
GET /api/routes?serviceId=service_abc
GET /api/targets?upstreamId=upstream_xyz
```

### Ordering

Sort results:

```bash
GET /api/services?orderBy=createdAt&orderDirection=desc
```

## Available Endpoints

| Resource      | Endpoints                                            |
| ------------- | ---------------------------------------------------- |
| Services      | `GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| Routes        | `GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| Upstreams     | `GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| Targets       | `GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| Consumers     | `GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| Credentials   | `GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| Plugins       | `GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| LLM Providers | `GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| LLM Models    | `GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` |

## Content Type

All `POST` and `PUT` requests require:

```
Content-Type: application/json
```

## Error Codes

| Code               | Description                      |
| ------------------ | -------------------------------- |
| `VALIDATION_ERROR` | Invalid request data             |
| `NOT_FOUND`        | Entity not found                 |
| `DUPLICATE`        | Entity already exists            |
| `RELATION_ERROR`   | Invalid related entity reference |
| `INTERNAL_ERROR`   | Server error                     |

## Next Steps

- [Services API](/admin-api/services/) - Manage services
- [Routes API](/admin-api/routes/) - Configure routing
- [LLM Providers API](/admin-api/llm-providers/) - LLM provider management
