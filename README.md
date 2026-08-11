# Zeladoria.gov

Sistema de chamados de zeladoria urbana: API, PWA do cidadão e painel da prefeitura.

## Pré-requisitos

- Node 20+
- Docker e Docker Compose

## Instalação

```bash
# 1. Infra (Postgres+PostGIS e MinIO)
docker compose up -d

# 2. Dependências
npm install

# 3. Ambiente
cp apps/api/.env.example apps/api/.env
cp apps/citizen/.env.example apps/citizen/.env
cp apps/admin/.env.example apps/admin/.env
```

Gere os dois segredos JWT e cole em `apps/api/.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Banco — migration, hardening e seed:

```bash
cd apps/api
npx prisma migrate dev --name init
npx tsx prisma/hardening.ts
npx tsx prisma/seed.ts
```

## Como rodar

Três terminais:

```bash
# API (a partir de apps/api)
npm run dev

# PWA do cidadão (a partir da raiz)
npm run dev --workspace @zeladoria/citizen

# Painel da prefeitura (a partir da raiz)
npm run dev --workspace @zeladoria/admin
```

| Serviço | URL |
|---|---|
| API | `http://localhost:3333` |
| App do cidadão | `http://localhost:5173` |
| Painel da prefeitura | `http://localhost:5174` |
| Console do MinIO | `http://localhost:9001` |

**Usuários do seed** (senha `senha123` para todos):

| Perfil | E-mail |
|---|---|
| Gestor | `gestor@prefeitura.gov.br` |
| Cidadão | `joao@email.com` |
| Cidadão | `ana@email.com` |

### Testando no celular

- Geolocalização e câmera só funcionam em contexto seguro.
- `localhost` é exceção; abrir pelo IP da rede local **não** é — o GPS falha em silêncio.
- Use túnel HTTPS (ngrok, cloudflared) ou certificado local (mkcert) e aponte
  `VITE_API_URL` para a URL pública da API.

## Variáveis de ambiente

`JWT_ACCESS_SECRET` e `JWT_REFRESH_SECRET` são os únicos que exigem ação manual —
o resto dos `.env.example` já funciona com o `docker compose` local.

**`apps/api/.env`**

| Variável | Exemplo |
|---|---|
| `DATABASE_URL` | `postgresql://zeladoria:zeladoria@localhost:5432/zeladoria?schema=public` |
| `PORT` | `3333` |
| `NODE_ENV` | `development` |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174` |
| `JWT_ACCESS_SECRET` | gerar (mín. 32 caracteres) |
| `JWT_REFRESH_SECRET` | gerar (mín. 32 caracteres) |
| `ACCESS_TOKEN_TTL` | `15m` |
| `REFRESH_TOKEN_TTL` | `7d` |
| `S3_ENDPOINT` | `http://localhost:9000` |
| `S3_REGION` | `us-east-1` |
| `S3_BUCKET` | `zeladoria` |
| `S3_ACCESS_KEY` | `zeladoria` |
| `S3_SECRET_KEY` | `zeladoria123` |
| `S3_FORCE_PATH_STYLE` | `true` |
| `PHOTO_URL_TTL_SECONDS` | `300` |

**`apps/citizen/.env`**

| Variável | Exemplo |
|---|---|
| `VITE_API_URL` | `http://localhost:3333/api/v1` |
| `VITE_ADMIN_URL` | `http://localhost:5174` |

**`apps/admin/.env`**

| Variável | Exemplo |
|---|---|
| `VITE_API_URL` | `http://localhost:3333/api/v1` |
| `VITE_CITIZEN_URL` | `http://localhost:5173` |
| `VITE_MAP_LAT` | `-9.97499` |
| `VITE_MAP_LNG` | `-67.8243` |
| `VITE_MAP_ZOOM` | `13` |

## Estrutura do projeto

```
apps/
  api/       Express + Prisma, Postgres+PostGIS e MinIO/S3
  citizen/   PWA do cidadão (Vite + React)
  admin/     Painel da prefeitura (Vite + React + Leaflet)
packages/
  shared/    Enums, schemas Zod e rótulos compartilhados
  ui/        Design system: primitivos, ícones, hooks e preset do Tailwind
docs/        Documentação estendida
```

## Como rodar os testes

```bash
# Unitários — sem banco, rodam em qualquer lugar
npm test

# Integração — precisam do Postgres de pé
createdb zeladoria_test   # ou: docker compose exec db createdb -U zeladoria zeladoria_test
cp apps/api/.env.test.example apps/api/.env.test

cd apps/api
DATABASE_URL="postgresql://zeladoria:zeladoria@localhost:5432/zeladoria_test?schema=public" \
  npx prisma migrate deploy
DATABASE_URL="postgresql://zeladoria:zeladoria@localhost:5432/zeladoria_test?schema=public" \
  npx tsx prisma/hardening.ts

cd ../.. && npm run test:integration
```

**Use um banco separado.** Os testes de integração truncam tabelas a cada arquivo
— apontar para o banco de desenvolvimento apaga seu seed.

O CI (`.github/workflows/ci.yml`) sobe um Postgres+PostGIS, aplica migration e
hardening, e roda typecheck, unitários e integração.

Mapa de qual teste protege qual regra: [docs/testes.md](docs/testes.md).

## Como contribuir

Antes de abrir PR, rode localmente o que o CI roda:

```bash
npm run typecheck --workspaces --if-present
npm test
npm run test:integration
```

## Documentação

- [docs/api.md](docs/api.md) — endpoints e verificação manual das regras críticas
- [docs/arquitetura.md](docs/arquitetura.md) — decisões registradas no código
- [docs/design-system.md](docs/design-system.md) — `packages/ui`, cor, movimento e armadilhas do Tailwind
- [docs/telas.md](docs/telas.md) — rotas e decisões de interface dos dois apps
- [docs/testes.md](docs/testes.md) — o que a suíte protege
- [docs/limitacoes.md](docs/limitacoes.md) — limitações conhecidas desta fase
