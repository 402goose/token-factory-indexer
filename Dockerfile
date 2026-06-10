# token-factory-indexer — Ponder running on Fly.
#
# SQLite lives at /data (mounted volume). Ponder is configured via env:
#   PONDER_RPC_URL_84532 — Base Sepolia RPC (public default ok for spike).
#   PORT                 — bound by Fly; we forward to ponder's --port.
#
# Two-stage build keeps the runtime image small.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ponder.config.ts ponder.schema.ts ./
COPY abis ./abis
COPY src ./src

FROM node:22-alpine AS run
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /app /app
ENV NODE_ENV=production
ENV PORT=8080
# Ponder writes pglite/sqlite to .ponder by default — we redirect via mount + symlink.
RUN mkdir -p /data && ln -s /data /app/.ponder
EXPOSE 8080
CMD ["sh", "-c", "node node_modules/ponder/dist/esm/bin/ponder.js start --port ${PORT} --schema ${DATABASE_SCHEMA:-tf}"]
