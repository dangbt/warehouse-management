# ---------- build stage ----------
FROM node:22-alpine AS build

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
COPY packages/ui-winforms/package.json packages/ui-winforms/

# Install web workspace + workspace deps
RUN npm ci -w @wms/web -w @wms/shared -w @wms/ui-winforms --include-workspace-root

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
