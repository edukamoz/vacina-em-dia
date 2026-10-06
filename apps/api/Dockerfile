# syntax=docker/dockerfile:1
# API do Vacina em Dia em contêiner. O contexto de build é a RAIZ do repositório:
#   docker build -f apps/api/Dockerfile .

# ---- 1. Compila o domínio compartilhado e a API ----
FROM --platform=$BUILDPLATFORM node:24.21.0-slim AS build
WORKDIR /app
# Os manifestos primeiro, para o cache de dependências só quebrar quando elas mudarem.
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci --ignore-scripts
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build -w @vacina/shared -w @vacina/api

# ---- 2. Só as dependências de produção (sem ferramentas de desenvolvimento) ----
FROM --platform=$BUILDPLATFORM node:24.21.0-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci --omit=dev --ignore-scripts -w @vacina/api -w @vacina/shared

# ---- 3. Imagem final: host oficial do Azure Functions (Node 24) ----
# A imagem oficial só existe para linux/amd64 (a mesma arquitetura do Azure). Em Mac com Apple
# Silicon ela roda emulada; os estágios 1 e 2 acima rodam na arquitetura nativa.
FROM mcr.microsoft.com/azure-functions/node:4-node24
ENV AzureWebJobsScriptRoot=/home/site/wwwroot/apps/api \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true \
    FUNCTIONS_WORKER_RUNTIME=node
WORKDIR /home/site/wwwroot
# A estrutura do monorepo é mantida para o link de @vacina/shared em node_modules continuar válido.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/host.json ./apps/api/host.json
COPY --from=build /app/apps/api/dist ./apps/api/dist
