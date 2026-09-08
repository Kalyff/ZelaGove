# Zeladoria.gov

Sistema de chamados de zeladoria urbana: API, PWA do cidadão e painel da
prefeitura. O cidadão registra um problema na rua com foto e localização; a
prefeitura acompanha, executa e responde — ou encaminha ao órgão competente, com
registro auditável dos dois lados.

## Pré-requisitos

- Node 20+
- Docker e Docker Compose

## Instalação

```bash
# 1. Infra (Postgres+PostGIS e MinIO)
docker compose up -d

# 2. Dependências de todos os workspaces
npm install

# 3. Ambiente
cp apps/api/.env.example apps/api/.env
cp apps/citizen/.env.example apps/citizen/.env
cp apps/admin/.env.example apps/admin/.env
```

> **Já tem um Postgres na 5432?** Crie um `.env` na raiz com `DB_PORT=5441` (ou
> outra porta livre) e ajuste o `DATABASE_URL` de `apps/api/.env` para a mesma
> porta. O sintoma sem isso é traiçoeiro: o container sobe e fica `healthy` — o
> healthcheck roda por dentro dele — mas o bind da porta falha, e o
> `DATABASE_URL` acaba conectando no Postgres do outro projeto. O erro que
> aparece é `P1000: Authentication failed`, que só é um bom desfecho por acaso:
> se o outro banco tivesse um usuário `zeladoria`, as migrations e o `TRUNCATE`
> do seed teriam ido parar lá dentro.

Gere os dois segredos JWT e cole em `apps/api/.env`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Banco — migration, hardening (PostGIS e o trigger append-only) e seed, num
comando só:

```bash
npm run db:setup
```

> O `db:setup` também gera o Prisma Client. Sem ele, `npm run typecheck` falha
> em `apps/api` com "Module '@prisma/client' has no exported member" — o
> `npm install` sozinho não gera o cliente. Para gerar só isso:
> `npm exec --workspace @zeladoria/api -- prisma generate`.

## Como rodar

Três terminais:

```bash
# API
npm run dev:api

# PWA do cidadão
npm run dev --workspace @zeladoria/citizen

# Painel da prefeitura
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

O seed também cadastra os órgãos externos usados no encaminhamento.

Fora do desenvolvimento não existe seed. O cidadão se cadastra sozinho, pela
própria tela de login do app. Já o gestor é provisionado — `/auth/register` cria
exclusivamente `citizen`, e o papel é escrito no servidor, nunca lido do corpo
da requisição. Para criar a primeira conta de gestor:

```bash
npm run create-admin --workspace @zeladoria/api -- \
  --email gestor@prefeitura.gov.br --nome "Marina Duarte"
```

A senha é pedida em seguida, sem eco — nunca como argumento, que ficaria no
histórico do shell e apareceria num `ps`. O script recusa e-mail já existente:
ele cria contas, não redefine senha.

### Testando no celular

- Geolocalização e câmera só funcionam em contexto seguro.
- `localhost` é exceção; abrir pelo IP da rede local **não** é — o GPS falha em
  silêncio.
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
  shared/    Domínio e contrato: enums, schemas Zod, rótulos, DTOs, formatação
  client/    Plataforma de front-end: transporte HTTP e sessão
  ui/        Design system: primitivos, ícones, hooks e preset do Tailwind
docs/        Documentação estendida

docker-compose.yml       infra local (Postgres+PostGIS e MinIO)
docker-compose.prod.yml  a pilha de produção — ver docs/deploy.md
Dockerfile               dois alvos: `api` (Node) e `web` (Caddy + front-ends)
Caddyfile                TLS automático e a topologia de domínios
```

Os três pacotes são consumidos como **fonte**, sem build step, por alias no
`vite.config.ts` e `paths` no `tsconfig.json` de cada app. A divisão entre eles
é por responsabilidade, e vale como regra ao escrever código novo:

| Pacote | Responde por | Quem consome |
|---|---|---|
| `@zeladoria/shared` | o que é verdade em qualquer camada: valores do domínio, validação e a forma exata das respostas da API | API, cidadão, painel |
| `@zeladoria/client` | falar com a API: token, retry de refresh, sessão | cidadão, painel |
| `@zeladoria/ui` | como as coisas aparecem: primitivos, cor, movimento, acessibilidade | cidadão, painel |

Os DTOs de `shared` são o mesmo tipo que o mapper do servidor declara como
retorno, então remover um campo da resposta quebra a compilação em vez de
quebrar a tela.

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
— apontar para o banco de desenvolvimento apaga seu seed. Um guard recusa rodar
contra banco cujo nome não termine em `_test`.

O CI (`.github/workflows/ci.yml`) sobe um Postgres+PostGIS, gera o Prisma
Client, aplica migration e hardening, e roda typecheck, unitários e integração.

Mapa de qual teste protege qual regra: [docs/testes.md](docs/testes.md).

## Deploy

Uma VM só, com Docker — `docker-compose.prod.yml`, `Dockerfile` e `Caddyfile`
na raiz. O Caddy cuida do TLS; Postgres e MinIO não publicam porta.

```bash
cp .env.production.example .env.production   # preencha antes
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Duas coisas que decidem o desenho e surpreendem quem não sabe: o cookie de
sessão é `sameSite: 'lax'`, então os três domínios precisam ser subdomínios do
**mesmo** domínio registrável; e as `VITE_*` são assadas no bundle em tempo de
build, então trocar de domínio exige reconstruir a imagem.

O passo a passo, incluindo o que abrir no firewall da Oracle Cloud e por que a
imagem do PostGIS é trocada em ARM: [docs/deploy.md](docs/deploy.md).

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
- [docs/deploy.md](docs/deploy.md) — subir numa VM: topologia, domínios e armadilhas
- [docs/design-system.md](docs/design-system.md) — `packages/ui`, cor, movimento e armadilhas do Tailwind
- [docs/telas.md](docs/telas.md) — rotas e decisões de interface dos dois apps
- [docs/testes.md](docs/testes.md) — o que a suíte protege
- [docs/limitacoes.md](docs/limitacoes.md) — limitações conhecidas desta fase
