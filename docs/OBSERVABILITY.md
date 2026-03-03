# Phase 12 — Observability & CI/CD Guide

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────────────┐
│  Browser → Next.js (4000) → API Gateway (3000) → Kafka → AI (8000)  │
│                                    │                                  │
│              OTLP/HTTP spans ──────┴────────────────────────────────→│
│                                                                       │
│  ┌─────────┐   ┌──────────────┐   ┌─────────────────────────────┐   │
│  │  Jaeger │   │  Prometheus  │   │         Grafana              │   │
│  │  :16686 │   │    :9090     │   │  :3030  (admin / admin)      │   │
│  └─────────┘   └──────────────┘   └─────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 🔭 Distributed Tracing — Jaeger

**UI:** http://localhost:16686

Jaeger is the "X-Ray" for your system. Every HTTP request that enters
the API Gateway gets a **Trace ID** that is automatically propagated
through Kafka message headers into the AI Service using W3C TraceContext.

### How to see a full trace

1. Open the Jaeger UI → Select Service **api-gateway** → Click **Find Traces**
2. Click any trace — you'll see a flame chart like:

```
api-gateway: POST /users          250ms
  └─ nestjs: AppController.createUser
       └─ kafka: produce user.events   12ms
ai-service: consume user.events
  └─ fastapi: process_user_event
       └─ mongo: insert_one           8ms
```

### Services sending traces

| Service | Library | Auto-instruments |
|---------|---------|-----------------|
| api-gateway | `@opentelemetry/sdk-node` | HTTP, Express, NestJS, KafkaJS |
| auth-service | `@opentelemetry/sdk-node` | HTTP, Express, NestJS, KafkaJS |
| goal-service | `@opentelemetry/sdk-node` | HTTP, Express, NestJS, KafkaJS |
| ai-service | `opentelemetry-sdk` (Python) | FastAPI routes |

---

## 📊 Metrics — Prometheus + Grafana

**Prometheus UI:** http://localhost:9090  
**Grafana UI:** http://localhost:3030 ← **Start here**  
  - Username: `admin`, Password: `admin`
  - Dashboard: **Knowledge Hub OS — System Overview** (auto-loaded)

### What Prometheus scrapes

| Job | Endpoint | Key Metrics |
|-----|---------|-------------|
| `api-gateway` | `:3000/metrics` | `http_requests_total`, `api_gateway_kafka_events_published_total`, Node.js GC/memory |
| `auth-service` | `:3001/auth/metrics` | `auth_service_operations_total{operation="login"}`, Node.js GC/memory |
| `goal-service` | `:3002/metrics` | `goal_service_tasks_completed_total`, `goal_service_kafka_events_published_total` |
| `ai-service` | `:8000/metrics` | `http_request_duration_highr_seconds`, `http_requests_total`, in-flight |
| `redpanda` | `:9644/metrics` | Consumer lag, produce latency, partition count |
| `redis-exporter` | `:9121` | Cache hit/miss ratio, command rate, memory usage |

### Pre-built Grafana dashboard panels

1. **HTTP Request Rate** — req/s by service and route (1m rate)
2. **HTTP Latency p95/p99** — shows which service is slow
3. **HTTP Error Rate** — 4xx/5xx broken out by service
4. **Kafka Consumer Lag** — is `ai-service-group` falling behind?
5. **Kafka Produce Latency** — how fast is Redpanda?
6. **AI Service panels** — request rate, p95 latency, 5xx errors
7. **Redis Cache Hit Ratio** — gauge, should stay above 90%
8. **Redis Commands/s** — GET, SET, DEL breakdown
9. **Service Up/Down** — colour-coded health status for all 4 services

---

## 🔧 Useful PromQL queries (paste into Grafana Explore)

```promql
# Real-time error rate for the API Gateway (%)
sum(rate(http_requests_total{job="api-gateway",status=~"5.."}[5m]))
/ sum(rate(http_requests_total{job="api-gateway"}[5m])) * 100

# p99 latency for the AI /chat endpoint
histogram_quantile(0.99,
  rate(http_request_duration_highr_seconds_bucket{job="ai-service",handler="/chat"}[5m]))

# Number of tasks completed in the last hour
increase(goal_service_tasks_completed_total[1h])

# Kafka consumer lag for the AI service
kafka_consumer_group_lag{group="ai-service-group"}

# Redis cache hit ratio
redis_keyspace_hits_total / (redis_keyspace_hits_total + redis_keyspace_misses_total)
```

---

## 🚀 CI/CD — GitHub Actions

**Workflow file:** `.github/workflows/ci.yml`

### Pipeline jobs

```
git push → main
     │
     ├─ 🧪 test  (parallel)
     │    ├── bazel test //...
     │    └── pytest apps/ai-service/test_ai.py
     │
     ├─ 🏗️ build  (after test passes)
     │    ├── bazel build //apps/api-gateway:tarball
     │    ├── bazel build //apps/auth-service:tarball
     │    ├── bazel build //apps/goal-service:tarball
     │    ├── bazel build //apps/ai-service:tarball
     │    └── bazel build //apps/frontend:tarball
     │
     └─ 🚀 push  (after build, only on main)
          ├── docker push ghcr.io/<owner>/knowledge-hub-os/api-gateway:latest
          ├── docker push ghcr.io/<owner>/knowledge-hub-os/api-gateway:sha-<7chars>
          └── ... (same for all 5 services)
```

### Caching strategy

- **Bazel output cache** — `~/.cache/bazel` cached by `MODULE.bazel.lock` hash.
  A clean build takes ~6min; a cached build that only changed one file takes ~45s.
- **pnpm store** — pnpm's global content-addressable store is cached by `pnpm-lock.yaml`.
- **pip** — Python package cache keyed by `requirements.in`.

### How to trigger

- **Push to `main`** — runs all 3 jobs and pushes images to GHCR
- **PR to `main`** — runs `test` + `build` only (no push)

### First-time setup

1. Ensure your repository is on GitHub (it already has a `.git` directory).
2. The `push` job uses `secrets.GITHUB_TOKEN` — **no manual secret needed**.
3. Accept the GitHub Container Registry T&C in your account settings once.
4. Images appear at: `https://github.com/<owner>?tab=packages`

---

## 🐳 Starting the full stack

```bash
# Start everything including observability
docker compose up -d

# Wait for all services to be healthy, then open:
# App        → http://localhost:4000
# API        → http://localhost:3000
# Grafana    → http://localhost:3030  (admin/admin)
# Prometheus → http://localhost:9090
# Jaeger     → http://localhost:16686

# Start only the observability stack (if app is already running)
docker compose up -d jaeger prometheus grafana redis-exporter
```

---

## File Structure Added in Phase 12

```
.github/
  workflows/
    ci.yml                          ← GitHub Actions CI/CD pipeline

infra/
  prometheus/
    prometheus.yml                  ← Scrape targets for all services
  grafana/
    provisioning/
      datasources/datasources.yaml  ← Auto-wires Prometheus + Jaeger
      dashboards/dashboards.yaml    ← Tells Grafana where JSON files live
    dashboards/
      overview.json                 ← Pre-built system overview dashboard

libs/
  telemetry/
    BUILD.bazel
    src/
      tracer.ts                     ← Shared OTEL SDK bootstrap (NestJS)
```
