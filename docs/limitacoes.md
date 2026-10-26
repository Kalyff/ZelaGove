# Limitações conhecidas desta fase

O que ainda não está resolvido e o que cada item exige para evoluir.
Voltar para o [README](../README.md).

- **A conta de cidadão nasce sem verificação de e-mail.** O cadastro é imediato
  e ninguém confirma que o endereço é de quem se inscreveu — dá para se
  registrar com o e-mail de outra pessoa. Resolver exige serviço de envio, que o
  projeto não tem. Enquanto isso, o e-mail serve para entrar, não como prova de
  identidade.
- **Não há troca nem recuperação de senha.** A senha definida no cadastro é
  definitiva até alguém mexer no banco. O `create-admin` recusa e-mail existente
  de propósito, então nem ele serve de escape.
- **Logout não revoga o refresh token** (JWT stateless). A evolução é uma tabela de
  sessões com `jti`. Aceito no protótipo, não em produção.
- **URL de foto é presigned de vida curta.** Uma vez emitida, vale para quem a
  tiver, independente de papel.
- **O link compartilhado do chamado exige conta e segue a regra da aba "Na
  cidade".** Ele abre `/chamados/na-cidade/:id`, que pede login de cidadão e
  responde "não encontrado" quando o chamado é encaminhado a outro órgão ou 30
  dias depois de concluído (`publicScope`). Pelo mesmo motivo, a prévia em rede
  social é a genérica do app, sem título nem foto do chamado. Abrir para quem não
  tem conta, ou por mais tempo, pede uma página pública própria com um código
  secreto por chamado — decisão de privacidade, não só de código.
- **A busca do painel no servidor filtra só por título e protocolo.** O Kanban
  filtra no cliente por protocolo, título e categoria (requisito 4.8), usando os
  rótulos em português, e só pergunta ao servidor quando recebe um protocolo
  completo. Por isso um pedaço de protocolo ou um título acha apenas o que está
  nas 100 ordens do quadro; encaminhados e chamados antigos exigem o protocolo
  inteiro. O filtro de categoria do painel no servidor fica para quando entrar
  paginação.
- **"Na cidade" tem teto de 50 e não pagina.** Busca, filtros e ordem rodam no
  servidor antes do teto, e a tela avisa "mostrando 50 de N" — mas não há
  "carregar mais". "Mais próximos" é a exceção: ordena no aparelho só os até 50
  que vieram, porque ordenar no servidor exigiria mandar a posição de quem vê. A
  busca segue `publicScope`: encaminhados e concluídos há mais de 30 dias não
  aparecem nem pelo protocolo exato, e os chamados de quem vê ficam em "Meus
  chamados".
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
