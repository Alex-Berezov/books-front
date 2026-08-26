# syntax=docker/dockerfile:1.7
ARG NODE_VERSION=20-alpine

# ── Stage 1: Install dependencies ──────────────────────────────
FROM node:${NODE_VERSION} AS deps
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile --production=false

# ── Stage 2: Build the application ─────────────────────────────
FROM node:${NODE_VERSION} AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_BASE_URL
ARG NEXT_PUBLIC_SITE_URL
ARG NEXT_PUBLIC_DEFAULT_LANG=en
ARG NEXT_PUBLIC_GA_MEASUREMENT_ID
# Хост медиа-CDN нужен именно на сборке: из него `next.config.js` строит запись
# в `images.remotePatterns`, а тот вычисляется один раз, когда собирается образ.
# Не передашь сюда — в образе останется только статическая запись (LEGACY-279).
ARG NEXT_PUBLIC_MEDIA_CDN_URL

ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL} \
    NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_PUBLIC_DEFAULT_LANG=${NEXT_PUBLIC_DEFAULT_LANG} \
    NEXT_PUBLIC_GA_MEASUREMENT_ID=${NEXT_PUBLIC_GA_MEASUREMENT_ID} \
    NEXT_PUBLIC_MEDIA_CDN_URL=${NEXT_PUBLIC_MEDIA_CDN_URL} \
    NEXT_TELEMETRY_DISABLED=1

RUN yarn build

# ── Stage 3: Production runner ─────────────────────────────────
FROM node:${NODE_VERSION} AS runner
WORKDIR /app

# Identifies the running build to the post-deploy audit — see app/api/version.
# Runtime value, not a NEXT_PUBLIC_ one: it must describe the container, not be
# inlined into the client bundle.
ARG APP_COMMIT_SHA=unknown

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    APP_COMMIT_SHA=${APP_COMMIT_SHA}

RUN addgroup -S app && adduser -S app -G app

# Copy standalone server and static assets
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public

USER app
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/ >/dev/null 2>&1 || exit 1

CMD ["node", "server.js"]
