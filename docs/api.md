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
| POST | `/auth/login` | público (10 tentativas / 15 min) |
| POST | `/auth/refresh` | cookie `zg_refresh` |
| POST | `/auth/logout` | — |
| GET | `/auth/me` | autenticado |

Endpoint de login único para os dois apps: as TELAS é que são separadas
(requisito 2.3). O papel volta no payload e cada front recusa a sessão do outro.

## Cidadão

| Método | Rota | Observação |
|---|---|---|
| GET | `/tickets` | só os do próprio usuário (requisito 4.6) |
| POST | `/tickets` | multipart, foto opcional de até 5 MB |
| GET | `/tickets/public` | chamados de TODOS, em projeção reduzida |
| GET | `/tickets/:id` | escopado por `userId`; chamado alheio responde 404 |

`/tickets/public` é a lista "Na cidade" e é a única rota do app do cidadão que
devolve dado de outra pessoa. O corte é feito na origem, pelo `select` de
`listPublicTickets` — `description`, `photoKey` e `userId` não saem do banco.
Exige estar autenticado como cidadão.

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
