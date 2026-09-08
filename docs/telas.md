# Telas e decisões de interface

Rotas dos dois front-ends e as decisões de UI por trás delas.
Voltar para o [README](../README.md).

## App do cidadão (`apps/citizen`)

| Rota | Tela |
|---|---|
| `/` | Gateway público (requisito 2.3) |
| `/entrar` | Login e cadastro do cidadão (a mesma tela alterna entre os dois) |
| `/chamados` | Meus chamados |
| `/chamados/na-cidade` | Chamados de toda a cidade, em projeção reduzida |
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
- **"Na cidade" não leva ao detalhe, e não é esquecimento.** Não existe detalhe a
  mostrar: o servidor manda categoria, status e local, e nada mais. A leitura
  completa de um chamado continua escopada a quem o abriu.
- **A ordenação por proximidade só roda quando o usuário pede.** A página nunca
  aciona o GPS sozinha — pedir permissão sem o usuário ter solicitado nada é o
  caminho mais rápido para um "bloquear" permanente naquele aparelho.

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
- **Kanban com atualização otimista.** O card muda de coluna na hora e volta
  sozinho se o servidor recusar, com aviso. O único lugar onde o rótulo de status
  é escrito no cliente é esse quadro otimista — está comentado no código, e o
  `onSettled` sobrescreve com o valor do servidor.
- **O seletor de status é a alternativa acessível ao arrasto.** Drag-and-drop não
  é operável por teclado; o dropdown cumpre a mesma regra de negócio.
- **Arrasto só começa após 6px de movimento.** Sem essa margem, o clique no card
  vira drag e o modal de detalhes nunca abre.
- **Busca roda no cliente** sobre os dados carregados, para o usuário digitar o
  rótulo em português ("Iluminação") em vez do valor do enum.
- **O "heatmap" são círculos translúcidos sobrepostos**, exatamente como o
  requisito 3.2.4 descreve. Não somam intensidade como um heatmap real — para
  densidade de verdade seria preciso um plugin específico. O raio é em METROS
  (`Circle`, não `CircleMarker`): em pixels o halo tinha sempre o mesmo tamanho
  na tela e, ao afastar o zoom, o mapa virava uma mancha sólida.
- **Tiles CARTO** (Positron no claro, Dark Matter no escuro). O OSM padrão é
  colorido e disputa atenção com os círculos de status. Uso público de qualquer
  provedor tem política de uso aceitável e não é adequado para produção em
  volume; avalie antes de publicar. A atribuição precisa creditar OSM **e** CARTO.
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
