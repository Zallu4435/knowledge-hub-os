# ============================================================
# Dockerfile — auth-service  |  Build context: repo ROOT
# ============================================================
FROM node:20-slim AS builder
WORKDIR /workspace

RUN npm install -g pnpm@8

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY libs/ ./libs/
COPY apps/auth-service/ ./apps/auth-service/
RUN pnpm exec prisma generate --schema=libs/database/schema.prisma

RUN pnpm exec tsc \
    --project apps/auth-service/tsconfig.json \
    --outDir dist \
    --rootDir . \
    --baseUrl . \
    --skipLibCheck

RUN mkdir -p dist/libs/database/src/generated && \
    cp libs/database/schema.prisma dist/libs/database/ || true && \
    cp -r libs/database/src/generated/* dist/libs/database/src/generated/ || true

# ── Runtime ────────────────────────────────────────────────
FROM node:20-slim
WORKDIR /app

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/dist ./dist
COPY --from=builder /workspace/package.json ./

EXPOSE 3001
CMD ["node", "dist/apps/auth-service/src/main.js"]
