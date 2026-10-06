# syntax=docker/dockerfile:1
# Versão web do app em contêiner: build estático do Expo servido pelo nginx. O contexto de build é
# a RAIZ do repositório:
#   docker build -f apps/mobile/Dockerfile .

FROM node:24.21.0-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
COPY apps/mobile/package.json apps/mobile/
RUN npm ci --ignore-scripts
COPY tsconfig.base.json ./
COPY packages/shared packages/shared
# O Tailwind e o tema leem os tokens do design system (fonte única).
COPY docs/04-design-system/tokens.json docs/04-design-system/tokens.json
COPY apps/mobile apps/mobile
RUN npm run build -w @vacina/shared
# O endereço da API entra no pacote na hora do build. "/api" é na mesma origem: o nginx repassa
# para a API, então o navegador não precisa de CORS. Valor público, nunca um segredo.
ARG EXPO_PUBLIC_API_URL=/api
ENV EXPO_PUBLIC_API_URL=$EXPO_PUBLIC_API_URL
RUN npm run build -w @vacina/mobile

FROM nginx:1.31.6-alpine
COPY apps/mobile/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/mobile/dist /usr/share/nginx/html
