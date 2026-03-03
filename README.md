# 🧠 Knowledge Hub OS

Knowledge Hub OS is an event-driven, polyglot productivity platform and autonomous AI coaching engine.

Built as a strict monorepo orchestrated by **Bazel**, this system bridges a rigid relational backend (PostgreSQL) with a flexible, intelligent NoSQL brain (MongoDB/Vector Search) using a real-time event streaming backbone (Kafka) — fully containerized with **Distroless Docker images** built hermetically via Bazel `rules_oci`.

---

## ✨ Key Features

- **Polyglot Microservices**: TypeScript (NestJS) handles strict relational business logic, while Python (FastAPI) handles data science, LLM integration, and vector mathematics.
- **Event-Driven Architecture**: Complete decoupling of services. The frontend never waits for the AI. User actions trigger asynchronous Kafka events (`task.completed`, `user.events`) that wake up background workers.
- **Cross-Language Type Safety**: A single source of truth. JSON Schemas are automatically compiled by Bazel into strict TypeScript Interfaces and Python Pydantic models.
- **Agentic AI Workflows**:
  - **The Architect**: Generates 30-day technical roadmaps upon user onboarding.
  - **The Coach**: Watches the Kafka stream and generates contextual "High-Fives" and productivity tips when users complete tasks.
- **RAG-Powered Chatbot**: MongoDB Atlas Vector Search processes user history, allowing users to query their own productivity data via an intelligent LLM interface.
- **Enterprise Security**: Cross-service stateless JWT authentication with Redis-backed token blacklist and Edge Middleware protection on the Next.js frontend.
- **Production Containerization**: All 5 services packaged into minimal Distroless Docker images via Bazel `rules_oci` — hermetic, reproducible, no shell, minimal CVE surface.

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    FRONTEND (Next.js)                    │
│                  Port 4000 · :196 MB                    │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP (frontend_net)
┌────────────────────▼────────────────────────────────────┐
│                  API GATEWAY (NestJS)                    │
│                  Port 3000 · ~495 MB                    │
└──────────┬─────────────────────────────┬────────────────┘
           │         backend_net          │
┌──────────▼──────────┐    ┌─────────────▼───────────────┐
│  AUTH SERVICE        │    │         GOAL SERVICE         │
│  NestJS · Port 3001  │    │      NestJS · Port 3002      │
└──────────┬──────────┘    └──────────────┬──────────────┘
           │                              │
           └──────────── infra_net ───────┘──────────┐
                         │                           │
           ┌─────────────▼──────────┐  ┌─────────────▼──────────┐
           │  REDPANDA (Kafka)       │  │         REDIS           │
           │  Port 9092 / 29092      │  │       Port 6379         │
           └─────────────┬──────────┘  └────────────────────────┘
                         │ topic: task.completed / user.events
           ┌─────────────▼──────────────────────────┐
           │        AI SERVICE (FastAPI)             │
           │    Python · LangChain · Port 8000       │
           └─────────────┬──────────────────────────┘
                         │
           ┌─────────────▼──────────┐  ┌────────────────────────┐
           │   MONGODB ATLAS         │  │      NEON POSTGRES      │
           │   Vector + Insights     │  │   Users, Goals, Tasks   │
           └────────────────────────┘  └────────────────────────┘
