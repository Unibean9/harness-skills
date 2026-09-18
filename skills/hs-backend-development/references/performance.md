# Performance: Database and Caching

Measure first. `EXPLAIN ANALYZE`, a slow-query log, or p95 latency per
endpoint tells you where the time goes. Optimizing without a measurement
usually speeds up the wrong thing and makes the code harder to read. Most
backend slowness is in the database, so start there.

## Database

### Indexes

```sql
CREATE INDEX idx_orders_user_id ON orders(user_id);                 -- foreign keys you filter or join on
CREATE INDEX idx_orders_user_date ON orders(user_id, created_at DESC); -- composite: equality column first, then sort/range
CREATE INDEX idx_active_users_email ON users(email) WHERE active;     -- partial: only the rows you query

EXPLAIN ANALYZE SELECT * FROM orders
WHERE user_id = 123 AND created_at > now() - interval '30 days';
```

- Look for `Seq Scan` on a large table in the plan. That's the usual sign
  of a missing index.
- Index the columns you filter, join, and sort on. Column order matters in
  a composite index: the index above helps `WHERE user_id = ?` but not
  `WHERE created_at > ?` alone.
- Don't index everything. Each index slows writes and uses storage, and it
  barely helps on tiny tables or low-selectivity columns (a boolean that's
  `true` for most rows).
- Beyond the default B-tree, most relational databases offer specialized
  index types for full-text, JSON, and geospatial queries.

### The N+1 query problem

```text
Bad:  posts = query("all posts")                        # 1 query
      for each post: post.author = query("user by id")  # + N queries

Good: posts = query("all posts JOIN their authors")     # 1 query
      (or the ORM's eager loading, or one batched "users WHERE id IN (...)")
```

N+1 hides in loops and in ORM lazy-loading during serialization. A
query-count log in tests catches it early.

### Connection pooling

Opening a DB connection is expensive, so reuse them through a pool:

```text
pool settings: max connections = 20, idle timeout = 30 s, acquire timeout = 2 s
every query borrows a connection from the pool and returns it when done
```

- Size the pool so that **pool size × number of app instances** stays
  below the database's connection limit. A bigger pool isn't faster once
  the database is saturated.
- Set a connection timeout, so a saturated pool fails fast instead of
  hanging requests.
- Serverless or very many instances: put a pooler (PgBouncer, RDS Proxy)
  in front of the database.

### Also check

- Select only the columns you need; no `SELECT *` on wide tables in hot
  paths.
- Every list query is paginated (see `api-design.md`).
- Batch writes instead of inserting row by row.

## Caching

Cache data that is **read often, changes rarely, and is expensive to
compute**, and only after the query itself is reasonably fast. A cache
added in front of a bad query hides the problem until the cache is cold.

### Cache-aside (the default pattern)

```text
getUser(id):
    cached = cache.get("user:" + id)
    if cached: return cached
    user = db.findUser(id)
    cache.set("user:" + id, user, ttl = 1 hour)
    return user
```

On a write, update the database, then **delete** the cache key (don't
update it), so the next read reloads fresh data:

```text
db.updateUser(id, data)
cache.delete("user:" + id)
```

### Invalidation rules

- **Always set a TTL.** It bounds how long a missed invalidation can serve
  stale data.
- **Key naming** follows `resource:id[:variant]` (e.g. `user:42:profile`),
  so related keys are easy to find and delete.
- **Never scan the whole keyspace to invalidate** (Redis `KEYS pattern`
  in production blocks the server while it scans). Use an incremental
  scan, or better, embed a version in the key
  (`catalog:v7:...`) and bump the version to invalidate everything at
  once.
- **Stampedes**: when a hot key expires, many requests hit the database at
  once. Add jitter to TTLs, or let one request rebuild the value while the
  others wait or serve the stale value.
- **Never cache per-user or permission-dependent data under a shared key**,
  or users will see each other's data.

### Cache layers

```
Client -> CDN (static assets, public GET responses)
       -> application cache (e.g. Redis)
       -> database
```

Watch the **hit rate**. A cache that's rarely hit adds latency and
complexity without saving load.

## Checklist

- [ ] The slow path was measured, and the result is written down.
- [ ] Filter, join, and sort columns on large tables are indexed; the
      query plan was checked.
- [ ] No N+1 queries in list endpoints.
- [ ] Pool size × instances stays under the DB connection limit, and pools
      have timeouts.
- [ ] Every cached value has a TTL and an invalidation path on write.
- [ ] No full-keyspace scans in production code; no shared cache keys for
      per-user data.
