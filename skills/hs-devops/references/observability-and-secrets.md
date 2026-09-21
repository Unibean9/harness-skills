# Observability, Health, and Secrets

Read the platform and framework conventions before choosing endpoints, metric
names, attributes, or secret delivery. Prefer existing OpenTelemetry and
platform semantic conventions over a parallel taxonomy.

## Health signals

Use the concepts that the deployment platform supports:

- **Startup:** initialization has completed and the process can be evaluated.
- **Liveness:** restarting is likely to help the process recover.
- **Readiness:** the instance should receive traffic now.

Do not require literal `/health/liveness` or `/health/readiness` paths across
all platforms. A liveness check should not fail merely because a temporary
downstream dependency is unavailable, or restart storms can amplify an
incident. Readiness may reflect dependencies when that is the platform's
traffic-management contract.

## Operational signals

Use logs, metrics, and traces to answer actual operational questions. Favor
request or operation identifiers, useful error context, latency, traffic,
errors, and saturation signals. Instrument only what the service and its
operators need. Use current OpenTelemetry semantic conventions for HTTP,
database, messaging, cloud, and resource attributes when they apply.

Alerts should represent symptoms and actionable failure modes rather than
every internal event. A health check or alert is evidence about a running
system, not proof that the system is correct.

## Runtime secrets and identity

Prefer managed or workload identity and short-lived credentials over static
secrets. Deliver unavoidable secrets through the platform's approved secret
manager or runtime injection path, not source, images, logs, command lines, or
workflow output. Keep local `.env` files ignored and provide only a safe
example file when the repository convention calls for one.

If static secrets remain, rotate and revoke them according to organization or
provider policy, and rotate immediately after suspected compromise. Do not
invent a universal schedule.
