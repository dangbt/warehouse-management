# ---------- build stage ----------
# Always build on the host arch — Vite output is static HTML/JS/CSS,
# no native binaries, so one build stage serves every target platform.
ARG BUILDPLATFORM
FROM --platform=$BUILDPLATFORM node:22-alpine AS build

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/ui-winforms/package.json packages/ui-winforms/

# Install web workspace + workspace deps
RUN npm ci -w @wms/web -w @wms/shared -w @wms/ui-winforms --include-workspace-root

# Lockfile chỉ chứa native binding của máy sinh ra nó (npm/cli#4828) → build
# trên arm64 (Apple Silicon, ARM VPS) thiếu rolldown/lightningcss/oxide binding.
COPY docker/ensure-native-bindings.mjs /tmp/ensure-native-bindings.mjs
RUN node /tmp/ensure-native-bindings.mjs /app

# Copy source for packages (web imports them as TS)
COPY packages/shared packages/shared
COPY packages/ui-winforms packages/ui-winforms

# Copy web source and build
COPY apps/web apps/web
RUN npm run build -w @wms/web

# ---------- nginx stage ----------
FROM nginx:alpine
LABEL org.opencontainers.image.source=https://github.com/dangbt/warehouse-management

# Remove default config
RUN rm /etc/nginx/conf.d/default.conf

COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/web/dist /usr/share/nginx/html

EXPOSE 80
