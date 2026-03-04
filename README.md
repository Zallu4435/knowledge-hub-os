# 🧠 Knowledge Hub OS

> An **event-driven, polyglot productivity platform** with an autonomous AI coaching engine — built as a production-grade microservices monorepo.

[![CI/CD](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-2088FF?logo=githubactions&logoColor=white)](/.github/workflows/ci.yml)
[![Deploy](https://img.shields.io/badge/Deploy-Vercel%20%2B%20Render-black?logo=vercel)](./DEPLOYMENT.md)
[![License](https://img.shields.io/badge/License-MIT-green)](./LICENSE)

---

## ✨ What It Does

Knowledge Hub OS is a productivity app where users create goals, break them into tasks, and an **AI brain** watches every completed task in real-time — generating personalized coaching insights, career roadmaps, and answering questions about their own work history via a RAG chatbot.

**The AI never blocks the user.** Tasks complete instantly; AI processing happens asynchronously via Kafka.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     FRONTEND  (Next.js 15)                       │
│              Vercel in prod · Port 4000 in dev                   │
└────────────────────────┬────────────────────────────────────────┘
                         │ HTTPS (frontend_net)
┌────────────────────────▼────────────────────────────────────────┐
│                  API GATEWAY  (NestJS)  :3000                    │
│          JWT validation · Kafka producer · Prisma                │
└──────────┬──────────────────────────────┬──────────────────────┘
           │ backend_net                  │ backend_net
┌──────────▼──────────┐       ┌───────────▼──────────────────────┐
│  AUTH SERVICE :3001  │       │       GOAL SERVICE :3002          │
│  Register/Login/JWT  │       │  Goals · Tasks · Kafka producer   │
│  Redis JWT blacklist │       └───────────┬──────────────────────┘
└─────────────────────┘                   │ Kafka topics
                        ┌─────────────────▼──────────────────────┐
                        │  Redpanda (Kafka-compatible)  :9092      │
                        │   Topics: user.events · task.completed   │
                        └─────────────────┬──────────────────────┘
                                          │ Consumer
┌─────────────────────────────────────────▼──────────────────────┐
│               AI SERVICE  (FastAPI + LangChain)  :8000          │
│  "The Architect" — 30-day onboarding roadmap via Gemini         │
│  "The Coach"     — task completion high-fives + tips            │
│  RAG Chatbot     — MongoDB Vector Search + Gemini               │
└──────────────────┬──────────────────────┬──────────────────────┘
                   │                      │
       ┌───────────▼──────────┐ ┌─────────▼────────────────────┐
       │  MongoDB Atlas        │ │    Neon (Serverless Postgres) │
       │  Vectors + Insights   │ │    Users, Goals, Tasks        │
       └──────────────────────┘ └──────────────────────────────┘

── Observability (Phase 12) ─────────────────────────────────────
  Jaeger :16686  ←  OTLP traces from all 4 NestJS + Python services
  Prometheus :9090  ←  /metrics scraped from every service every 15s
  Grafana :3030   ←  Pre-built dashboard (auto-provisioned)
```

---

## 🛠️ Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Build System** | Bazel 7 (Bzlmod) | Hermetic, reproducible, cached builds |
| **Containerisation** | `rules_oci` + Distroless | Zero shell, minimal CVE surface |
| **Frontend** | Next.js 15 (App Router) | Standalone Docker build |
| **API Gateway** | NestJS + TypeScript | Port 3000 |
| **Auth Service** | NestJS + Redis JWT Blacklist | Port 3001 |
| **Goal Service** | NestJS + Prisma ORM | Port 3002 |
| **AI Service** | FastAPI + LangChain + Gemini | Port 8000 |
| **Message Broker** | Redpanda (Kafka-compatible) | Port 9092 · 29092 |
| **Relational DB** | Neon (Serverless PostgreSQL) | Via Prisma ORM |
| **Document + Vector DB** | MongoDB Atlas | 768-dim cosine similarity |
| **Cache / Blacklist** | Redis 7 | JWT token blacklist |
| **Tracing** | OpenTelemetry → Jaeger | OTLP/HTTP, BatchSpanProcessor |
| **Metrics** | prom-client + Prometheus | Scraped every 15 s |
| **Dashboards** | Grafana 10 | Auto-provisioned datasources |
| **CI** | GitHub Actions | Bazel test → Docker build → GHCR push |
| **CD** | GitHub Actions → SSH | Rolling restart on Oracle / Render |

---

## 🔄 How the Event Loop Works

```
User clicks "Mark Done" on the UI
   │
   ▼
Goal Service → UPDATE task SET status='DONE' → Postgres
   │
   ├──▶ Kafka: emit('task.completed', { userId, goalTitle, taskTitle })
   │         [returns immediately — user is NOT waiting]
   │
   ▼ (async, background)
AI Service consumer wakes up
   │
   ├──▶ Gemini: "The Coach" generates personalised insight
   ├──▶ Embeds insight into 768-dim vector
   └──▶ MongoDB Atlas: insert { insight, embedding, userId }

User opens /chat → asks "How am I doing?"
   │
   ▼
Embedding similarity search (MongoDB $vectorSearch)
   │
   └──▶ Gemini: RAG response using top-5 past insights
```

---

## 📂 Repository Structure

```
knowledge-hub-os/
├── apps/
│   ├── api-gateway/          # NestJS entry-point + JWT validation
│   │   ├── src/
│   │   ├── Dockerfile        # For Render.com deployment
│   │   └── BUILD.bazel       # Bazel: js_image_layer → oci_tarball
│   ├── auth-service/         # Register / Login / Logout + Redis blacklist
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── BUILD.bazel
│   ├── goal-service/         # Goals · Tasks · Kafka producer
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── BUILD.bazel
│   ├── ai-service/           # FastAPI + LangChain + Gemini + aiokafka
│   │   ├── main.py
│   │   ├── Dockerfile
│   │   ├── requirements.in   # Abstract deps
│   │   └── requirements.txt  # Locked deps (pip-compile output)
│   └── frontend/             # Next.js 15 App Router
│       └── BUILD.bazel
│
├── libs/
│   ├── database/             # Shared Prisma client (schema.prisma)
│   ├── event_schemas/        # JSON Schema → TS Interface + Pydantic models
│   ├── exceptions/           # Global NestJS HttpExceptionFilter
│   ├── security/             # JwtAuthGuard + RedisService
│   └── telemetry/            # OpenTelemetry SDK bootstrap (shared NestJS)
│       └── src/tracer.ts     # BatchSpanProcessor → Jaeger OTLP/HTTP
│
├── infra/
│   ├── prometheus/
│   │   └── prometheus.yml    # Scrape config for all 6 services
│   ├── grafana/
│   │   ├── provisioning/     # Auto-datasource: Prometheus + Jaeger
│   │   └── dashboards/       # Pre-built overview dashboard (9 panels)
│   └── nginx/
│       └── nginx.conf        # Reverse proxy for production (port 80)
│
├── docs/
│   ├── OBSERVABILITY.md      # Jaeger · Prometheus · Grafana guide
│   └── phase-*.md            # Build-phase documentation
│
├── .github/
│   └── workflows/
│       ├── ci.yml            # Test → Build Docker images → Push to GHCR
│       └── cd.yml            # Auto-deploy to Oracle / Render on push
│
├── docker-compose.yml        # Full local stack (all services + observability)
├── docker-compose.prod.yml   # Production override (GHCR images + Nginx)
├── render.yaml               # Render.com Blueprint (one-click deploy)
├── deploy.sh                 # Rolling restart script for self-hosted VMs
├── DEPLOYMENT.md             # Step-by-step free deployment guide
├── .env.prod.example         # Production env-var template
└── MODULE.bazel              # Bazel module deps (rules_oci, rules_pkg …)
```

---

## 🚀 Quick Start (Local Dev)

### Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 20+ | [nodejs.org](https://nodejs.org) |
| pnpm | 8+ | `npm i -g pnpm` |
| Python | 3.11+ | [python.org](https://python.org) |
| Docker + Compose | Latest | [docker.com](https://docker.com) |
| Bazelisk | Latest | `npm i -g @bazel/bazelisk` |

### 1. Clone & Install

```bash
git clone https://github.com/<your-username>/knowledge-hub-os.git
cd knowledge-hub-os
pnpm install
```

### 2. Configure Environment

```bash
cp .env.prod.example .env
# Open .env and fill in your keys (see table below)
```

**Required environment variables:**

| Variable | Where to get it | Free? |
|---|---|---|
| `DATABASE_URL` | [neon.tech](https://neon.tech) → New Project → Connection string | ✅ |
| `MONGO_URI` | [mongodb.com/atlas](https://mongodb.com/atlas) → Connect → Drivers | ✅ |
| `GEMINI_API_KEY` | [aistudio.google.com](https://aistudio.google.com) → Get API key | ✅ |
| `JWT_SECRET` | Run: `openssl rand -base64 32` | ✅ |

> **MongoDB one-time setup:** Create a Vector Search Index named `vector_index`
> on collection `knowledge_hub.user_insights`, field `embedding`, 768 dimensions,
> cosine similarity.

### 3. Option A — Full Docker Stack (Recommended)

```bash
# Build all 5 Distroless images via Bazel (hermetic)
bazel run //apps/api-gateway:tarball
bazel run //apps/auth-service:tarball
bazel run //apps/goal-service:tarball
bazel run //apps/ai-service:tarball
bazel run //apps/frontend:tarball

# Verify images are loaded
docker images | grep knowledgehub

# Launch everything (app + Redpanda + Redis + Observability)
docker compose up -d

# Check health
docker compose ps

# Open app
open http://localhost:4000
```

**Service URLs:**

| Service | URL |
|---|---|
| Frontend | http://localhost:4000 |
| API Gateway | http://localhost:3000 |
| Auth Service | http://localhost:3001 |
| Goal Service | http://localhost:3002 |
| AI Service | http://localhost:8000 |
| **Grafana** | http://localhost:3030 `admin/admin` |
| **Jaeger UI** | http://localhost:16686 |
| **Prometheus** | http://localhost:9090 |

### 4. Option B — Dev Mode (Bazel Run, no Docker for services)

```bash
# Start only infrastructure
docker compose up redpanda redis -d

# First time: apply DB schema
npx prisma db push --schema=libs/database/schema.prisma
npx prisma generate --schema=libs/database/schema.prisma

# Each service in a separate terminal:
bazel run //apps/api-gateway:api-gateway    # Terminal 1
bazel run //apps/auth-service:auth-service  # Terminal 2
bazel run //apps/goal-service:goal-service  # Terminal 3
bazel run //apps/ai-service:ai-service      # Terminal 4
bazel run //apps/frontend:dev               # Terminal 5
```

---

## 🌐 Deployment (Free, No Credit Card)

> Full step-by-step guide → **[DEPLOYMENT.md](./DEPLOYMENT.md)**

**Summary:**

| Component | Platform | Cost |
|---|---|---|
| Frontend (Next.js) | **Vercel** free hobby plan | $0 |
| API Gateway, Auth, Goal, AI | **Render** free web services | $0 |
| Kafka (replaces Redpanda) | **Upstash Kafka** free tier | $0 |
| Redis (replaces container) | **Upstash Redis** free tier | $0 |
| PostgreSQL | **Neon** (already configured) | $0 |
| MongoDB | **MongoDB Atlas** (already configured) | $0 |
| Gemini AI | Google AI Studio (already configured) | $0 |
| **Total** | | **$0/month** |

**One-click Render deploy:** The `render.yaml` file in this repo defines all 4
backend services. In Render Dashboard → New → Blueprint → connect this repo →
all services are created automatically.

---

## 📊 Observability

> Full guide → **[docs/OBSERVABILITY.md](./docs/OBSERVABILITY.md)**

Phase 12 added a complete observability stack:

**Distributed Tracing (Jaeger)**
- All 4 NestJS services and the Python FastAPI service send traces via OTLP/HTTP
- Shared `libs/telemetry/src/tracer.ts` bootstraps `NodeSDK` with `BatchSpanProcessor`
- Auto-instruments HTTP, Express, NestJS controllers

**Metrics (Prometheus + Grafana)**
- Every service exposes a `/metrics` endpoint via `prom-client` (NestJS) or `prometheus-fastapi-instrumentator` (Python)
- Prometheus scrapes all 6 targets every 15 s
- Pre-built Grafana dashboard includes: HTTP throughput, p95 latency, error rate, Kafka lag, Redis hit ratio

**Custom Business Metrics:**

| Service | Metric | Description |
|---|---|---|
| api-gateway | `api_gateway_kafka_events_published_total` | Kafka publishes by topic |
| auth-service | `auth_service_operations_total{operation,status}` | register/login/logout |
| goal-service | `goal_service_tasks_completed_total` | Task completions |
| goal-service | `goal_service_kafka_events_published_total` | Kafka publishes |

---

## 🔁 CI/CD Pipeline

```
git push main
       │
       ├── .github/workflows/ci.yml
       │     ├── 🧪 test   — bazel test //... + pytest ai-service
       │     ├── 🏗️ build  — bazel build :tarball (all 5 services)
       │     └── 🚀 push   — docker push → ghcr.io (main branch only)
       │
       └── .github/workflows/cd.yml  (triggers after CI push job)
             └── SSH → Oracle VM / Render → rolling restart → health check
```

**Required GitHub Secrets** (Settings → Secrets → Actions):

| Secret | Value |
|---|---|
| `ORACLE_VM_IP` | Your server's public IP |
| `ORACLE_SSH_KEY` | SSH private key file contents |
| `GITHUB_ORG` | Your GitHub username |

---

## 🐳 Docker Images

| Image | Base | Built with |
|---|---|---|
| `knowledgehub/api-gateway` | distroless/nodejs20 | `bazel run //apps/api-gateway:tarball` |
| `knowledgehub/auth-service` | distroless/nodejs20 | `bazel run //apps/auth-service:tarball` |
| `knowledgehub/goal-service` | distroless/nodejs20 | `bazel run //apps/goal-service:tarball` |
| `knowledgehub/ai-service` | distroless/python3 | `bazel run //apps/ai-service:tarball` |
| `knowledgehub/frontend` | distroless/nodejs20 | `bazel run //apps/frontend:tarball` |

---

## 📚 Phase Documentation

| Phase | What Was Built |
|---|---|
| **Phase 1–6** | Bazel workspace · pnpm monorepo · Python lockfile · cross-language JSON Schema contracts · NestJS scaffold · Kafka event bridge |
| **Phase 7–8** | Prisma + Neon PostgreSQL · MongoDB Atlas · polyglot persistence layer |
| **Phase 9–10** | JWT auth + Redis blacklist · Goal/Task product · RAG chatbot · Agentic AI ("Architect" + "Coach") |
| **Phase 11** | `rules_oci` Distroless images · Docker Compose 3-tier networking · health checks · resource limits |
| **Phase 12** | OpenTelemetry tracing · Prometheus metrics · Grafana dashboards · GitHub Actions CI/CD |

---

## ✅ Roadmap

- [x] Bazel monorepo with pnpm + pip-tools
- [x] Cross-language type contracts (JSON Schema → TS + Pydantic)
- [x] Event-driven backbone (Redpanda/Kafka)
- [x] Polyglot persistence (Neon + MongoDB Atlas)
- [x] JWT auth + Redis token blacklist
- [x] Agentic AI engine (LangChain + Gemini "Architect" & "Coach")
- [x] RAG chatbot (MongoDB Vector Search)
- [x] Distroless Docker images via Bazel `rules_oci`
- [x] Docker Compose production orchestration
- [x] **Observability** — OpenTelemetry · Prometheus · Grafana · Jaeger
- [x] **CI/CD** — GitHub Actions (test → build → push → deploy)
- [x] **Free cloud deployment** — Vercel + Render + Upstash (zero cost)
- [x] **Modern UI/UX Overhaul** — Glassmorphism, real-time validation, and polished empty states

---

**Author:** Muhammed Nazal K  
**License:** MIT
