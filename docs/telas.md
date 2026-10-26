# Telas e decisões de interface

Rotas dos dois front-ends e as decisões de UI por trás delas.
Voltar para o [README](../README.md).

## App do cidadão (`apps/citizen`)

| Rota | Tela |
|---|---|
| `/` | Gateway público (requisito 2.3) |
| `/entrar` | Login e cadastro do cidadão (a mesma tela alterna entre os dois) |
| `/chamados` | Meus chamados |
| `/chamados/na-cidade` | Chamados das outras pessoas, em projeção reduzida, com busca e filtros |
| `/chamados/novo` | Abertura de serviço |
| `/chamados/:id` | Protocolo e linha do tempo |

- **Moldura de ~420px só a partir do breakpoint `sm`.** Em celular real a
  interface ocupa a tela inteira — a moldura ali roubaria altura útil. A altura
  é `min(860px, 100dvh - 4rem)`: fixa em 860px, ela transbordava em laptop e a
  página inteira ganhava barra de rolagem.
- **A moldura mora numa layout route** (`layouts/PhoneLayout.tsx`), não em cada
  página. É o que dá, de uma vez, o landmark `<main>`, o foco movido na troca de
  rota, a transição animando o conteúdo em vez do aparelho, e a barra inferior
  derivando o estado ativo do roteador em vez de uma prop passada à mão.
- **Abrir chamado termina numa confirmação com o número de protocolo**
  (`components/TicketCreated.tsx`), com botão de copiar. O protocolo é o que o
  cidadão usa para cobrar depois.
- **A confirmação compartilha o protocolo por fora do app**
  (`components/ShareTicket.tsx`): link direto, WhatsApp, SMS, e-mail, Facebook e
  X, mais a folha de compartilhamento do sistema onde o navegador a oferece. O
  link aponta para o detalhe da aba "Na cidade" (`/chamados/na-cidade/:id`), o
  único que outro cidadão consegue abrir. Quem não está logado passa pelo login,
  que devolve ao endereço pedido (o `from` que `Protected` põe no estado da
  navegação) e avisa que há um chamado compartilhado esperando.
- **Entrar e criar conta moram na MESMA tela**, num alternador. Cadastro é a
  primeira coisa que um cidadão faz e a única vez que faz — mandá-lo para outra
  rota, e de volta, é atrito num momento em que ele ainda não tem motivo nenhum
  para insistir. O cadastro já devolve a sessão aberta: pedir o login logo depois
  seria pedir a senha que a pessoa acabou de escolher.
- **O alternador são botões com `aria-pressed`, não abas.** `role="tablist"`
  promete navegação por setas, que não foi implementada — prometer menos e
  cumprir é melhor que anunciar um padrão pela metade. Trocar de modo limpa os
  erros e leva o foco ao primeiro campo do formulário novo.
- **Erro de campo vem do servidor.** O `ApiError.field` do 422 é lido e a
  mensagem aparece no campo, com o foco levado até ele.
- **Token de acesso vive só em memória**, nunca em `localStorage`. O refresh
  está em cookie `httpOnly`, e o cliente tenta renovar uma vez antes de
  derrubar o usuário no meio de um formulário preenchido.
- **Service worker faz precache apenas do app shell.** Nenhuma rota de API entra
  no cache: chamado com status desatualizado é o pior bug possível deste produto.
- **Câmera sem biblioteca:** `<input type="file" accept="image/*" capture="environment">`.
- **Localização é obrigatória para enviar.** Não há valor padrão — chutar o centro
  da cidade colocaria um ponto errado no mapa do gestor.
- **"Na cidade" leva ao detalhe completo, sem quem abriu.** O cartão da lista é
  enxuto (categoria, status e local); tocar nele abre `/chamados/na-cidade/:id`,
  a mesma tela do detalhe próprio — título, descrição, foto e andamento —, mas sem
  nome nem e-mail do solicitante. Só abre enquanto o chamado está na lista. O
  formulário de abertura avisa, antes do botão de envio, que o chamado fica
  visível a outros cidadãos.
- **"Eu também vi isso" mora no detalhe de "Na cidade".** É a saída para quem
  ia abrir um chamado que já existe: em vez de um duplicado, o chamado ganha um
  apoio, e o gestor vê a contagem no card do quadro e no detalhe. O botão é um
  só, com `aria-pressed` e rótulo fixo — trocar "apoiar" por "desfazer"
  derrubaria o foco no meio da ação. Não aparece no próprio chamado nem no
  concluído (`acceptsSupport` em `packages/shared`, a mesma regra da API); a
  contagem aparece para todos, inclusive para o autor.
- **"Na cidade" não mostra os chamados de quem vê.** Na lista da cidade eles
  confundiam, e já estão em "Meus chamados". Quem busca o próprio protocolo ali
  recebe esse aviso no resultado vazio. Só a
  lista os esconde: o detalhe `/chamados/na-cidade/:id` continua abrindo para o
  autor, porque é o link que ele compartilha.
- **Busca, filtros e ordem de "Na cidade" rodam no servidor.** Busca por
  protocolo (inteiro ou um pedaço) ou título; filtros de status e categoria;
  ordem por mais recentes, mais antigos, mais apoiados ou mais próximos. A lista
  tem teto de 50, e filtrar o que já chegou esconderia em silêncio o que ficou
  além dele — por isso tudo vai na consulta, sempre dentro de `publicScope`, e a
  tela diz "mostrando 50 de N" quando bate no teto. Os filtros são `<select>`
  nativos com cara de pílula (o seletor do sistema no celular, 16px para o iOS
  não dar zoom) e moram na URL; o cartão leva esse endereço ao detalhe, e o
  "voltar" devolve a lista como estava.
