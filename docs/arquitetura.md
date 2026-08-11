# Decisões de arquitetura

Decisões registradas no código, com o motivo por trás de cada uma.
Voltar para o [README](../README.md).

- **Protocolo** `2026-0000123` via tabela `ticket_counters` incrementada na mesma
  transação da criação — sem lacunas na numeração.
- **`ticket_events` é append-only por trigger no banco**, não por disciplina do
  código. Auditoria que depende de boa vontade do desenvolvedor não é auditoria.
- **`in_progress` é um único valor no banco.** "Em Deslocamento" e "Em Andamento"
  são rótulos resolvidos em `packages/shared/src/labels.ts`.
- **Autorização é do servidor.** Guard de rota no front é navegação, não controle.
- **EXIF removido no upload** — foto de celular carrega GPS e modelo do aparelho.
- **PostGIS habilitado, colunas ainda lat/lng `Decimal`.** Nenhuma tela das fases
  0–5 faz consulta espacial; a coluna `geography` entra por migration quando
  houver deduplicação por proximidade ou agregação por zona.
- **Senha com `scrypt` nativo** para não depender de compilação nativa. Trocar por
  argon2id em produção mexe só em `modules/auth/password.ts` (o hash já é
  prefixado com o algoritmo, permitindo migração gradual).
