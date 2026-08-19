FROM node:24-alpine AS build

WORKDIR /workspace

RUN corepack enable && corepack prepare pnpm@11.16.0 --activate
RUN pnpm --version

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/package.json
COPY frontend/package.json frontend/package.json

RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store pnpm install --frozen-lockfile

COPY backend/ backend/

RUN pnpm --filter sistema-cartera-api build
RUN pnpm --filter sistema-cartera-api deploy --prod --legacy /prod/api


FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production

# pg_dump para el módulo de Backups (misma versión mayor que el servicio `db`).
RUN apk add --no-cache postgresql17-client

COPY --from=build /prod/api ./

EXPOSE 3000

CMD ["node", "dist/main.js"]
