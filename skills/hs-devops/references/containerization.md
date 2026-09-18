# Containerizing a Backend Service (Docker)

A reference, not a gated workflow. Writing a Dockerfile is safe to iterate
on locally. Pushing images to a shared registry or deploying them is not,
and still needs the user's confirmation (see the HARD-GATE in `SKILL.md`).

## Multi-stage Dockerfile

Build with everything the build needs, then ship only what runtime needs.
The result is a smaller image, faster deploys, and less for an attacker to
use.

```dockerfile
# --- build stage: full toolchain + dev dependencies ---
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci                      # dev deps are needed to compile
COPY . .
RUN npm run build && npm prune --omit=dev

# --- runtime stage: compiled output + production deps only ---
FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
USER node                       # never run as root
EXPOSE 3000
HEALTHCHECK CMD wget -qO- http://localhost:3000/health/liveness || exit 1
CMD ["node", "dist/main.js"]
```

The same shape works for other stacks: Python builds wheels in the first
stage and installs them into a slim image; Go compiles a static binary and
copies it into `distroless` or `scratch`.

Rules that matter more than the exact base image:

- **Copy the lockfile and install before `COPY . .`** so dependency layers
  stay cached when only source code changes.
- **Add a `.dockerignore`** covering `node_modules`, `.git`, `.env*`, test
  output, and local data. A stray `.env` copied into an image leaks with
  every pull.
- **Run as a non-root user**, and pin the base image to a specific
  version tag (a digest is stricter still), never `latest`.
- **Never bake secrets into the image**, not even in a build stage, since
  layers keep them. Pass them at runtime (see
  `observability-and-secrets.md`).
- **One process per container**, logging to stdout/stderr and not to files
  inside the container.

## Docker Compose for local development

Run the service with its real dependencies, so integration tests and local
debugging hit the same kind of database as production:

```yaml
services:
  api:
    build: .
    ports: ["3000:3000"]
    env_file: .env.local          # git-ignored; local-only values
    depends_on:
      db: { condition: service_healthy }
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: localdev   # local only, never a real credential
    volumes: [pgdata:/var/lib/postgresql/data]
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 5s
  redis:
    image: redis:7-alpine
volumes:
  pgdata:
```

## Checklist

- [ ] Multi-stage build; the runtime image has no compilers or dev
      dependencies.
- [ ] `.dockerignore` excludes secrets, VCS data, and build artifacts.
- [ ] The container runs as non-root, on a pinned base image.
- [ ] No secrets in the image or its layers.
- [ ] A health check is defined, and the app logs to stdout.
- [ ] `docker compose up` gives a working local stack.