```

### The Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| **Build System** | Bazel 7.3.1 (Bzlmod) | Hermetic, reproducible builds |
| **Containerization** | `rules_oci` + Distroless | Zero shell, minimal CVE surface |
| **Frontend** | Next.js 15 (App Router) | Standalone build for Docker |
| **API Gateway** | NestJS + TypeScript 5.2.2 | Port 3000 |
| **Auth Service** | NestJS + Redis JWT Blacklist | Port 3001 |
| **Goal Service** | NestJS + Prisma ORM | Port 3002 |
| **AI Service** | FastAPI + LangChain + Gemini | Port 8000 |
| **Message Broker** | Redpanda (Kafka-compatible) | Port 9092 |
| **Relational DB** | Neon (Serverless PostgreSQL) | Via Prisma |
| **Document + Vector DB** | MongoDB Atlas | Vector Search (768-dim) |
| **Cache / Blacklist** | Redis 7 | JWT token blacklist |

---

## 🔄 The Event Loop

1. **Action**: User logs in and marks a task as "Done" via the Next.js dashboard.
2. **State Update**: Request hits the NestJS Goal Service → updates PostgreSQL via Prisma.
3. **Event Emission**: Goal Service fires a strictly-typed `task.completed` event into Redpanda (Kafka) and returns immediately.
4. **AI Interception**: FastAPI Python worker consumes the event off the stream.
5. **Intelligence Generation**: LangChain calls Google Gemini ("The Coach"), generates a productivity insight, embeds it into a 768-dim vector.
6. **Storage**: Vector + insight saved to MongoDB Atlas.
7. **Retrieval**: User navigates to `/chat` → vector similarity search → Gemini gives personalized advice based on their task history.

---

## 🚀 Getting Started

### Prerequisites

- Bazel 7+ (via `bazelisk`) and Node.js 20+ with `pnpm`
- Python 3.11+ (for local AI service dev only)
- Docker & Docker Compose
- API Keys: Neon Postgres, MongoDB Atlas, Google Gemini

### Environment Configuration

Copy and fill in the root `.env` file:

```env
# --- Database ---
DATABASE_URL="postgresql://[USER]:[PASSWORD]@[NEON_HOST]/neondb?sslmode=require&pgbouncer=true"

# --- MongoDB (AI insights store) ---
MONGO_URI="mongodb+srv://[USER]:[PASSWORD]@[CLUSTER].mongodb.net/?appName=Cluster0"

# --- Google Gemini AI ---
GEMINI_API_KEY="AIzaSy..."

# --- JWT ---
JWT_SECRET="your-super-secret-development-key"
JWT_EXPIRES_IN="1d"

# --- Kafka ---
KAFKA_BROKER_URL="localhost:9092"

# --- Redis ---
REDIS_URL="redis://localhost:6379"

# --- Service Ports ---
PORT_API_GATEWAY=3000
PORT_AUTH_SERVICE=3001
PORT_GOAL_SERVICE=3002
PORT_AI_SERVICE=8000
PORT_FRONTEND=4000

# --- CORS ---
ALLOWED_ORIGINS="http://localhost:4000"

# --- Public URLs (Next.js) ---
NEXT_PUBLIC_API_GATEWAY_URL="http://localhost:3000"
NEXT_PUBLIC_AUTH_URL="http://localhost:3001"
NEXT_PUBLIC_GOAL_SERVICE_URL="http://localhost:3002"
NEXT_PUBLIC_AI_SERVICE_URL="http://localhost:8000"
```

> **MongoDB Requirement**: Create a Vector Search Index named `vector_index` on the `knowledge_hub.user_insights` collection (`embedding` field, 768 dimensions, cosine similarity).

---

### Option A: 🐳 Production Mode (Docker Compose)

```bash
# Step 1: Build all 5 Docker images via Bazel
bazel run //apps/goal-service:tarball
bazel run //apps/auth-service:tarball
bazel run //apps/api-gateway:tarball
bazel run //apps/ai-service:tarball
bazel run //apps/frontend:tarball

# Step 2: Verify all images are loaded
docker images | grep knowledgehub

# Step 3: Launch the full stack
docker compose up -d

# Step 4: Check all services are healthy
docker compose ps

# Step 5: Access the app
open http://localhost:4000
```

### Option B: 🛠 Development Mode (Bazel Run)

Run each service in a separate terminal:

```bash
# Start infrastructure first
docker compose up redpanda redis -d

# Run database migrations (first time only)
npx prisma db push --schema=libs/database/schema.prisma
npx prisma generate --schema=libs/database/schema.prisma

# Terminal 1: API Gateway (Port 3000)
bazel run //apps/api-gateway:api-gateway

# Terminal 2: Auth Service (Port 3001)
bazel run //apps/auth-service:auth-service

# Terminal 3: Goal Service (Port 3002)
bazel run //apps/goal-service:goal-service

# Terminal 4: AI Service (Port 8000)
bazel run //apps/ai-service:ai-service

# Terminal 5: Frontend (Port 4000)
bazel run //apps/frontend:dev
```

Navigate to `http://localhost:4000`.

---

## 📂 Monorepo Structure

