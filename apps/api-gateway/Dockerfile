# ============================================================
# Dockerfile — api-gateway  |  Build context: repo ROOT
# ============================================================
FROM node:20-slim AS builder
WORKDIR /workspace

RUN npm install -g pnpm@8

# Install deps from lockfile (cached layer)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source needed for this service
COPY tsconfig.json ./
COPY libs/ ./libs/
COPY apps/api-gateway/ ./apps/api-gateway/

# Copy Prisma schema and generate client
# DATABASE_URL is not needed at build time for generate
COPY prisma/ ./prisma/
RUN pnpm exec prisma generate

# Compile TypeScript from monorepo root so relative imports
# (../../../libs/...) resolve correctly in the output tree
RUN pnpm exec tsc \
    --project apps/api-gateway/tsconfig.json \
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

# Render injects PORT; the service listens on process.env.PORT
EXPOSE 3000
CMD ["node", "dist/apps/api-gateway/src/main.js"]
