# 🐳 Knowledge Hub OS: Phase 4 — Production Hardening & Containerization

This phase covers three distinct chapters of maturity:

1. **Security Hardening** — Redis-backed JWT blacklist, shared security library
2. **Observability** — Structured logging (`pino`, `structlog`), shared exceptions library
3. **Phase 11: Containerization** — Bazel `rules_oci` + Distroless Docker images for all 5 services
4. **Phase 12: Orchestration** — Production-grade Docker Compose

---

## Chapter 1: Security Hardening

### What Was Built

#### 1.1 Redis JWT Blacklist (`libs/security`)
The Auth Service now maintains a **stateless JWT blacklist** using Redis. Upon logout, the token's `jti` (JWT ID) is stored in Redis with a TTL matching the token expiry. Every protected endpoint checks this blacklist before allowing access.

**Shared Security Library (`libs/security`):**
- `JwtAuthGuard` — verifies JWT signature and checks Redis blacklist
- `RedisService` — injectable Redis client wrapper
- Exposed as a Bazel target `//libs/security:security_lib` consumed by all NestJS services

**Why a shared lib?** Without this, each service would implement its own JWT verification logic — a classic distributed security anti-pattern. One library, one truth.

#### 1.2 Redis Added to Infrastructure
- Added Redis to `docker-compose.yml`
- `REDIS_URL` added to `.env`
- All NestJS services now depend on the shared `//libs/security:security_lib`

---

## Chapter 2: Observability

### What Was Built

#### 2.1 Shared Exceptions Library (`libs/exceptions`)
A Bazel-managed shared module providing:
- `HttpExceptionFilter` — standardizes all error response shapes (`{ status, message, path, timestamp }`)
- Prevents each service from independently formatting errors differently

#### 2.2 Structured Logging
- **Node.js services** (NestJS): Integrated `nestjs-pino` + `pino` + `pino-http` for JSON-structured request logging
- **Python service** (FastAPI): Integrated `structlog` for JSON-structured event logging

> Structured logs are machine-parseable and required for any log aggregation system (e.g., Grafana Loki, Datadog, CloudWatch).

#### 2.3 `structlog` Lockfile Fix
During the Bazel build for `ai-service`, this error occurred:

⚠️ **Error: Missing Python Package in Lockfile**
- **Error Message:** `no such package '@@rules_python~~pip~pip//structlog'`
- **Root Cause:** `structlog` was listed in `requirements.in` (source) but was never compiled into the locked `requirements.txt` by `pip-compile`.
- **Fix:** Manually added `structlog==24.4.0` to `requirements.txt` in the correct alphabetical position with the standard `pip-compile` annotation format.

---

## Chapter 3: Phase 11 — Bazel Containerization with `rules_oci`

### Architecture Decision: Why `rules_oci` + Distroless?

| Approach | Image Size | Security | Reproducibility |
|---|---|---|---|
| Standard `Dockerfile` | ~1 GB | ❌ Full OS in image | ❌ Non-hermetic |
| `rules_oci` + Distroless | ~200–500 MB | ✅ Zero shell, zero OS tools | ✅ Hermetic via Bazel |

**Distroless images** contain only the language runtime — no shell, no package manager, no system utilities. This eliminates the majority of CVEs that exist in standard Docker images.

---

### Step 1: `MODULE.bazel` Updates

```python
# OCI Image builder
bazel_dep(name = "rules_oci", version = "1.7.5")

# Tar packaging (needed for Python service)
bazel_dep(name = "rules_pkg", version = "1.0.1")

# Pull distroless base images
oci = use_extension("@rules_oci//oci:extensions.bzl", "oci")

oci.pull(
    name = "distroless_nodejs",
    digest = "sha256:a3c4d477f3f303cfdf2b43b0a255fb5a0d435957b466819b3c0940d9d05404b6",
    image = "gcr.io/distroless/nodejs20-debian11",
    platforms = ["linux/amd64", "linux/arm64"],
)

oci.pull(
    name = "distroless_python",
    digest = "sha256:72c0ee6f962df1ad412dc94d0cdf8a0e3197447235da79fa93b2f3e1ac4d2f4e",
    image = "gcr.io/distroless/python3-debian11",
    platforms = ["linux/amd64", "linux/arm64"],
)
use_repo(oci, "distroless_nodejs", "distroless_python")
```

⚠️ **Error 16: Distroless Digest 404**
- **Error Message:** `GET https://gcr.io/v2/distroless/nodejs20-debian11/manifests/sha256:... 404 Not Found`
- **Root Cause:** The `sha256` digests in tutorials and docs are outdated. Google regularly publishes new digest versions for Distroless images.
- **Fix:** Pulled the latest images locally and extracted the current digest:
  ```bash
  docker pull gcr.io/distroless/nodejs20-debian11
  docker inspect gcr.io/distroless/nodejs20-debian11 --format='{{index .RepoDigests 0}}'
  ```

