# 🚀 Knowledge Hub OS: Phase 3 - Security, Core Product, & Agentic AI

This phase marks the transition from **Platform Engineering** to **Product Development**. We took the foundational polyglot Bazel monorepo and built a fully functional, secure productivity application backed by an autonomous, event-driven AI workflow and a Vector RAG (Retrieval-Augmented Generation) engine.

## 🏗️ Architectural Upgrades

In this phase, we expanded the microservice ecosystem and locked down the perimeters.

### 1. The Security Layer (Identity & Access)
*   **Auth Service (NestJS - Port 3001)**: A dedicated microservice handling user registration and authentication.
    *   Implemented **bcrypt** for secure PostgreSQL password hashing.
    *   Implemented stateless **JSON Web Tokens (JWT)** for session management.
    *   Wired as a Kafka Producer to emit `user.events` upon successful registration.
*   **Shared Security Library (libs/security)**: A Bazel-managed shared module containing a `JwtAuthGuard`. This allows any NestJS microservice in the monorepo to instantly secure its endpoints using the exact same verification logic.
*   **Next.js Edge Middleware**: A frontend bouncer that runs on the Edge, checking for HTTP-only JWT cookies and automatically redirecting unauthenticated users to `/login`.

### 2. The Core Product (Productivity Engine)
*   **Goal Service (NestJS - Port 3002)**: The heart of the user workspace.
    *   Upgraded the Prisma PostgreSQL schema with relational **User → Goal → Task** models.
    *   Provides RESTful endpoints to create goals and complete tasks.
    *   Wired as a Kafka Producer to emit strictly-typed `task.completed` events into the event stream.

### 3. The Frontend Command Center (Next.js - Port 4000)
*   **Auth UIs (`/login`, `/register`)**: Secure forms that communicate with the Auth Service and manage client-side token storage.
*   **Workspace Dashboard (`/dashboard`)**: A Kanban-style interface that fetches user-specific goals and allows for optimistic UI updates when marking tasks as "DONE".
*   **AI Intelligence Feed (`/insights`)**: A server-side rendered feed that visually distinguishes between generated "Career Roadmaps" and active "Productivity High-Fives."
*   **Global Navigation**: Persistent, client-side routed navigation bar with a premium dark-mode ("Void") aesthetic.

---

## 🧠 The Agentic AI & RAG Engine

We transformed the passive Python FastAPI service (Port 8000) into a multi-dimensional, secure AI Agent using **LangChain** and **Google Gemini**.

*   **Multi-Topic Kafka Consumer**: The `aiokafka` consumer now simultaneously listens to:
    *   `user.events`: Triggers "The Architect" prompt to generate 30-day career roadmaps.
    *   `task.completed`: Triggers "The Coach" prompt to generate contextual congratulations and micro-tips.
*   **Polyglot JWT Verification**: The FastAPI service was updated with a `PyJWT` dependency to cryptographically verify the exact same NestJS-issued tokens, ensuring users can only fetch their own AI insights.
*   **Vector Search (RAG)**:
    *   Integrated `GoogleGenerativeAIEmbeddings` to convert AI insights into 768-dimensional mathematical vectors.
    *   Configured **MongoDB Atlas Vector Search** to index and query these embeddings.
    *   Built a dedicated **AI Chat Interface (`/chat`)** where users can query their historical task data, allowing Gemini to give personalized advice based on their past accomplishments.

---

## 🔄 The Complete Event Loop ("A Day in the Life")

1.  **Action**: The user logs into the Next.js frontend and clicks "Complete" on a task in their `/dashboard`.
2.  **Relational State**: Next.js securely `PATCH`es the Goal Service (NestJS), which updates the rigid state in PostgreSQL.
3.  **Asynchronous Stream**: The Goal Service fires a `task.completed` event into the Kafka (Redpanda) broker. The frontend UI updates instantly without waiting.
4.  **Agentic Interception**: The FastAPI (Python) brain catches the Kafka event.
5.  **Generative AI**: Python uses LangChain to ping **Google Gemini**, asking it to act as a Productivity Coach based on the completed task.
6.  **Vectorization & Storage**: Python converts Gemini's response into a Vector Embedding and saves it to MongoDB Atlas.
7.  **Retrieval**: The user navigates to the `/chat` page and asks for advice. Python performs a similarity search against MongoDB, pulls their past completed tasks, and Gemini uses that context to answer.

---

## 🛠️ Environment Configuration Updates

To run Phase 3, the following additions were made to the `.env` file:

```env
# Existing
DATABASE_URL="postgresql://..."
MONGO_URI="mongodb+srv://..."

# New Additions
JWT_SECRET="your-super-secret-key"
GEMINI_API_KEY="AIzaSy..."
```

> **MongoDB Atlas Requirement**: A Vector Search Index named `vector_index` must be created on the `knowledge_hub.user_insights` collection using the `embedding` path (768 dimensions, cosine similarity).

---

## ⚠️ Error Ledger (Part 3)

### ⚠️ Error 14: Model Model Resolution (404 Not Found)
*   **Error Message**: `NotFound: 404 models/gemini-1.5-flash is not found for API version v1beta`
*   **Root Cause**: The Google Gemini API strictly requires the `models/` prefix for some SDK versions or specific newer models.
*   **Fix**: Updated the model strings in the Python AI Service to use the full path: `models/gemini-2.0-flash`.

### ⚠️ Error 15: Resource Exhaustion (Quota Exceeded)
*   **Error Message**: `429 You exceeded your current quota, please check your plan and billing details.`
*   **Root Cause**: Rapid testing of multiple Gemini models (2.0-flash-exp, 3-flash, etc.) triggered the rate limits of the Google Free Tier.
*   **Fix**: Implemented `max_retries=0` in testing scripts to fail fast, and standardized the service on `models/gemini-2.0-flash` for high performance within free usage limits.

---

**What an incredible milestone.** You now have a fully functional, highly complex enterprise system running locally. The absolute final piece of the puzzle is taking this architecture and containerizing it for the cloud.
