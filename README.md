# 🧠 Knowledge Hub OS

Knowledge Hub OS is an event-driven, polyglot productivity platform and autonomous AI coaching engine.

Built as a strict monorepo orchestrated by **Bazel**, this system bridges a rigid relational backend (PostgreSQL) with a flexible, intelligent NoSQL brain (MongoDB/Vector Search) using a real-time event streaming backbone (Kafka).

---

## ✨ Key Features

*   **Polyglot Microservices**: TypeScript (NestJS) handles strict relational business logic, while Python (FastAPI) handles data science, LLM integration, and vector mathematics.
*   **Event-Driven Architecture**: Complete decoupling of services. The frontend never waits for the AI. User actions trigger asynchronous Kafka events (`task.completed`, `user.events`) that wake up background workers.
*   **Cross-Language Type Safety**: A single source of truth. JSON Schemas are automatically compiled by Bazel into strict TypeScript Interfaces and Python Pydantic models.
*   **Agentic AI Workflows**:
    *   **The Architect**: Generates 30-day technical roadmaps upon user onboarding.
    *   **The Coach**: Watches the Kafka stream and generates contextual "High-Fives" and productivity tips when users complete tasks.
*   **RAG-Powered Chatbot**: MongoDB Atlas Vector Search processes user history, allowing users to query their own productivity data via an intelligent LLM interface.
*   **Enterprise Security**: Cross-service stateless JWT authentication with Edge Middleware protection on the Next.js frontend.

---

## 🏗️ System Architecture

### The Tech Stack
*   **Frontend**: Next.js (App Router, React Server Components), Tailwind CSS, TypeScript.
*   **Backend Services**: NestJS, Prisma ORM.
*   **AI Service**: FastAPI, LangChain, Google Gemini 2.0 Flash / Embeddings, PyJWT.
*   **Databases**: Neon (Serverless PostgreSQL), MongoDB Atlas (Document & Vector Store).
*   **Message Broker**: Redpanda (Kafka-compatible).
*   **Build System**: Bazel (Bzlmod) for deterministic, hermetic builds.

### The Event Loop
1.  **Action**: User logs in and marks a task as "Done" via the Next.js dashboard.
2.  **State Update**: The request hits the NestJS Goal Service, which updates the official state in PostgreSQL.
3.  **Event Emission**: NestJS immediately fires a strictly-typed `task.completed` event into the Kafka broker and returns a success response to the UI.
4.  **AI Interception**: The Python FastAPI worker consumes the event off the stream.
5.  **Intelligence Generation**: FastAPI injects the context into LangChain, calls Google Gemini, embeds the response into a mathematical vector, and saves it to MongoDB.
6.  **Real-Time Retrieval**: The Next.js frontend fetches the generated insights via Server Components, or queries them semantically via the RAG Chatbot.

---

## 🚀 Getting Started

### Prerequisites
*   Bazel (v7+ with Bzlmod enabled)
*   Node.js (v18.17.1+) & pnpm
*   Python (3.11+)
*   Docker & Docker Compose (for Redpanda Kafka)
*   API Keys: Neon Postgres, MongoDB Atlas, Google Gemini.

### Local Setup

1.  **Clone the repository**
    ```bash
    git clone https://github.com/yourusername/knowledge-hub-os.git
    cd knowledge-hub-os
    ```

2.  **Environment Configuration**
    Create a `.env` file in the root directory:
    ```env
    DATABASE_URL="postgresql://[USER]:[PASSWORD]@[NEON_HOST]/knowledge_hub?sslmode=require"
    MONGO_URI="mongodb+srv://[USER]:[PASSWORD]@[CLUSTER_URL]/?retryWrites=true&w=majority"
    JWT_SECRET="your-super-secret-development-key"
    GEMINI_API_KEY="AIzaSy..."
    ```
    > **Note**: Ensure you have created a Vector Search Index named `vector_index` in your MongoDB Atlas `user_insights` collection.

3.  **Start the Kafka Broker**
    ```bash
    docker-compose up -d
    ```

4.  **Run Database Migrations**
    ```bash
    npx prisma db push --schema=libs/database/schema.prisma
    npx prisma generate --schema=libs/database/schema.prisma
    ```

5.  **Spin up the Monorepo via Bazel**
    Open multiple terminal tabs to run the services deterministically through the Bazel sandbox:
    ```bash
    # Terminal 1: API Gateway (Port 3000)
    bazel run //apps/api-gateway:api-gateway

    # Terminal 2: Auth Service (Port 3001)
    bazel run //apps/auth-service:auth-service

    # Terminal 3: Goal Service (Port 3002)
    bazel run //apps/goal-service:goal-service

    # Terminal 4: AI Brain Service (Port 8000)
    bazel run //apps/ai-service:ai-service

    # Terminal 5: Next.js Frontend (Port 4000)
    bazel run //apps/frontend:dev
    ```
    Navigate to `http://localhost:4000` to access the application.

---

## 📂 Monorepo Structure

```plaintext
knowledge-hub-os/
├── apps/
│   ├── api-gateway/       # NestJS entry point
│   ├── auth-service/      # JWT Identity Provider
│   ├── goal-service/      # Core relational business logic
│   ├── ai-service/        # FastAPI / LangChain workers
│   └── frontend/          # Next.js App Router UI
├── libs/
│   ├── database/          # Shared Prisma client
│   ├── event_schemas/     # JSON schemas & auto-generated contracts
│   └── security/          # Shared JWT Auth Guards
├── MODULE.bazel           # Bazel dependencies
└── .env                   # Environment secrets
```

---

## 🗺️ Roadmap / Future Enhancements

*   [ ] **Production Containerization**: Implement Bazel `rules_oci` to instantly package NestJS, Next.js, and Python services into Distroless Docker images.
*   [ ] **Observability Stack**: Integrate OpenTelemetry, Prometheus, and Jaeger for distributed tracing across the Kafka event streams.
*   [ ] **Cloud Deployment**: Migrate local Redpanda to Confluent Cloud and deploy containers to AWS ECS / Google Cloud Run.

---

**Author:** Muhammed Nazal k   
**License:** MIT
