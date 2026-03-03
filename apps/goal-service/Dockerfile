# ============================================================
# Dockerfile — goal-service  |  Build context: repo ROOT
# ============================================================
FROM node:20-slim AS builder
WORKDIR /workspace

RUN npm install -g pnpm@8

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY libs/ ./libs/
COPY apps/goal-service/ ./apps/goal-service/
COPY prisma/ ./prisma/
RUN pnpm exec prisma generate

RUN pnpm exec tsc \
    --project apps/goal-service/tsconfig.json \
    --outDir dist \
    --rootDir . \
    --baseUrl . \
    --skipLibCheck

# ── Runtime ────────────────────────────────────────────────
FROM node:20-slim
WORKDIR /app

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/dist ./dist
COPY --from=builder /workspace/prisma ./prisma
COPY --from=builder /workspace/package.json ./

EXPOSE 3002
CMD ["node", "dist/apps/goal-service/src/main.js"]
