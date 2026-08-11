# API

Endpoints e verificação manual das regras que mais quebram.
Voltar para o [README](../README.md).

## Endpoints

> Esta tabela está incompleta: as rotas de encaminhamento/órgãos
> (`apps/api/src/modules/agencies/agency.routes.ts`) e o feed público de chamados
> já existem no código e ainda não foram documentadas aqui.

| Método | Rota | Perfil |
|---|---|---|
| POST | `/api/v1/auth/login` | público |
| POST | `/api/v1/auth/refresh` | cookie |
| POST | `/api/v1/auth/logout` | — |
| GET | `/api/v1/auth/me` | autenticado |
| GET | `/api/v1/tickets` | cidadão |
| POST | `/api/v1/tickets` | cidadão (multipart) |
| GET | `/api/v1/tickets/:id` | cidadão |
| GET | `/api/v1/admin/tickets` | admin |
| GET | `/api/v1/admin/tickets/map` | admin |
| GET | `/api/v1/admin/tickets/:id` | admin |
| PATCH | `/api/v1/admin/tickets/:id/status` | admin (multipart) |
| GET | `/api/v1/admin/metrics` | admin |

## Teste rápido das duas regras que mais quebram

```bash
TOKEN=$(curl -s -X POST localhost:3333/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"gestor@prefeitura.gov.br","password":"senha123"}' \
  | node -pe "JSON.parse(require('fs').readFileSync(0)).accessToken")

# 1. Concluir sem observação deve falhar com 422 / VALIDATION_ERROR (field: "note")
curl -i -X PATCH localhost:3333/api/v1/admin/tickets/<ID>/status \
  -H "Authorization: Bearer $TOKEN" -F 'status=done'

# 2. Cidadão acessando rota de admin deve falhar com 403 / FORBIDDEN
```

Imutabilidade da timeline (o trigger deve recusar):

```sql
UPDATE ticket_events SET note = 'adulterado' WHERE id = (SELECT id FROM ticket_events LIMIT 1);
```
