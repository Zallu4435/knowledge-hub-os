# 🚀 Deploying Knowledge Hub OS — Vercel + Render (Completely Free)

> **No credit card required.** This guide deploys the full stack using only
> free-tier services that work with GitHub sign-in only.

---

## 📋 Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Free Services You Need to Sign Up For](#2-free-services-you-need-to-sign-up-for)
3. [Prerequisites](#3-prerequisites)
4. [Step 1 — Set Up Upstash Redis (replaces local Redis)](#step-1--set-up-upstash-redis)
5. [Step 2 — Set Up Upstash Kafka (replaces Redpanda)](#step-2--set-up-upstash-kafka)
6. [Step 3 — Deploy Backend to Render](#step-3--deploy-backend-to-render)
7. [Step 4 — Set Environment Variables on Render](#step-4--set-environment-variables-on-render)
8. [Step 5 — Deploy Frontend to Vercel](#step-5--deploy-frontend-to-vercel)
9. [Step 6 — Connect Frontend ↔ Backend URLs](#step-6--connect-frontend--backend-urls)
10. [Step 7 — Test Your Deployment](#step-7--test-your-deployment)
11. [Free Tier Limitations & How to Handle Them](#free-tier-limitations--how-to-handle-them)
12. [Troubleshooting](#troubleshooting)

---

## 1. Architecture Overview

Your local `docker-compose` stack runs everything on one machine. In production,
each service runs on a different free cloud platform:

```
User's Browser
      │
      ▼
┌─────────────────────────────────────────┐
│  Vercel (FREE — Next.js Frontend)        │
│  https://knowledge-hub-os.vercel.app     │
└──────────────┬──────────────────────────┘
               │ API calls
       ┌───────┴──────────────────────────────────────────────┐
       │              Render.com (FREE)                        │
       │                                                       │
       │  ┌─────────────────┐  ┌─────────────────┐            │
       │  │  api-gateway    │  │  auth-service   │            │
       │  │  :3000          │  │  :3001          │            │
       │  └────────┬────────┘  └─────────────────┘            │
       │           │                                           │
       │  ┌────────┴────────┐  ┌─────────────────┐            │
       │  │  goal-service   │  │  ai-service     │            │
       │  │  :3002          │  │  (Python) :8000 │            │
       │  └─────────────────┘  └─────────────────┘            │
       └───────────────────────────────────────────────────────┘
               │ events                   │ reads/writes
       ┌───────┴──────────┐   ┌───────────┴────────────┐
       │  Upstash Kafka   │   │  Upstash Redis         │
       │  (FREE)          │   │  (FREE)                │
       └──────────────────┘   └────────────────────────┘

Always-free managed databases (already configured):
  • Neon Postgres   — DATABASE_URL  ✅
  • MongoDB Atlas   — MONGO_URI     ✅
  • Google Gemini   — GEMINI_API_KEY ✅
```

**What changes from local dev:**

| Local | Production |
|---|---|
| `redpanda` container | **Upstash Kafka** (managed, free) |
| `redis` container | **Upstash Redis** (managed, free) |
| `docker-compose up` | 4 × Render web services + Vercel |
| `localhost:XXXX` URLs | `https://xxx.onrender.com` URLs |

---

## 2. Free Services You Need to Sign Up For

> All of these support **GitHub sign-in** — no credit card, no email verification
> dance. Sign up once and you're done.

| Service | Purpose | Sign Up Link |
|---|---|---|
| **GitHub** | Host your code (you likely have this) | [github.com](https://github.com) |
| **Vercel** | Deploy Next.js frontend | [vercel.com](https://vercel.com) → "Continue with GitHub" |
| **Render** | Deploy 4 backend services | [render.com](https://render.com) → "GitHub" |
| **Upstash** | Free Redis + Kafka | [upstash.com](https://upstash.com) → "Login with GitHub" |

> **Already configured (no action needed):**
> - Neon Postgres (`DATABASE_URL` is in your `.env`)
> - MongoDB Atlas (`MONGO_URI` is in your `.env`)
> - Google Gemini (`GEMINI_API_KEY` is in your `.env`)

---

## 3. Prerequisites

Before you start, make sure you have these on your local computer:

```bash
# Check Node.js (need v18 or higher)
node --version    # Should show v18.x.x or v20.x.x

# Check Git
git --version

# Check pnpm
pnpm --version    # If missing: npm install -g pnpm
```

Your project must be **pushed to GitHub**. If it isn't yet:

```bash
cd knowledge-hub-os

# Initialize git (if not already done)
git init
git add .
git commit -m "Initial commit"

# Create a new repo on GitHub (github.com → New Repository)
# Then connect and push:
git remote add origin https://github.com/<YOUR_USERNAME>/knowledge-hub-os.git
git branch -M main
git push -u origin main
```

> ⚠️ **Important:** Make sure `.env` is in your `.gitignore`! Never push secrets to GitHub.
> Check: `cat .gitignore | grep .env` — it should appear.

---

## Step 1 — Set Up Upstash Redis

Upstash provides a free Redis database that replaces the `redis` Docker container.
**Free tier: 10,000 commands/day, 256MB data. No credit card.**

### 1.1 Create Upstash account + Redis database

1. Go to **[console.upstash.com](https://console.upstash.com)**
2. Click **"Login with GitHub"** → Authorize
3. Click **"Create Database"**
4. Fill in:
   - **Name:** `knowledge-hub-redis`
   - **Type:** Regional
   - **Region:** US-East-1 (or closest to you)
   - **TLS:** ✅ Enabled (keep on)
5. Click **"Create"**

### 1.2 Copy the Redis connection URL

After creation, you'll see a **"Redis"** tab with connection details:

1. Click **"Connect"** tab
2. Find the section **"ioredis"** or **"Node.js"**
3. Copy the connection string — it looks like:
   ```
   rediss://default:<PASSWORD>@<HOSTNAME>.upstash.io:6379
   ```
   > ⚠️ Note the `rediss://` (with double-s) — this means TLS/SSL encrypted.

4. **Save this URL** — you'll need it in Step 4.

---

## Step 2 — Set Up Upstash Kafka

Upstash provides free Kafka that replaces the `redpanda` Docker container.
**Free tier: 10,000 messages/day, 10MB/day. No credit card.**

### 2.1 Create a Kafka cluster

1. Go to **[console.upstash.com](https://console.upstash.com)** → Click **"Kafka"** in the sidebar
2. Click **"Create Cluster"**
3. Fill in:
   - **Name:** `knowledge-hub-kafka`
   - **Region:** US-East-1
4. Click **"Create Cluster"**

### 2.2 Create topics

After the cluster is created, click **"Topics"** → **"Create Topic"**:

Create these two topics (one at a time):

| Topic Name | Partitions | Retention |
|---|---|---|
| `user.events` | 1 | 1 day |
| `task.completed` | 1 | 1 day |

### 2.3 Get Kafka connection details

1. Click the **"Details"** tab on your cluster
2. Find **"Bootstrap Servers"** — copy this (looks like `<cluster>.upstash.io:9092`)
3. Find **"SASL Username"** and copy it
4. Find **"SASL Password"** and copy it (click the eye icon)

> You'll need the bootstrap server, username, and password in Step 4.

### 2.4 Update KafkaJS config to use SASL authentication

Upstash Kafka requires SASL authentication (unlike local Redpanda).
You need to update the Kafka client config in each NestJS service to support this.

Open **`apps/api-gateway/src/app.module.ts`** and update the Kafka client:

```typescript
// BEFORE (local Redpanda — no auth):
ClientsModule.register([{
  name: 'KAFKA_SERVICE',
  transport: Transport.KAFKA,
  options: {
    client: {
      brokers: [(process.env.KAFKA_BROKER_URL || 'localhost:9092')],
    },
    producerOnlyMode: true,
  },
}]),

// AFTER (Upstash Kafka — SASL auth added):
ClientsModule.register([{
  name: 'KAFKA_SERVICE',
  transport: Transport.KAFKA,
  options: {
    client: {
      brokers: [(process.env.KAFKA_BROKER_URL || 'localhost:9092')],
      ssl: process.env.NODE_ENV === 'production',
      sasl: process.env.KAFKA_SASL_USERNAME ? {
        mechanism: 'scram-sha-256',
        username: process.env.KAFKA_SASL_USERNAME,
        password: process.env.KAFKA_SASL_PASSWORD,
      } : undefined,
    },
    producerOnlyMode: true,
  },
}]),
```

Apply the **same change** to `apps/auth-service/src/auth.module.ts` and
`apps/goal-service/src/goal.module.ts`.

For the **AI service** (`apps/ai-service/main.py`), find the `AIOKafkaConsumer`
and `AIOKafkaProducer` calls and add SSL + SASL:

```python
# Find and update the Kafka consumer/producer in main.py to add:
consumer = AIOKafkaConsumer(
    'user.events', 'task.completed',
    bootstrap_servers=KAFKA_BROKER_URL,
    # Add these for Upstash:
    security_protocol="SASL_SSL" if os.getenv("KAFKA_SASL_USERNAME") else "PLAINTEXT",
    sasl_mechanism="SCRAM-SHA-256",
    sasl_plain_username=os.getenv("KAFKA_SASL_USERNAME", ""),
    sasl_plain_password=os.getenv("KAFKA_SASL_PASSWORD", ""),
    group_id='ai-service-group',
    auto_offset_reset='latest',
)
```

After making these changes, commit and push:

```bash
git add .
git commit -m "feat: add Upstash Kafka SASL support for production"
git push
```

---

## Step 3 — Deploy Backend to Render

Render will read the `render.yaml` file in your repository and automatically
create all 4 backend services.

### 3.1 Connect your GitHub repo to Render

1. Go to **[dashboard.render.com](https://dashboard.render.com)**
2. Click **"New +"** → **"Blueprint"**
3. Click **"Connect a repository"** → Authorize Render to access GitHub
4. Search for **`knowledge-hub-os`** → Click **"Connect"**
5. Render reads `render.yaml` and shows you a preview of 4 services

### 3.2 Apply the Blueprint

1. Review the 4 services listed:
   - `knowledge-hub-api-gateway`
   - `knowledge-hub-auth-service`
   - `knowledge-hub-goal-service`
   - `knowledge-hub-ai-service`
2. Click **"Apply"**

Render will start building all 4 Docker images simultaneously.

> ⏱️ **First build takes 5–10 minutes** per service because Docker images are
> being built from scratch. Subsequent deploys are faster (Docker layer cache).

### 3.3 Wait for the build to complete

You'll see each service show:
- 🟡 **"In progress"** — building Docker image
- 🟡 **"Deploying"** — starting the container
- 🔴 **"Failed"** — check logs (likely missing env vars — fix in Step 4)
- 🟢 **"Live"** — service is running

> It's **normal** for services to fail on the first deploy because environment
> variables haven't been set yet. Fix them in Step 4 and they'll auto-redeploy.

---

## Step 4 — Set Environment Variables on Render

Each service needs environment variables set in the Render dashboard.
Do this for **all 4 services**.

### 4.1 Go to a service's environment settings

1. In Render Dashboard → Click on a service (e.g., `knowledge-hub-auth-service`)
2. Click **"Environment"** in the left sidebar
3. Click **"Add Environment Variable"** for each variable below

### 4.2 Environment Variables for each service

> 💡 **Tip:** Variables shared across all services (DATABASE_URL, JWT_SECRET, etc.)
> can be put in a **Render Environment Group**:
> Dashboard → "Env Groups" → "New Environment Group" → add shared vars →
> then link the group to each service.

---

#### `knowledge-hub-api-gateway`

| Variable | Value | Where to get it |
|---|---|---|
| `DATABASE_URL` | `postgresql://...neon.tech/...` | Your local `.env` |
| `MONGO_URI` | `mongodb+srv://...` | Your local `.env` |
| `KAFKA_BROKER_URL` | `<cluster>.upstash.io:9092` | Upstash Kafka → Details |
| `KAFKA_SASL_USERNAME` | `<username>` | Upstash Kafka → Details |
| `KAFKA_SASL_PASSWORD` | `<password>` | Upstash Kafka → Details |
| `REDIS_URL` | `rediss://default:...upstash.io:6379` | Upstash Redis → Connect |
| `JWT_SECRET` | A strong random string | Run: `openssl rand -base64 32` |
| `JWT_EXPIRES_IN` | `1d` | Fixed value |
| `GEMINI_API_KEY` | `AIza...` | Your local `.env` |
| `ALLOWED_ORIGINS` | (fill in after Step 5) | Your Vercel URL |
| `NODE_ENV` | `production` | Fixed value |
| `PORT` | `3000` | Fixed value |
| `OTEL_TRACES_EXPORTER` | `none` | Fixed value (no Jaeger on Render) |

---

#### `knowledge-hub-auth-service`

| Variable | Value |
|---|---|
| `DATABASE_URL` | Same as api-gateway |
| `REDIS_URL` | Same as api-gateway |
| `KAFKA_BROKER_URL` | Same as api-gateway |
| `KAFKA_SASL_USERNAME` | Same as api-gateway |
| `KAFKA_SASL_PASSWORD` | Same as api-gateway |
| `JWT_SECRET` | **Must be identical** to api-gateway |
| `JWT_EXPIRES_IN` | `1d` |
| `ALLOWED_ORIGINS` | (fill in after Step 5) |
| `NODE_ENV` | `production` |
| `PORT` | `3001` |
| `OTEL_TRACES_EXPORTER` | `none` |

---

#### `knowledge-hub-goal-service`

| Variable | Value |
|---|---|
| `DATABASE_URL` | Same as api-gateway |
| `REDIS_URL` | Same as api-gateway |
| `KAFKA_BROKER_URL` | Same as api-gateway |
| `KAFKA_SASL_USERNAME` | Same as api-gateway |
| `KAFKA_SASL_PASSWORD` | Same as api-gateway |
| `JWT_SECRET` | **Must be identical** to api-gateway |
| `JWT_EXPIRES_IN` | `1d` |
| `ALLOWED_ORIGINS` | (fill in after Step 5) |
| `NODE_ENV` | `production` |
| `PORT` | `3002` |
| `OTEL_TRACES_EXPORTER` | `none` |

---

#### `knowledge-hub-ai-service`

| Variable | Value |
|---|---|
| `MONGO_URI` | Same as api-gateway |
| `KAFKA_BROKER_URL` | Same as api-gateway |
| `KAFKA_SASL_USERNAME` | Same as api-gateway |
| `KAFKA_SASL_PASSWORD` | Same as api-gateway |
| `GEMINI_API_KEY` | Your Gemini API key |
| `JWT_SECRET` | **Must be identical** to api-gateway |
| `ALLOWED_ORIGINS` | (fill in after Step 5) |
| `OTEL_TRACES_EXPORTER` | `none` |
| `PORT` | `8000` |
| `PYTHONUNBUFFERED` | `1` |

### 4.3 Trigger a redeploy

After setting all env vars for a service:

1. Click **"Manual Deploy"** → **"Deploy latest commit"**
2. Wait for the service to turn 🟢 **"Live"**

---

## Step 5 — Deploy Frontend to Vercel

### 5.1 Import your project

1. Go to **[vercel.com/new](https://vercel.com/new)**
2. Click **"Continue with GitHub"**
3. Find **`knowledge-hub-os`** in the list → Click **"Import"**
4. On the configuration screen:
   - **Framework Preset:** Next.js (auto-detected ✅)
   - **Root Directory:** `apps/frontend` ← **Important! Change this.**
   - **Build Command:** `pnpm build` (or leave as `next build`)
   - **Output Directory:** `.next` (default)

### 5.2 Set Vercel environment variables

Before clicking "Deploy", scroll down to **"Environment Variables"** and add:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_API_GATEWAY_URL` | `https://knowledge-hub-api-gateway.onrender.com` |
| `NEXT_PUBLIC_AUTH_URL` | `https://knowledge-hub-auth-service.onrender.com` |
| `NEXT_PUBLIC_GOAL_SERVICE_URL` | `https://knowledge-hub-goal-service.onrender.com` |
| `NEXT_PUBLIC_AI_SERVICE_URL` | `https://knowledge-hub-ai-service.onrender.com` |

> 💡 **To find your Render URLs:** In Render Dashboard, click on a service → 
> The URL is shown at the top (e.g., `https://knowledge-hub-api-gateway.onrender.com`).
> Replace the service name in the URL for each service.

### 5.3 Deploy

1. Click **"Deploy"**
2. Vercel builds and deploys your Next.js app (takes ~2 minutes)
3. When done, you'll see: 🎉 **"Your project has been deployed!"**
4. Click the preview link — your frontend is live!

**Your Vercel URL will look like:**
`https://knowledge-hub-os.vercel.app` or `https://knowledge-hub-os-<hash>.vercel.app`

---

## Step 6 — Connect Frontend ↔ Backend URLs

Now that both are deployed, you need to tell the backend services to allow
requests from your Vercel frontend URL.

### 6.1 Update CORS on all 4 Render services

1. Go to each Render service → **"Environment"**
2. Find `ALLOWED_ORIGINS`
3. Set it to your Vercel URL:
   ```
   https://knowledge-hub-os.vercel.app
   ```
   
   > If you have multiple Vercel preview URLs, separate them with commas:
   > `https://knowledge-hub-os.vercel.app,https://knowledge-hub-os-abc.vercel.app`

4. Click **"Save Changes"** — Render will auto-redeploy each service

### 6.2 Update Vercel environment variables (if URLs changed)

If any Render service URL is different from what you entered in Step 5:

1. Go to **[vercel.com/dashboard](https://vercel.com/dashboard)** → Your project
2. **Settings → Environment Variables**
3. Update each `NEXT_PUBLIC_*` URL with the correct Render URL
4. Go to **Deployments** → Click **"..."** on the latest → **"Redeploy"**

---

## Step 7 — Test Your Deployment

### 7.1 Test backend health endpoints

Open a terminal and run these `curl` commands (replace with your actual Render URLs):

```bash
# Test API Gateway
curl https://knowledge-hub-api-gateway.onrender.com/users/health
# Expected: {"status":"ok","service":"api-gateway","timestamp":"..."}

# Test Auth Service
curl https://knowledge-hub-auth-service.onrender.com/auth/health
# Expected: {"status":"ok","service":"auth-service","timestamp":"..."}

# Test Goal Service
curl https://knowledge-hub-goal-service.onrender.com/health
# Expected: {"status":"ok","service":"goal-service","timestamp":"..."}

# Test AI Service
curl https://knowledge-hub-ai-service.onrender.com/health
# Expected: {"status":"ok"} or similar
```

> ⚠️ **First request may take 30–60 seconds** if the service has "spun down"
> (Render free tier sleeps after 15 min of inactivity). This is normal — just wait.

### 7.2 Test authentication flow

```bash
# 1. Register a new user
curl -X POST https://knowledge-hub-auth-service.onrender.com/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!","role":"USER"}'
# Expected: {"access_token":"...", "user": {...}}

# 2. Login with the same user
curl -X POST https://knowledge-hub-auth-service.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}'
# Expected: {"access_token":"eyJhbGc..."}

# Copy the access_token from the response, then test a protected route:
curl -X GET https://knowledge-hub-goal-service.onrender.com/goals \
  -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
# Expected: [] (empty array, no goals yet — that's correct!)
```

### 7.3 Test the frontend

1. Open your Vercel URL in the browser
2. Try to register an account
3. Try to login
4. Create a goal
5. Open browser DevTools → Network tab → confirm API calls go to `onrender.com` URLs

### 7.4 Check Render logs for errors

If something isn't working:
1. Render Dashboard → Click the service → **"Logs"** tab
2. Look for `ERROR` lines
3. Common issues are listed in [Troubleshooting](#troubleshooting) below

---

## Free Tier Limitations & How to Handle Them

Understanding these limitations helps you work around them:

### ⚠️ Render Free Tier: Services "Spin Down" After 15 Minutes

**What happens:** If no one uses the service for 15 minutes, Render puts it to sleep.
The next request takes 30–60 seconds to "wake up" (cold start).

**Impact on your users:** First visit after inactivity feels slow.

**Solutions (choose one):**

1. **Accept it** — for personal projects this is fine. Tell users "give it a moment."

2. **Keep-alive ping (free)** — use a free service like [UptimeRobot](https://uptimerobot.com)
   to ping your health endpoint every 5 minutes:
   - Sign up at [uptimerobot.com](https://uptimerobot.com) (free, no CC)
   - Add a new monitor: **HTTP(s)**, URL = `https://knowledge-hub-api-gateway.onrender.com/users/health`
   - Interval: **5 minutes**
   - Repeat for all 4 services
   
   This prevents spin-down entirely on the free tier!

3. **Upgrade to Render "Starter" ($7/month per service)** — services never sleep.

### ⚠️ Upstash Kafka: 10,000 Messages/Day Limit

**What happens:** After 10,000 Kafka messages in a day, new events are dropped.

**Impact:** Task completion events stop triggering AI processing after the limit.

**Solutions:**
- For personal/demo use, 10,000 messages/day is more than enough (~6 messages/minute)
- Monitor usage in the Upstash dashboard → Kafka → your cluster → "Usage"

### ⚠️ Upstash Redis: 10,000 Commands/Day Limit

**What happens:** After 10,000 Redis commands, JWT blacklisting may fail silently.

**Solutions:**
- For personal use, this is plenty (each logout = 1 Redis command)
- Monitor usage in Upstash dashboard → Redis → your database → "Usage"

### ⚠️ Vercel: 100GB Bandwidth/Month

**What happens:** After 100GB of bandwidth, the site goes down until the month resets.

**Impact:** Extremely unlikely for a personal project. A 10MB page load at 10,000 visits = 100GB.

### ⚠️ Render: Build Minutes Limit

Render free tier includes **500 build minutes/month**. Each Docker build takes
~5–10 minutes (or faster with layer cache). You get ~50–100 deploys/month.

---

## Troubleshooting

### ❌ "Service failed to start" on Render

**Check the logs** (Render → service → Logs). Common causes:

**Missing environment variable:**
```
Error: DATABASE_URL must be set
```
→ Go to the service's Environment tab and add the missing variable.

**Port mismatch:**
```
Error: listen EADDRINUSE 0.0.0.0:3000
```
→ Make sure `PORT` env var matches the port in your Dockerfile (`EXPOSE 3000`).

**Prisma client not generated:**
```
Error: Cannot find module '@prisma/client'
```
→ The Dockerfile runs `prisma generate` but if `DATABASE_URL` isn't set at build time, it may fail silently. Add `DATABASE_URL` as a build env var in Render → "Environment" → toggle "Available during build time".

---

### ❌ CORS error in browser console

```
Access to fetch at 'https://xxx.onrender.com' from origin 
'https://xxx.vercel.app' has been blocked by CORS policy
```

**Fix:** Make sure `ALLOWED_ORIGINS` on ALL 4 Render services is set to your exact Vercel URL. No trailing slash.

```
# Correct:
ALLOWED_ORIGINS=https://knowledge-hub-os.vercel.app

# Wrong:
ALLOWED_ORIGINS=https://knowledge-hub-os.vercel.app/   ← trailing slash!
ALLOWED_ORIGINS=http://knowledge-hub-os.vercel.app     ← http not https!
```

---

### ❌ "Failed to fetch" or Network Error in frontend

**Cause 1:** The Render service is waking up (cold start). **Wait 60 seconds and retry.**

**Cause 2:** Wrong URL in Vercel env vars.
→ Vercel Dashboard → Settings → Environment Variables → verify all `NEXT_PUBLIC_*` URLs

**Cause 3:** The Render service crashed. → Check Render logs.

---

### ❌ Kafka / Upstash connection errors

```
KafkaJSConnectionError: Connection timeout
```

**Check:**
1. `KAFKA_BROKER_URL` — must be `<cluster>.upstash.io:9092` (NOT `localhost:9092`)
2. `KAFKA_SASL_USERNAME` and `KAFKA_SASL_PASSWORD` — copy from Upstash dashboard
3. Did you update the KafkaJS config to include SASL? (See Step 2.4)

---

### ❌ Redis connection errors

```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Fix:** `REDIS_URL` is still pointing to `localhost`. Update it to:
```
rediss://default:<password>@<host>.upstash.io:6379
```
Note the `rediss://` (double-s = TLS).

---

### ❌ Vercel build fails: "Cannot find module"

**Cause:** Vercel is building from the wrong directory.

**Fix:**
1. Vercel Dashboard → Project → Settings → **General** → "Root Directory"
2. Set it to `apps/frontend`
3. Redeploy

---

### ❌ AI Service: Gemini API errors

```
PERMISSION_DENIED: API key not valid
```

→ Check `GEMINI_API_KEY` is set correctly on the ai-service in Render.
→ Verify the key is still valid at [aistudio.google.com](https://aistudio.google.com).

---

### 🔍 How to Check if Everything Is Connected

Run this checklist after deployment:

```bash
# Replace URLs with your actual Render service URLs

echo "=== 1. Backend Health Checks ==="
curl -s https://knowledge-hub-api-gateway.onrender.com/users/health | python3 -m json.tool
curl -s https://knowledge-hub-auth-service.onrender.com/auth/health | python3 -m json.tool
curl -s https://knowledge-hub-goal-service.onrender.com/health | python3 -m json.tool
curl -s https://knowledge-hub-ai-service.onrender.com/health | python3 -m json.tool

echo ""
echo "=== 2. Register Test User ==="
TOKEN=$(curl -s -X POST https://knowledge-hub-auth-service.onrender.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token','FAILED'))")
echo "Token: ${TOKEN:0:20}..."

echo ""
echo "=== 3. Test Protected Route ==="
curl -s https://knowledge-hub-goal-service.onrender.com/goals \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

echo ""
echo "✅ If you see valid JSON responses above, deployment is working!"
```

---

## 📁 Files Added for Deployment

This guide works with the following files already present in the repo:

```
render.yaml                         ← Render Blueprint (all 4 backend services)
apps/api-gateway/Dockerfile         ← Docker build for Render
apps/auth-service/Dockerfile        ← Docker build for Render
apps/goal-service/Dockerfile        ← Docker build for Render
apps/ai-service/Dockerfile          ← Docker build for Render
.env.prod.example                   ← Template for production environment vars
```

---

## 🔄 Deploying Updates

Every time you push code to `main`, GitHub Actions CI runs tests and builds
Docker images. Then:

**For Render:** Services auto-deploy when GitHub Actions pushes new images
(if you connected Render to GitHub). Or manually trigger: Render → service → "Manual Deploy."

**For Vercel:** Frontend auto-deploys on every push to `main`. No action needed.

---

## 💰 Cost Summary

| Service | Plan | Cost |
|---|---|---|
| Vercel (frontend) | Hobby | **$0/month** |
| Render (4 web services) | Free | **$0/month** |
| Upstash Redis | Free | **$0/month** |
| Upstash Kafka | Free | **$0/month** |
| Neon Postgres | Free | **$0/month** |
| MongoDB Atlas | Free M0 | **$0/month** |
| Google Gemini API | Free quota | **$0/month** |
| **Total** | | **$0.00/month** |

> All free tiers are **permanent** (not time-limited trials), except:
> - Render free services sleep after 15 min inactivity (fixable with UptimeRobot)
> - Upstash Kafka has a 10k message/day limit
