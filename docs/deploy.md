# Deploy em produção

Uma VM só, com Docker. Testado tendo como alvo a Ampere A1 do Always Free da
Oracle Cloud. Voltar para o [README](../README.md).

| Arquivo | Papel |
|---|---|
| `docker-compose.prod.yml` | a pilha: banco, storage, API e Caddy |
| `Dockerfile` | dois alvos — `api` (Node) e `web` (Caddy com os front-ends dentro) |
| `Caddyfile` | TLS automático e a topologia de domínios |
| `.env.production.example` | as variáveis, com o porquê de cada uma |

```bash
cp .env.production.example .env.production   # preencha antes
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml exec -it api \
  npx tsx prisma/create-admin.ts --email gestor@prefeitura.gov.br --nome "Marina Duarte"
```

## Topologia

```
exemplo.gov.br/            → PWA do cidadão (estático)
exemplo.gov.br/api/v1/*    → API Node        (mesma origem: nem CORS entra em jogo)
painel.exemplo.gov.br      → painel          (entra em CORS_ORIGINS)
fotos.exemplo.gov.br       → MinIO           (vira o S3_ENDPOINT)
```

**Os três domínios precisam ser subdomínios do MESMO domínio registrável**, e
isso não é estética. O cookie de refresh é `sameSite: 'lax'`
(`modules/auth/tokens.ts`): espalhar os apps por domínios diferentes — front na
Vercel e API na VM, por exemplo — faz o navegador engolir o cookie no
`/auth/refresh`, e a sessão cai a cada 15 minutos.

O app do cidadão vai na **raiz** porque o manifesto do PWA declara
`start_url: '/'` e o Vite não define `base`. O painel, cujas rotas já são
`/entrar` e `/painel/*`, cabe num subdomínio sem alteração nenhuma.

## O que muda em relação ao compose de desenvolvimento

- **Postgres e MinIO não publicam porta.** Quem fala com eles é a rede interna
  do compose; o que o mundo enxerga é só o Caddy, em 80/443.
- **A imagem do PostGIS é outra.** A `postgis/postgis` oficial publica somente
  amd64 e não sobe numa VM ARM. Aqui vai `imresamu/postgis` — build multi-arch
  do mesmo mantenedor. Alternativa equivalente: `ghcr.io/baosystems/postgis`.
- **Migration e hardening rodam a cada boot da API**, antes de servir. Os dois
  são idempotentes. O hardening não é opcional: é ele que cria a extensão
  PostGIS e os triggers que tornam a trilha de auditoria append-only.
- **O seed fica de fora.** Ele começa com um `TRUNCATE`.

## Duas armadilhas

**As `VITE_*` são assadas no bundle em tempo de build**, não lidas em runtime.
Elas entram como `--build-arg` (o compose já faz isso a partir do
`.env.production`). Trocar de domínio depois exige **reconstruir a imagem**;
editar o `.env` e reiniciar não tem efeito nenhum.

**A API busca o MinIO pelo endereço público**, porque é esse host que entra na
assinatura da URL da foto — um `http://storage:9000` interno geraria uma URL que
só funciona dentro da rede do Docker. Para o pedido não sair da VM e voltar por
hairpin NAT, o container do Caddy recebe um **alias de rede** com o nome do
domínio de fotos: o nome resolve direto para ele, e o certificado continua
válido. No primeiro boot, enquanto o Let's Encrypt ainda não emitiu o
certificado, a API pode falhar no `ensureBucket` e reiniciar — o
`restart: unless-stopped` cobre isso.

## Antes do primeiro `up`

- **Os três domínios já apontando para o IP da VM.** O Caddy tenta emitir os
  certificados no boot, e o Let's Encrypt limita tentativas por domínio.
- **Portas 80 e 443 abertas nos DOIS firewalls.** Na Oracle Cloud, liberar na
  Security List da VCN não basta: a imagem da instância traz o `iptables`
  fechado por padrão. É o erro mais comum, e o sintoma é um timeout silencioso.
- **Segredos gerados**, não os do `.env.example`. `JWT_ACCESS_SECRET` e
  `JWT_REFRESH_SECRET` precisam ser diferentes entre si e ter no mínimo 32
  caracteres — a API recusa subir se forem menores.

## O primeiro gestor

Instalação nova não tem nenhum usuário, e o `seed.ts` não serve para criar um:
ele apaga tudo antes. O caminho é o `create-admin`:

```bash
npm run create-admin --workspace @zeladoria/api -- \
  --email gestor@prefeitura.gov.br --nome "Marina Duarte"
```

A senha é pedida em seguida, sem eco, com confirmação — nunca como argumento,
que ficaria no histórico do shell e apareceria num `ps`. Quando a entrada não é
um terminal, o script lê da stdin, o que permite alimentá-lo de um gerenciador
de segredos:

```bash
echo -n "$SENHA" | npx tsx prisma/create-admin.ts --email a@b.gov.br --nome "Fulana"
```

O script recusa e-mail que já existe: ele cria contas, não redefine senha.

## O que ainda falta para valer como produção

Ver [limitacoes.md](limitacoes.md). Em resumo: não há cadastro de cidadão pela
interface, não há troca de senha, o logout não revoga o refresh token e não há
política de retenção das fotos — que carregam rosto, placa e fachada, com GPS
junto. Para demonstração e piloto, a pilha acima serve. Para atender cidadão de
verdade, esses pontos têm peso de LGPD, não de dívida técnica.

Também não há backup configurado. O mínimo é um `pg_dump` periódico do volume
`db_data` para fora da VM.
