# ---------- build stage ----------
FROM node:22-alpine AS build

WORKDIR /app

# Copy root workspace files for npm ci
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

# Install only the api workspace + its deps
RUN npm ci -w @wms/api --include-workspace-root

# Copy prisma schema and generate client
COPY apps/api/prisma apps/api/prisma
RUN npx -w @wms/api prisma generate

# Copy API source and build
COPY apps/api/tsconfig.json apps/api/tsconfig.build.json apps/api/nest-cli.json apps/api/
COPY apps/api/src apps/api/src
RUN npm run build -w @wms/api

# ---------- production stage ----------
FROM node:22-alpine

RUN addgroup -S wms && adduser -S wms -G wms
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN npm ci -w @wms/api --include-workspace-root --omit=dev

# Copy prisma schema and generate client in production stage
COPY apps/api/prisma apps/api/prisma
RUN npx -w @wms/api prisma generate

# Copy built output
COPY --from=build /app/apps/api/dist apps/api/dist

USER wms
EXPOSE 3000

# Entrypoint: run migrations then start the server
CMD sh -c "cd apps/api && npx prisma migrate deploy && node dist/src/main.js"
