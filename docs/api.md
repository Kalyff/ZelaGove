# API

Endpoints e verificação manual das regras que mais quebram.
Voltar para o [README](../README.md).

Base: `/api/v1`. Todo erro tratado sai no mesmo envelope —
`{ error: { code, message, field? } }` — montado num lugar só
(`apps/api/src/middleware/error.ts`). `field` é o que permite ao cliente mostrar
a mensagem NO campo errado em vez de um aviso genérico.

## Autenticação

| Método | Rota | Perfil |
|---|---|---|
| POST | `/auth/register` | público (10 cadastros / hora por IP) |
| POST | `/auth/login` | público (10 tentativas / 15 min) |
| POST | `/auth/refresh` | cookie `zg_refresh` |
| POST | `/auth/logout` | — |
| GET | `/auth/me` | autenticado |

Endpoint de login único para os dois apps: as TELAS é que são separadas
(requisito 2.3). O papel volta no payload e cada front recusa a sessão do outro.

`/register` cria **sempre** `citizen` — o papel é escrito no servidor, nunca
lido do corpo — e devolve a mesma sessão do login (201, `accessToken` mais o
cookie de refresh), para o cadastro já entrar sem uma segunda volta pela tela de
login. Gestor não se cadastra: é provisionado pelo `create-admin`.

Ele é o único ponto do sistema que revela se um e-mail já existe
(`EMAIL_ALREADY_REGISTERED`), ao contrário do `/login`, que devolve a mesma
mensagem para e-mail inexistente e senha errada. A contradição é assumida — sem
confirmação por e-mail não há saída boa, e uma mensagem genérica deixaria a
pessoa sem saber por que o cadastro falhou.

## Cidadão

| Método | Rota | Observação |
|---|---|---|
| GET | `/tickets` | só os do próprio usuário (requisito 4.6) |
| POST | `/tickets` | multipart, foto opcional de até 5 MB |
| GET | `/tickets/public` | chamados de TODOS, em projeção reduzida |
| GET | `/tickets/public/:id` | detalhe de um chamado da lista pública, sem o solicitante |
| GET | `/tickets/:id` | escopado por `userId`; chamado alheio responde 404 |

`/tickets/public` e `/tickets/public/:id` são a aba "Na cidade" e as únicas rotas
do app do cidadão que devolvem dado de outra pessoa. A lista é enxuta (o `select`
de `listPublicTickets` traz categoria, status e local); o detalhe tem a mesma
forma do `/tickets/:id` do autor — título, descrição, foto e linha do tempo —, e
nenhuma das duas carrega nome, e-mail ou `userId` de quem abriu. As duas seguem a
mesma regra de visibilidade (`publicScope`): pendente, em andamento ou concluído
há até 30 dias, nunca encaminhado; fora dela o detalhe responde 404. Exigem estar
autenticado como cidadão.

## Painel (admin)

| Método | Rota | Observação |
|---|---|---|
| GET | `/admin/tickets` | `?status=a,b&q=&page=&perPage=` |
| GET | `/admin/tickets/map` | payload enxuto do mapa (requisito 3.2.4) |
| GET | `/admin/tickets/:id` | inclui solicitante e linha do tempo |
| PATCH | `/admin/tickets/:id/status` | multipart; recusa `forwarded` |
| POST | `/admin/tickets/:id/forward` | encaminha a órgão externo |
| POST | `/admin/tickets/:id/external-protocol` | anota o protocolo devolvido pelo órgão |
| GET | `/admin/metrics` | KPIs + chamados recentes |
| GET | `/admin/agencies` | órgãos ativos, para o seletor |

Três regras que a tabela não mostra:

- **`PATCH /status` recusa `forwarded` de propósito.** Ele também é o caminho do
  arrasto no Kanban, que não tem como informar o órgão — reusá-lo permitiria
  soltar um card e produzir um chamado encaminhado para lugar nenhum.
- **`POST /forward` REGISTRA e audita; não envia nada ao órgão.** A entrega pelo
  canal do órgão continua manual.
- **`POST /external-protocol` não muda o status.** O chamado segue encaminhado e
  ganha um evento novo — o histórico é append-only, e reescrever o evento
  anterior apagaria de onde o chamado veio.

## Teste rápido das duas regras que mais quebram

```bash
TOKEN=$(curl -s -X POST localhost:3333/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"gestor@prefeitura.gov.br","password":"senha123"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0)).accessToken")

# 1. Concluir sem observação deve falhar com 422 / VALIDATION_ERROR (field: "note")
curl -i -X PATCH localhost:3333/api/v1/admin/tickets/<ID>/status \
  -H "Authorization: Bearer $TOKEN" -F 'status=done'

# 2. Arrastar para "encaminhado" deve falhar com 422 / USE_FORWARD_ENDPOINT
curl -i -X PATCH localhost:3333/api/v1/admin/tickets/<ID>/status \
  -H "Authorization: Bearer $TOKEN" -F 'status=forwarded'

# 3. Cidadão acessando rota de admin deve falhar com 403 / FORBIDDEN
```

Imutabilidade da timeline (o trigger deve recusar):

```sql
UPDATE ticket_events SET note = 'adulterado' WHERE id = (SELECT id FROM ticket_events LIMIT 1);
```
