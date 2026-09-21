# Data, Reliability, and Performance

Measure the symptom before changing the design:

```text
measurable symptom -> bottleneck or failure mode -> smallest change -> re-measure
```

For a relevant change, inspect only the applicable concerns:

- transaction boundaries, idempotency, retries, duplicate delivery, and races;
- migration compatibility and rollback behavior;
- query shape, N+1 behavior, indexes, and resource bounds using the actual
  query plan or workload;
- connection, worker, queue, and memory saturation;
- cache correctness, ownership, invalidation, TTL, and stampede behavior;
- external dependency timeouts, retry policy, backoff, and failure handling;
- bounded lists, payloads, batch work, and background queues.

Do not add a cache, index, pool-size change, timeout, queue, or concurrency
mechanism without evidence that it addresses the measured problem and fits
the repository's operating constraints.
