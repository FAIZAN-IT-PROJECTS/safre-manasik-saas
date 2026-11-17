# ─── Stage 1: Builder ─────────────────────────────────────────────────────
# NOTE: Prod deploys on Railway use NIXPACKS (see railway.json / railway.toml).
# This Dockerfile is a fallback for local docker + any Dockerfile-builder env.
# Base is Bookworm, not Bullseye: Bullseye is EOL so its apt mirrors no longer
# resolve the Chromium/font packages below (the cause of the failed build).
FROM node:18-bookworm-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma

RUN npm ci --only=production && npm cache clean --force
RUN npx prisma generate

# ─── Stage 2: Runtime ─────────────────────────────────────────────────────
FROM node:18-bookworm-slim AS runtime

# Chromium + fonts for Puppeteer (voucher PDF generation)
RUN apt-get update && apt-get install -y --no-install-recommends \
    openssl ca-certificates \
    chromium \
    fonts-liberation fonts-noto fonts-noto-cjk fonts-noto-color-emoji fonts-dejavu \
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libxkbcommon0 \
    libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
    libasound2 libcairo2 libgtk-3-0 \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Non-root user (Railway runs containers as non-root by default)
RUN groupadd -r app && useradd -r -g app -m -d /home/app app

WORKDIR /app

COPY --from=builder --chown=app:app /app/node_modules ./node_modules
COPY --from=builder --chown=app:app /app/prisma ./prisma
COPY --chown=app:app . .

RUN mkdir -p /app/logs /app/uploads && chown -R app:app /app/logs /app/uploads

USER app

# Railway sets $PORT. Default to 5000 for local docker-compose.
ENV PORT=5000
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "require('http').get('http://localhost:'+(process.env.PORT||5000)+'/health', r => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Schema changes are applied by src/bootstrap.js (raw ALTER ... IF NOT EXISTS on
# boot) — NOT prisma db push: the prisma CLI is a devDependency and is absent
# from the production image, so `prisma db push` here crash-loops the container
# (prod outage 2026-07-05). Just start the server; bootstrap runs on startup.
CMD ["node", "src/server.js"]
