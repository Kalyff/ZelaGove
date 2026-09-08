# Limitações conhecidas desta fase

O que ainda não está resolvido e o que cada item exige para evoluir.
Voltar para o [README](../README.md).

- **Logout não revoga o refresh token** (JWT stateless). A evolução é uma tabela de
  sessões com `jti`. Aceito no protótipo, não em produção.
- **URL de foto é presigned de vida curta.** Uma vez emitida, vale para quem a
  tiver, independente de papel.
- **Busca do servidor filtra só por título.** O Kanban filtra no cliente por
  título e categoria (requisito 4.8), usando os rótulos em português. O filtro do
  servidor existe para quando entrar paginação.
- **Sem fila offline.** Chamado aberto sem sinal se perde. Guardar rascunho em
  IndexedDB e sincronizar depois resolveria, mas traz conflito de timestamp e
  foto pesada em storage local — decisão pendente.
- **Retenção de fotos não implementada.** Depende de definição jurídica (base
  legal e prazo). Hoje nada é apagado.
- **Painel não paginado.** Carrega até 100 ordens de uma vez. O parâmetro já
  existe na API; é só ligar quando o volume exigir.
- **Cores gov.br transcritas de memória.** As quatro âncoras (`#1351B4`,
  `#071D41`, `#168821`, `#FFCD07`) são o ponto de partida das rampas em
  `packages/ui/tailwind.preset.js`. Confira os valores exatos no design system
  oficial antes de publicar — as rampas derivadas mudam junto.
- **Reduced motion não foi observado em execução.** A infraestrutura existe nos
  dois lugares que importam (guard de CSS no preset, `MotionConfig
  reducedMotion="user"` no root de cada app), mas testar exige alternar a
  preferência do sistema operacional.
- **Tipografia:** o design system oficial usa Rawline, que não está no Google
  Fonts. Substituí por Raleway + Inter. Se a identidade precisar ser fiel,
  é preciso hospedar a fonte oficial.
- **O Login do painel não usa o design system.** É o único arquivo dos dois apps
  com `<input class="field-input">` e `<button>` crus em vez de `Field`/`Input`/
  `Button`, e o único que ignora o `field` do erro do servidor: a mensagem sai
  como "Acesso negado." sem apontar qual campo está errado. Migrar mexe no
  visual da tela, então ficou fora da refatoração estrutural.
- **Fins de linha misturados.** Treze arquivos estão em CRLF e o resto em LF.
  Normalizar pede um `.gitattributes` e um commit que toca só isso — de outro
  jeito o ruído se mistura a mudanças reais.
- **Versões das dependências precisam ser conferidas.** Foram fixadas em faixas
  conhecidas, mas podem estar desatualizadas — rode `npm outdated` e `npm audit`
  antes de seguir.