- **"Mais próximos" só pede o GPS quando o usuário escolhe.** A página nunca o
  aciona sozinha — pedir permissão sem o usuário ter solicitado nada é o
  caminho mais rápido para um "bloquear" permanente naquele aparelho. A posição
  fica em memória enquanto o app está aberto, para voltar do detalhe sem pedir
  de novo; se a localização falha, a ordem volta para "mais recentes" e a
  mensagem diz o que fazer.

## Painel da prefeitura (`apps/admin`)

| Rota | Tela |
|---|---|
| `/entrar` | Login em duas colunas ("Portal do Servidor") |
| `/painel/visao-geral` | KPIs e atividade recente |
| `/painel/mapa` | Mapa de zonas (Leaflet) |
| `/painel/ordens` | Kanban de ordens de serviço |
| `/painel/encaminhados` | Chamados repassados a outro órgão, paginados |

- **"Pendente" é âmbar em toda superfície, inclusive no mapa.** Os requisitos
  traziam âmbar nos KPIs (3.2.3) e vermelho no mapa (3.2.4) para o mesmo status.
  Unificado em âmbar; o vermelho ficou reservado para erro de sistema. Fonte
  única em `packages/ui/src/domain/statusTokens.ts`, que traz também a paleta
  escura: sobre basemap escuro o `#1351B4` fica em 2,5:1 e o ponto some, então as
  cores de dark mode são as rungs 300/400, escolhidas por contraste.
- **Concluir sempre passa pelo modal**, venha do arrasto ou do seletor. Os demais
  status mudam direto — a transição é livre (requisito 4.1).
- **A sidebar vira gaveta abaixo de `lg`** e as três colunas viram um carrossel
  horizontal com encaixe. Antes o painel era `w-64` sem nenhum breakpoint dentro
  de um `overflow-hidden`: em 375px a navegação comia dois terços da tela.
- **Visão geral, mapa e quadro se atualizam sozinhos a cada 15 s**
  (`LIVE_REFRESH_MS` em `apps/admin/src/lib/queryKeys.ts`), só com a aba
  visível. É busca periódica, não push: um chamado novo leva até 15 s para
  aparecer. O quadro pausa a busca durante o arrasto e enquanto uma mudança de
  status está pendente, para não desfazer o update otimista.
- **Kanban com atualização otimista.** O card muda de coluna na hora e volta
  sozinho se o servidor recusar, com aviso. O único lugar onde o rótulo de status
  é escrito no cliente é esse quadro otimista — está comentado no código, e o
  `onSettled` sobrescreve com o valor do servidor.
- **O seletor de status é a alternativa acessível ao arrasto.** Drag-and-drop não
  é operável por teclado; o dropdown cumpre a mesma regra de negócio.
- **Arrasto só começa após 6px de movimento.** Sem essa margem, o clique no card
  vira drag e o modal de detalhes nunca abre.
- **Busca roda no cliente** sobre os dados carregados, para o usuário digitar o
  rótulo em português ("Iluminação") em vez do valor do enum. Casa protocolo,
  título e categoria, e o card mostra o protocolo — é o número que o cidadão
  informa quando liga para cobrar.
- **Protocolo completo vai também ao servidor.** O quadro só tem as 100 ordens
  mais recentes dos três status operacionais; um encaminhado ou um chamado
  antigo não está nele, e "nenhuma ordem" diria que o chamado não existe. Com o
  protocolo inteiro (`2026-0000017`), a busca pergunta à API e mostra o achado
  em "Fora do quadro", com o motivo, abrindo o mesmo modal de detalhes. Pedaço
  de número ("17") fica só no cliente — casaria com dezenas de chamados — e,
  quando não acha nada, o quadro avisa que é preciso o protocolo completo.
- **O "heatmap" são círculos translúcidos sobrepostos**, exatamente como o
  requisito 3.2.4 descreve. Não somam intensidade como um heatmap real — para
  densidade de verdade seria preciso um plugin específico. O raio é em METROS
  (`Circle`, não `CircleMarker`): em pixels o halo tinha sempre o mesmo tamanho
  na tela e, ao afastar o zoom, o mapa virava uma mancha sólida.
- **Tiles CARTO** (Positron no claro, Dark Matter no escuro). O OSM padrão é
  colorido e disputa atenção com os círculos de status. Uso público de qualquer
  provedor tem política de uso aceitável e não é adequado para produção em
  volume; avalie antes de publicar. A atribuição precisa creditar OSM **e** CARTO.
  Desde setembro de 2026 a CARTO exige chave (`VITE_MAP_TILES_KEY`, gratuita até
  1M requisições/mês para uso comercial e 5M para não comercial); sem ela os
  tiles vêm com a marca d'água "API KEY REQUIRED".
- **"Encaminhados" é destino próprio, não uma quarta coluna do quadro.**
  `forwarded` é terminal e acumula para sempre; virar coluna faria os pendentes
  saírem em silêncio da resposta de 100 linhas do Kanban. Lá há paginação de
  verdade, e a tela também diz o que o sistema NÃO faz — ele registrou o
  encaminhamento, não entregou nada a ninguém.
- **Sem biblioteca de gráfico na visão geral.** O `/admin/metrics` devolve quatro
  contadores e cinco chamados: nenhuma série temporal, nenhum recorte por
  categoria, nenhum SLA. Uma biblioteca desenharia tendência sobre dado que não
  existe. No lugar há uma barra de distribuição em CSS puro, com os números na
  legenda e uma tabela `sr-only`. Gráfico de verdade exige mudar a API.
