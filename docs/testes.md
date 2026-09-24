# O que a suíte de testes protege

Mapa dos testes por arquivo. Os comandos para rodar estão no
[README](../README.md#como-rodar-os-testes).

## Regras críticas, por ordem de importância

| Arquivo | Regra |
|---|---|
| `apps/api/test/integration/audit-trail.test.ts` | Timeline imutável (ataca o banco por fora, não pelo service) |
| `apps/api/test/integration/access-control.test.ts` | Isolamento por `userId`; chamado alheio responde 404, não 403 |
| `apps/api/test/integration/ticket-lifecycle.test.ts` | Conclusão sem observação é recusada e não muda o status pela metade |
| `packages/shared/test/schemas.test.ts` | Mesma regra de conclusão no schema compartilhado |
| `packages/shared/test/labels.test.ts` | "Em Deslocamento" é rótulo, não um quarto status no banco |
| `apps/api/test/unit/password.test.ts` / `tokens.test.ts` | Hash com salt; segredos de access e refresh separados |

Os três primeiros existem porque falham em silêncio: um `where` esquecido não
derruba a aplicação, só entrega dado de um cidadão para outro.

## Demais testes

| Arquivo | Cobertura |
|---|---|
| `apps/api/test/integration/registration.test.ts` | Cadastro de cidadão — inclusive que `role` no corpo é ignorado |
| `apps/api/test/integration/forwarding.test.ts` | Encaminhamento de chamados |
| `apps/api/test/integration/public-feed.test.ts` | Lista e detalhe de "Na cidade" — mesma forma do detalhe do autor, sem identidade |
| `packages/shared/test/distance.test.ts` | Cálculo de distância |
| `packages/shared/test/format.test.ts` | Data, coordenada e nome — formatação compartilhada pelos dois apps |
| `packages/ui/test/Modal.test.tsx` | Componente `Modal` |
| `packages/ui/test/Toast.test.tsx` | Componente `Toast` |
| `packages/ui/test/motion-safety.test.tsx` | Conteúdo não depende de animação para existir |
