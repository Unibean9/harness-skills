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
- `429 Too Many Requests` - rate limit exceeded
- `500 Internal Server Error` - something broke on the server
- `502 Bad Gateway` / `504 Gateway Timeout` - an upstream service failed or
  timed out
- `503 Service Unavailable` - temporarily down (maintenance, overload)

## One example endpoint

```
POST /api/orders
Body: { "userId": "u_123", "items": [{ "sku": "abc", "qty": 2 }] }

201 Created
{ "id": "ord_456", "status": "pending", "total": 39.98 }
```

- Path names a resource collection (`/orders`), not a verb (`/createOrder`).
- The body carries only what the client can decide; server computes `total`.
- Response echoes the created resource with its new ID, plus a
  `Location: /api/orders/ord_456` header pointing at it.

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

## REST in practice

The details that decide whether an API stays pleasant once real clients use
it. Pick one convention per project and apply it on every endpoint.

### Error format with field details

Extend the consistent error shape so a client can show the problem next to
the right form field:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": [
      { "field": "email", "message": "Invalid email format" },
      { "field": "age", "message": "Age must be between 18 and 120" }
    ]
  }
}
```

`code` is stable and machine-readable; `message` is for humans and can
change. Never put stack traces or SQL in an error response.

### Pagination

Every list endpoint needs a limit, or one large table eventually takes the
service down.

```
GET /api/v1/orders?page=2&limit=50

{
  "data": [ ... ],
  "pagination": { "page": 2, "limit": 50, "total": 1234, "hasNext": true }
}
```

- Cap `limit` on the server (e.g. max 100) regardless of what the client
  asks for.
- Page numbers are simple but drift when rows are inserted while a client
  pages. For feeds or large tables, use a cursor (`?after=<last-id>`)
  instead.

### Filtering and sorting

```
GET /api/v1/users?status=active&role=admin&sort=-createdAt,name&limit=20
```

- Filters are plain query parameters combined with AND.
- `sort` takes a comma-separated field list; a leading `-` means
  descending.
- Allowlist the fields a client may filter or sort by. Passing a raw field
  name into a query is an injection and performance risk.

### Versioning strategies

| Strategy | Example | Trade-off |
|---|---|---|
| URL | `/api/v1/users` | Most visible and easiest to route and cache; the usual default |
| Header | `Accept: application/vnd.myapi.v2+json` | Clean URLs, harder to test from a browser |
| Query | `/api/users?version=2` | Easy to add, easy to forget |

Add a new version only for a breaking change. Adding an optional field or
a new endpoint isn't one.