```plaintext
knowledge-hub-os/
├── apps/
│   ├── api-gateway/          # NestJS entry point & reverse proxy
│   │   └── BUILD.bazel       # → js_image_layer + oci_tarball
│   ├── auth-service/         # JWT Identity Provider + Redis blacklist
│   │   └── BUILD.bazel       # → js_image_layer + oci_tarball
│   ├── goal-service/         # Core User/Goal/Task business logic
│   │   └── BUILD.bazel       # → js_image_layer + oci_tarball
│   ├── ai-service/           # FastAPI + LangChain + Gemini
│   │   └── BUILD.bazel       # → pkg_tar + oci_tarball
│   └── frontend/             # Next.js App Router (standalone build)
│       └── BUILD.bazel       # → genrule(next build) + pkg_tar + oci_tarball
├── libs/
│   ├── database/             # Shared Prisma client (PostgreSQL)
│   ├── event_schemas/        # JSON Schemas → TS + Python codegen
│   ├── exceptions/           # Shared NestJS HttpExceptionFilter
│   └── security/             # Shared JwtAuthGuard + RedisService
├── docs/
│   ├── phase-1-workspace-initialization.md
│   ├── phase-2-polyglot-persistence.md
│   ├── phase-3-security-product-ai.md
│   └── phase-4-containerization.md    ← NEW
├── docker-compose.yml        # Production: all 5 services + Redis + Redpanda
├── MODULE.bazel              # Bazel deps (rules_oci, rules_pkg, rules_python…)
└── .env                      # Environment secrets (never commit)
```

---

## 📋 Docker Images Summary

| Image | Base | Size | Build Command |
|---|---|---|---|
| `knowledgehub/goal-service:latest` | distroless/nodejs20 | 495 MB | `bazel run //apps/goal-service:tarball` |
| `knowledgehub/auth-service:latest` | distroless/nodejs20 | 497 MB | `bazel run //apps/auth-service:tarball` |
| `knowledgehub/api-gateway:latest` | distroless/nodejs20 | 495 MB | `bazel run //apps/api-gateway:tarball` |
| `knowledgehub/ai-service:latest` | distroless/python3 | 408 MB | `bazel run //apps/ai-service:tarball` |
| `knowledgehub/frontend:latest` | distroless/nodejs20 | **196 MB** | `bazel run //apps/frontend:tarball` |

---

## 📚 Phase Documentation

| Phase | Doc | What Was Built |
|---|---|---|
| **Phase 1–6** | [phase-1-workspace-initialization.md](docs/phase-1-workspace-initialization.md) | Bazel workspace, pnpm, Python lockfile, cross-language contracts, NestJS scaffold, Kafka bridge |
| **Phase 7–8** | [phase-2-polyglot-persistence.md](docs/phase-2-polyglot-persistence.md) | PostgreSQL (Prisma), MongoDB Atlas, polyglot persistence |
| **Phase 9–10** | [phase-3-security-product-ai.md](docs/phase-3-security-product-ai.md) | JWT auth, Goal/Task product, RAG chatbot, agentic AI |
| **Phase 11–12** | [phase-4-containerization.md](docs/phase-4-containerization.md) | `rules_oci`, Distroless images, Docker Compose orchestration ✅ |

---

## 🗺️ Roadmap

- [x] **Workspace & Monorepo Setup** — Bazel, pnpm, pip-tools
- [x] **Cross-Language Contracts** — JSON Schema → TypeScript + Pydantic codegen
- [x] **Event-Driven Backbone** — Redpanda (Kafka) producer/consumer
- [x] **Polyglot Persistence** — Neon PostgreSQL + MongoDB Atlas
- [x] **Security Layer** — NestJS JWT Auth, Redis blacklist, shared guards
- [x] **Agentic AI Engine** — LangChain + Gemini "Architect" & "Coach"
- [x] **RAG Chatbot** — MongoDB Vector Search + semantic retrieval
- [x] **Production Containerization** — `rules_oci` + Distroless for all 5 services
- [x] **Production Orchestration** — Docker Compose with 3-tier networks + health checks
- [ ] **Observability Stack** — OpenTelemetry, Prometheus, Grafana
- [ ] **Cloud Deployment** — AWS ECS / Google Cloud Run
- [ ] **CI/CD Pipeline** — GitHub Actions with `bazel test` + `bazel build`

---

**Author:** Muhammed Nazal k
**License:** MIT
