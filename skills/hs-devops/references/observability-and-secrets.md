# Observability and Secrets for a Backend Service

A reference, not a gated workflow. What a running service has to expose
so you can tell whether it's healthy, and how it should receive
credentials. Pipeline-level secret handling (OIDC, CI secrets) lives in
`github-actions-cicd.md`.

## Health checks

Expose two endpoints; orchestrators (Kubernetes, Container Apps, load
balancers) use them differently:

- **Liveness** (`/health/liveness`) answers "is the process alive?". Keep it
  trivial, with no dependency checks, or a database blip will restart
  every instance at once.
- **Readiness** (`/health/readiness`) answers "can it serve traffic right
  now?". It checks the dependencies the service can't work without and
  returns `503` while they're down, so traffic is routed elsewhere.

```typescript
app.get('/health/liveness', (_req, res) => res.json({ status: 'ok' }));

app.get('/health/readiness', async (_req, res) => {
  const checks = { database: await ping(db), cache: await ping(redis) };
  const ready = Object.values(checks).every(Boolean);
  res.status(ready ? 200 : 503).json({ status: ready ? 'ready' : 'not ready', checks });
});
```

## The three signals

| Signal | Answers | Typical tools |
|---|---|---|
| **Metrics** | How much, how fast, how often it fails, over time | Prometheus + Grafana, Azure Monitor |
| **Logs** | What happened in one specific request | Structured JSON to stdout, collected by Loki, ELK, or Log Analytics |
| **Traces** | Where the time went across services | OpenTelemetry SDK, exported over OTLP to Jaeger, Tempo, or App Insights |

- **Metrics - start with RED per endpoint**: **R**ate (requests per
  second), **E**rrors (5xx ratio), and **D**uration (a latency histogram,
  so you can read p95/p99). Keep label values low-cardinality (route
  template, method, status class), never user IDs or raw URLs.
- **Logs** - structured, with a request ID on every line; see
  `hs-backend-development`'s `debugging.md` for levels and what never to
  log.
- **Traces** - instrument with OpenTelemetry once and pick the backend
  through configuration. Auto-instrumentation covers HTTP and most DB
  clients. Propagate the trace context across service calls.

Alert on symptoms users feel (error rate, latency, saturation), not on
every individual log error.

## Secrets at runtime

- The application reads secrets from **environment variables or a mounted
  file** at startup and fails fast with a clear message when one is
  missing. It never reads them from the repo.
- Where they come from depends on the platform: a secret manager (Azure Key
  Vault, AWS Secrets Manager, HashiCorp Vault) injected by the platform, or
  Kubernetes `Secret`s referenced from the deployment:

  ```yaml
  env:
    - name: DATABASE_URL
      valueFrom:
        secretKeyRef: { name: db-secret, key: url }
  ```

  Kubernetes Secrets are only base64-encoded, not encrypted, so enable
  encryption at rest or sync them from a real secret manager.
- **Prefer identity over keys**: managed identity or workload identity lets
  the service reach the database or vault with no stored credential at
  all.
- Keep `.env` files local only and git-ignored; commit a `.env.example`
  with the variable names and no values.
- **Rotate** secrets on a schedule and immediately after any suspected
  leak. A secret that was ever committed is compromised, even after the
  commit is removed.

## Checklist

- [ ] Liveness and readiness endpoints are separate, and liveness has no
      dependency checks.
- [ ] RED metrics per endpoint, with low-cardinality labels.
- [ ] Structured logs to stdout with request IDs, and no secrets or
      personal data.
- [ ] OpenTelemetry traces propagate across service calls.
- [ ] Alerts on user-facing symptoms.
- [ ] Secrets come from the platform or a secret manager at runtime, never
      from the image or repo.
- [ ] Missing configuration fails fast at startup.
