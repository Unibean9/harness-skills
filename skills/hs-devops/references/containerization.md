# Container Build and Runtime Guidance

Read the repository's build system, base-image policy, runtime user, health
signals, and deployment target before changing a Dockerfile or Compose file.

## Build

- Use multi-stage builds when they reduce the runtime image and keep build
  tools out of production.
- Keep `.dockerignore` aligned with the repository and exclude credentials,
  local state, caches, and unrelated source.
- Keep only the runtime files and dependencies needed by the service.
- If a build needs a private dependency credential, use BuildKit secret or SSH
  mounts. Do not pass it through `ARG`, `ENV`, or copied files.
- Pin base images according to repository policy and pair immutable pins with
  a controlled update mechanism so security fixes are not delayed forever.

## Runtime

Run with the least privilege practical for the service and emit logs to the
platform's standard output/error. A single concern or service per container is
useful guidance; one process is a rule of thumb, not a defect when a worker or
server intentionally manages child processes.

Use the platform's health-check conventions. A health probe should distinguish
startup, liveness, and readiness when those concepts matter, and should not
restart a process merely because a temporary downstream dependency is down.

## Local Compose

Compose is for local development and test dependencies. Keep credentials local
through the repository's approved mechanism, use health conditions only for
actual readiness, and do not infer production topology from a development
file.

## Review checklist

- The image excludes secrets, source that is not needed, and build tooling
  where practical.
- The runtime user and filesystem permissions fit the service.
- Base-image pinning and updates follow project policy.
- Build credentials use ephemeral secret/SSH mounts.
- Health behavior matches the deployment platform and failure semantics.
