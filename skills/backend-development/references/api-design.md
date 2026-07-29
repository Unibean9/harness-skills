# RESTful API Design Basics

Core REST ideas, as a quick-reference list - not a full course.

## Resource naming

- Use nouns for paths, not verbs: `/orders`, not `/getOrders` or `/createOrder`.
- Plural collection names: `/orders` (list/create), `/orders/{id}` (one resource).
- Nest only when the child truly can't exist without the parent:
  `/orders/{id}/items`, not `/items?orderId={id}` unless items are also
  independently queryable.
- Use query parameters for filtering/sorting/pagination, not for identifying
  a specific resource: `/orders?status=pending&page=2`.

## HTTP methods

- `GET` - read a resource, no side effects, safe to cache
- `POST` - create a new resource, or trigger an action that isn't idempotent
- `PUT` - replace a resource entirely
- `PATCH` - update part of a resource
- `DELETE` - remove a resource

## Common status codes

- `200 OK` - success, returning data
- `201 Created` - success, a new resource was created
- `204 No Content` - success, nothing to return (common for DELETE)
- `400 Bad Request` - client sent invalid input
- `401 Unauthorized` - missing/invalid credentials
- `403 Forbidden` - authenticated but not allowed
- `404 Not Found` - resource doesn't exist
- `409 Conflict` - request conflicts with current state (e.g. duplicate)
- `422 Unprocessable Entity` - well-formed request, invalid semantics
- `500 Internal Server Error` - something broke on the server

## One example endpoint

```
POST /api/orders
Body: { "userId": "u_123", "items": [{ "sku": "abc", "qty": 2 }] }

201 Created
{ "id": "ord_456", "status": "pending", "total": 39.98 }
```

- Path names a resource collection (`/orders`), not a verb (`/createOrder`).
- The body carries only what the client can decide; server computes `total`.
- Response echoes the created resource with its new ID.

## A few things that make an API actually RESTful

- **Statelessness**: each request carries everything needed to handle it
  (e.g. an auth token) - the server doesn't rely on stored session state
  between requests.
- **Idempotency where it matters**: calling `PUT`/`DELETE` on the same
  resource twice should leave the system in the same state as calling it
  once. `POST` is the one method allowed to not be idempotent (it creates a
  new thing each time).
- **Versioning**: once clients depend on a shape, don't break it silently -
  version the API (`/api/v1/orders`) or the media type when a breaking
  change is unavoidable.
- **Consistent error shape**: return the same JSON error structure across
  every endpoint (e.g. `{ "error": { "code": "...", "message": "..." } }`)
  so clients can handle failures generically instead of per-endpoint.
