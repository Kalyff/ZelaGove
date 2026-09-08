# syntax=docker/dockerfile:1
#
# Imagens de produção do Zeladoria.gov — dois alvos num arquivo só:
#
#   --target api  → a API Node
#   --target web  → Caddy com os dois front-ends já compilados dentro
#
# Multi-arch de propósito: o alvo mais interessante é uma VM ARM (Ampere), e
# todas as bases usadas aqui publicam arm64.

# ---------------------------------------------------------------- dependências
# Estágio próprio só para o `npm ci`, com os package.json copiados antes do
# código: enquanto as dependências não mudarem, o Docker reaproveita a camada e
# um deploy que só mexeu em código não reinstala nada.
FROM node:20-bookworm-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY apps/admin/package.json apps/admin/
COPY apps/citizen/package.json apps/citizen/
COPY packages/client/package.json packages/client/
COPY packages/shared/package.json packages/shared/
COPY packages/ui/package.json packages/ui/
# Com as devDependencies: o `tsx` que roda a API e o `prisma` que aplica as
# migrations são dev deps neste projeto.
RUN npm ci

# ------------------------------------------------------------------------- API
FROM node:20-bookworm-slim AS api
# O Prisma Client precisa do OpenSSL do sistema; a base slim não o traz.
RUN apt-get update \
 && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Gerado DENTRO da imagem, para o binário casar com a arquitetura de destino.
RUN npm exec --workspace @zeladoria/api -- prisma generate
WORKDIR /app/apps/api
# `tsx` e não um build com `tsc`: o tsconfig resolve `@zeladoria/shared` por
# `paths`, e o tsc não reescreve esses caminhos ao emitir — a saída importaria
# um pacote que não existe em node_modules. Rodar o TypeScript direto mantém a
# resolução idêntica à do desenvolvimento, que é o que já acontece hoje com o
# `tsx watch`, o seed e o hardening.
USER node
EXPOSE 3333
CMD ["npx", "tsx", "src/main.ts"]

# -------------------------------------------------------------- front-ends
FROM node:20-bookworm-slim AS web-build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# O Vite INLINA estas variáveis no bundle: elas são de BUILD, não de runtime.
# Trocar o domínio depois exige reconstruir a imagem — não adianta mexer no
# `environment` do compose.
ARG VITE_API_URL
ARG VITE_ADMIN_URL
ARG VITE_CITIZEN_URL
ARG VITE_MAP_LAT
ARG VITE_MAP_LNG
ARG VITE_MAP_ZOOM
RUN npm run build --workspace @zeladoria/citizen \
 && npm run build --workspace @zeladoria/admin

FROM caddy:2-alpine AS web
COPY --from=web-build /app/apps/citizen/dist /srv/citizen
COPY --from=web-build /app/apps/admin/dist   /srv/admin
COPY Caddyfile /etc/caddy/Caddyfile