---

### Step 2: Root `BUILD.bazel` — `.env` Library

```python
load("@aspect_rules_js//js:defs.bzl", "js_library")

js_library(
    name = "env",
    srcs = [".env"],
    visibility = ["//visibility:public"],
)
```

⚠️ **Error 17: `.env` File Dependency**
- **Error Message:** `no such target '//:.env'` (when using `data = ["//:.env"]` in `js_binary`)
- **Root Cause:** `aspect_rules_js` requires files used as runtime data deps to be wrapped in a `js_library` target, not referenced as raw file exports.
- **Fix:** Created `//:env` (`js_library` wrapping `.env`) and updated all Node.js `js_binary` targets to use `data = ["//:env"]`.

---

### Step 3: Node.js Services (`goal-service`, `auth-service`, `api-gateway`)

**Pattern used: `js_image_layer` → `oci_image` → `oci_tarball`**

```python
load("@aspect_rules_js//js:defs.bzl", "js_binary", "js_image_layer")
load("@rules_oci//oci:defs.bzl", "oci_image", "oci_tarball")

# 1. Package the compiled binary into a tar layer
js_image_layer(
    name = "app_layer",
    binary = ":goal-service",
    root = "/app",
)

# 2. Inject into the Distroless Node container
oci_image(
    name = "image",
    base = "@distroless_nodejs",
    tars = [":app_layer"],
    entrypoint = ["/nodejs/bin/node", "/app/apps/goal-service/src/main.js"],
    workdir = "/app",
)

# 3. Create the loadable Docker tarball
oci_tarball(
    name = "tarball",
    image = ":image",
    repo_tags = ["knowledgehub/goal-service:latest"],
)
```

⚠️ **Error 18: `pkg_tar` Fails on Node.js Binary Output**
- **Error Message:** Directory-related errors when using `pkg_tar` with `aspect_rules_js` output
- **Root Cause:** `pkg_tar` cannot handle the complex symlinked runfiles output of `aspect_rules_js`. It was designed for simple file trees.
- **Fix:** Replaced `pkg_tar` with `js_image_layer` from `aspect_rules_js`, which is purpose-built for packaging `js_binary` targets into OCI-compatible tar layers.

⚠️ **Error 19: Missing `security_lib` in Auth Service**
- **Error Message:** `Cannot find module '../security/jwt-auth.guard'` at runtime
- **Root Cause:** `//libs/security:security_lib` was in `ts_project` deps but missing from `js_binary` data.
- **Fix:** Added `//libs/security:security_lib` to both `deps` and `data` in `apps/auth-service/BUILD.bazel`.

---

### Step 4: Python AI Service

**Pattern used: `pkg_tar` → `oci_image` → `oci_tarball`**

```python
load("@rules_pkg//pkg:tar.bzl", "pkg_tar")
load("@rules_oci//oci:defs.bzl", "oci_image", "oci_tarball")

pkg_tar(
    name = "app_layer",
    srcs = [":ai-service"],
    include_runfiles = True,
    strip_prefix = ".",
)

oci_image(
    name = "image",
    base = "@distroless_python",
    tars = [":app_layer"],
    entrypoint = ["python3", "apps/ai-service/main.py"],
)

oci_tarball(
    name = "tarball",
    image = ":image",
    repo_tags = ["knowledgehub/ai-service:latest"],
)
```

> **Why `pkg_tar` here and not `js_image_layer`?** `js_image_layer` is specific to `aspect_rules_js`. Python binaries from `rules_python` use `pkg_tar`, which correctly handles `py_binary` runfiles.

---

### Step 5: Next.js Frontend

Next.js requires a special two-step approach:

**Step 5a: Enable Standalone Build** (`apps/frontend/next.config.js`):
```js
const nextConfig = {
    output: 'standalone', // Produces minimal self-contained build
    reactStrictMode: true,
    transpilePackages: ['@knowledge-hub-os/event-schemas'],
}
```

**Step 5b: Bazel BUILD targets** — Run `next build` via `genrule`, package with `pkg_tar`:

```python
# Run 'next build' → produces apps/frontend/.next/standalone
genrule(
    name = "next_build",
    srcs = glob(["app/**", "components/**", "lib/**", "public/**", "*.json", "*.js", "*.ts", "*.css"]),
    outs = ["standalone.tar"],
    cmd = """
        EXECROOT=$$PWD
        cd apps/frontend && NODE_ENV=production ../../node_modules/.bin/next build
        cd $$EXECROOT
        mkdir -p $$(dirname $(OUTS))
        tar -cf $(OUTS) -C apps/frontend/.next/standalone .
    """,
    local = True,
)

pkg_tar(
    name = "app_layer",
    srcs = [":next_build"],
    package_dir = "/app",
)

oci_image(
    name = "image",
    base = "@distroless_nodejs",
    tars = [":app_layer"],
    entrypoint = ["/nodejs/bin/node", "/app/server.js"],
    workdir = "/app",
)

oci_tarball(
    name = "tarball",
    image = ":image",
    repo_tags = ["knowledgehub/frontend:latest"],
)
```

