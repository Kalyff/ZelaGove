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
- **Três pacotes, três responsabilidades.** `shared` é o que vale em qualquer
  camada (domínio, validação e a forma das respostas); `client` é falar com a
  API (token, refresh, sessão); `ui` é como as coisas aparecem. A divisão existe
  porque o transporte HTTP e o provedor de sessão estavam escritos por inteiro
  nos dois apps — corrigir o retry de refresh exigia lembrar dos dois lugares.
- **O contrato HTTP é verificado pelo compilador.** Os DTOs vivem em
  `packages/shared/src/dto.ts` e são o tipo de retorno declarado do mapper do
  servidor, não só a expectativa do cliente. Tirar um campo da resposta quebra a
  compilação; antes cada app mantinha sua cópia dos tipos e nada comparava as
  duas. Para o feed público a checagem soma-se ao teste de integração que compara
  o conjunto exato de chaves — não o substitui, porque spread escapa da checagem
  de propriedade excedente.
- **Leituras e comandos de chamado em arquivos separados.** `ticket.service.ts`
  guarda só o que escreve, sempre em transação; `ticket.queries.ts` guarda o que
  lê, que é onde mora o controle de escopo. Um `where` esquecido numa leitura não
  derruba nada — só entrega o chamado de um cidadão para outro, e vê-las lado a
  lado é o que torna a comparação entre os recortes possível de fazer com os
  olhos.
- **Senha com `scrypt` nativo** para não depender de compilação nativa. Trocar por
  argon2id em produção mexe só em `modules/auth/password.ts` (o hash já é
  prefixado com o algoritmo, permitindo migração gradual).
