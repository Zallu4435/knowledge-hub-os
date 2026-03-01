# Phase 2: Polyglot Persistence (The Database Layer)

With the event backbone established, the next architectural requirement was giving the microservices state. We implemented a polyglot persistence strategy:

- **Relational Source of Truth**: PostgreSQL (Neon) for strict, structured data (Users) accessed via the NestJS Gateway.
- **Unstructured Document Store**: MongoDB (Atlas) for flexible, hierarchical AI insights accessed via the Python FastAPI service.

## Step 1: The Relational Core (NestJS + PostgreSQL via Prisma)
We created a shared database library to allow any future TypeScript microservice to easily import the Prisma client.

### 1. Install Prisma ORM into the Bazel Workspace

```bash
pnpm add -w -D prisma
pnpm add -w @prisma/client
bazel fetch @npm//...
```

### 2. Initialize the Shared Database Library

```bash
pnpm exec prisma init --schema=libs/database/schema.prisma
```

### 3. Define the Database Schema (`libs/database/schema.prisma`)
We defined a `User` model that perfectly mirrored our `UserCreatedEvent` Kafka contract.

```prisma
generator client {
  provider = "prisma-client-js"
  output   = "../../node_modules/@prisma/client"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  role      String   @default("user")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@map("users")
}
```

### 4. Generate & Push to Neon Serverless Postgres
Added `DATABASE_URL` to the root `.env` file, then synchronized the remote database and generated the local strictly-typed client:

```bash
npx prisma db push --schema=libs/database/schema.prisma
npx prisma generate --schema=libs/database/schema.prisma
```

### 5. Create the Shared Prisma Service (`libs/database/src/prisma.service.ts`)
Wrapped the generated `PrismaClient` in a NestJS Injectable service to handle connection lifecycles.

### 6. Wire Postgres into the API Gateway
Updated `apps/api-gateway/BUILD.bazel` to depend on the new `//libs/database:database_lib`. Modified the `AppController` so that upon receiving a POST request, it first persists the user to PostgreSQL, generates a unique DB ID, and then emits the Kafka event.

## Step 2: The Unstructured Data Store (FastAPI + MongoDB Atlas)
The AI service requires a flexible schema to store dynamically generated AI insights and career roadmaps.

### 1. Install MongoDB Async Driver & Dotenv
We updated the Python lockfile to include `motor` (the async MongoDB driver) and `python-dotenv` to read the shared workspace credentials.

```bash
# apps/ai-service/requirements.in
aiokafka==0.10.0
fastapi
uvicorn
pydantic
motor
python-dotenv
```
Re-compiled the lockfile using pip-tools and ran `bazel fetch @pip//...`.

### 2. Update AI Service (`apps/ai-service/main.py`)
Integrated MongoDB into the Kafka consumer loop. When an event is pulled from Kafka and validated by Pydantic, the service generates an AI insight and asynchronously inserts the document into MongoDB Atlas.

```python
import os
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

# Load workspace credentials
load_dotenv("../../.env")
MONGO_URI = os.getenv("MONGO_URI")
client = AsyncIOMotorClient(MONGO_URI)
db = client.knowledge_hub
insights_collection = db.user_insights

# Inside the Kafka consumer loop:
insight_data = {
    "userId": event.data.userId,
    "email": event.data.email,
    "role": event.data.role,
    "ai_summary": f"User {event.data.userId} has joined as {event.data.role}. Initializing career roadmap.",
    "processed_at": event.timestamp
}
result = await insights_collection.insert_one(insight_data)
```

## ⚠️ Error Ledger (Part 2)

### ⚠️ Error 13: Pydantic Strict Type Validation Rejection

**Error Message:** `pydantic_core._pydantic_core.ValidationError: 1 validation error for UserCreatedEvent eventId Input should be a valid UUID...` (Silent failure on the AI Service consumer side).

**Root Cause:** During the end-to-end test, the API Gateway successfully saved the user to Postgres and emitted the Kafka event using a mock ID: `"eventId": "db-test-001"`. However, the auto-generated Python `UserCreatedEvent` model strictly enforced the UUID format defined in our original JSON schema. Pydantic accurately rejected the text string as junk data.

**Fix:** Updated the curl test payload to use a compliant UUID version 4 (e.g., `550e8400-e29b-41d4-a716-446655440000`). This validated the integrity of our cross-language contract system—preventing malformed data from entering the AI database.

## 🎯 Final End-to-End Verification (The "Holy Trinity" Achieved)
We successfully verified the entire data lifecycle across three distinct systems via Bazel:

- **Terminal 1 (Redpanda Broker)**: Running via Docker Compose on port 9092.
- **Terminal 2 (AI Service)**: Running `bazel run //apps/ai-service:ai-service`.
- **Terminal 3 (API Gateway)**: Running `bazel run //apps/api-gateway:api-gateway`.
- **Terminal 4 (Trigger)**:

```bash
curl -X POST "http://localhost:3000/users" \
     -H "Content-Type: application/json" \
     -d '{
           "eventId": "550e8400-e29b-41d4-a716-446655440000",
           "timestamp": "2026-03-01T12:00:00Z",
           "data": {
             "userId": "polyglot_user_01",
             "email": "polyglot@example.com",
             "role": "developer"
           }
         }'
```

**Results Logged:**

- **NestJS (Postgres)**: `💾 User Saved to Postgres: e2637434-b9a9-49cc-b379-b245dae6862f`
- **API Gateway Response**: `{"status":"User Created & Published","db_id":"e2637434...","kafka_eventId":"550e8400..."}`
- **FastAPI (Mongo)**: `🔮 AI Insight Saved to MongoDB: 69a452f7510869448cd346e9`

**Conclusion**: We have successfully established a production-ready, event-driven polyglot architecture. The foundational infrastructure is 100% complete.