⚠️ **Error 20: `js_image_layer` Output Prefix Conflict**
- **Error Message:** `One of the output paths '.../.next/standalone/server.js' and '.../.next' is a prefix of the other`
- **Root Cause:** Bazel doesn't allow one target's output file to exist inside another target's output directory. We tried to have `server` (js_binary) declare `server.js` inside `.next/` which is already owned by `next_build`.
- **Fix:** Used a `genrule` approach — run `next build` with `local = True` (bypasses Bazel sandbox so it can access `node_modules`) and tar the standalone output as a single file artifact.

⚠️ **Error 21: `genrule` Working Directory**
- **Error Message:** `tar: apps/frontend/.next/standalone: Cannot open: No such file or directory`
- **Root Cause:** `genrule` runs from the Bazel **execroot** (`~/.cache/bazel/.../execroot/_main`), not the workspace. The `cd apps/frontend && next build` correctly produced `.next/standalone` in execroot, but the subsequent `tar` command ran from `apps/frontend/`, making the relative path wrong.
- **Fix:** Saved execroot path before `cd` (`EXECROOT=$$PWD`), returned with `cd $$EXECROOT` before running `tar`.

⚠️ **Error 22: `$(OUTS)` vs `$@` in genrule**
- **Error Message:** `tar: bazel-out/k8-fastbuild/bin/apps/frontend/standalone.tar: Cannot open: No such file or directory`
- **Root Cause:** `$@` in Bazel genrules is a **relative path** — the parent directory may not exist yet. `$(OUTS)` gives the same path but requires `mkdir -p` of the parent first.
- **Fix:** Added `mkdir -p $$(dirname $(OUTS))` before the `tar` command.

---

### Build & Load Commands

```bash
# Build and load each service into Docker daemon
bazel run //apps/goal-service:tarball
bazel run //apps/auth-service:tarball
bazel run //apps/api-gateway:tarball
bazel run //apps/ai-service:tarball
bazel run //apps/frontend:tarball

# Verify all images
docker images | grep knowledgehub
```

**Results:**

| Image | Size |
|---|---|
| `knowledgehub/goal-service:latest` | 495 MB |
| `knowledgehub/auth-service:latest` | 497 MB |
| `knowledgehub/api-gateway:latest` | 495 MB |
| `knowledgehub/ai-service:latest` | 408 MB |
| `knowledgehub/frontend:latest` | **196 MB** ✨ |

---

## Chapter 4: Phase 12 — Production Docker Compose

### Architecture: 3-Tier Network Isolation

```
[ frontend ] ──── frontend_net ──── [ api-gateway ]
                                         │
                                    backend_net
                           ┌─────────────┼─────────────┐
                    [ auth-service ] [ goal-service ] [ ai-service ]
                           │             │               │
                       infra_net ────────────────────────┘
                    [ redpanda (kafka) ]   [ redis ]
```

### Key Production Standards Applied

| Feature | Implementation |
|---|---|
| **3-tier networks** | `frontend_net`, `backend_net`, `infra_net` |
| **Resource limits** | `memory` + `cpus` on every service |
| **Health checks** | All services with `start_period` |
| **Log rotation** | `json-file` driver, 10MB max, 3 files (via YAML anchor) |
| **Redis memory policy** | `allkeys-lru` so it never crashes when full |
| **`depends_on: healthy`** | Gateway waits for all services to pass health checks |

### Launch Commands

```bash
# Launch entire production stack
docker compose up -d

# Check all services are healthy
docker compose ps

# View logs for a specific service
docker compose logs -f api-gateway

# Stop the stack
docker compose down
```

---

## 🧠 Key Lessons Learned

- **`js_image_layer` is for `js_binary` only** — never `js_run_binary` outputs. For tools like `next build` that produce directories, use `genrule + local=True + pkg_tar`.
- **Bazel genrules run from execroot**, not workspace. Always capture `EXECROOT=$$PWD` and `cd $$EXECROOT` back before writing outputs.
- **Distroless digests expire** — always `docker pull` + `docker inspect` to get current digests rather than copying from docs.
- **3-tier Docker networks** are the industry standard for microservices — `frontend_net` → `backend_net` → `infra_net`. A compromised container can only reach services in its own network tier.
- **`start_period` in health checks** is critical for NestJS (30s) — without it, Docker marks services unhealthy during normal bootup and triggers unnecessary cascading restarts.

---

**Author:** Muhammed Nazal k
**Phase Completed:** March 2026
