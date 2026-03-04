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

# Generate Prisma client using the correct schema path
# DATABASE_URL is not needed at build time for generate
RUN pnpm exec prisma generate --schema=libs/database/schema.prisma

# Compile TypeScript from monorepo root so relative imports
# (../../../libs/...) resolve correctly in the output tree
RUN pnpm exec tsc \
    --project apps/api-gateway/tsconfig.json \
    --outDir dist \
    --rootDir . \
    --baseUrl . \
    --skipLibCheck

# Ensure Prisma engines (.node/schema) are available in the transpile output directory
RUN cp libs/database/schema.prisma dist/libs/database/ || true && \
    cp libs/database/src/generated/*.node dist/libs/database/src/generated/ || true && \
    cp libs/database/src/generated/schema.prisma dist/libs/database/src/generated/ || true

# ── Runtime ────────────────────────────────────────────────
FROM node:20-slim
WORKDIR /app

COPY --from=builder /workspace/node_modules ./node_modules
COPY --from=builder /workspace/dist ./dist
COPY --from=builder /workspace/package.json ./

# Render injects PORT; the service listens on process.env.PORT
EXPOSE 3000
CMD ["node", "dist/apps/api-gateway/src/main.js"]
