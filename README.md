# Zeladoria.gov — API e fundação

Sistema completo: fundação, autenticação, back-end de chamados, PWA do cidadão,
painel da prefeitura e suíte de testes.

## Requisitos

- Node 20+
- Docker e Docker Compose

## Subindo o ambiente

```bash
# 1. Infra (Postgres+PostGIS e MinIO)
docker compose up -d

# 2. Dependências
npm install

# 3. Ambiente
cp apps/api/.env.example apps/api/.env
# gere segredos de verdade:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

# 4. Banco: migration + hardening + seed
cd apps/api
npx prisma migrate dev --name init
npx tsx prisma/hardening.ts
npx tsx prisma/seed.ts

# 5. API
npm run dev

# 6. PWA do cidadão (outro terminal, a partir da raiz)
cp apps/citizen/.env.example apps/citizen/.env
npm run dev --workspace @zeladoria/citizen

# 7. Painel da prefeitura (outro terminal, a partir da raiz)
cp apps/admin/.env.example apps/admin/.env
npm run dev --workspace @zeladoria/admin
```

API em `http://localhost:3333`, app do cidadão em `http://localhost:5173`,
painel da prefeitura em `http://localhost:5174`, console do MinIO em
`http://localhost:9001`.

### Testando no celular

Geolocalização e câmera só funcionam em contexto seguro. `localhost` é exceção,
mas abrir pelo IP da rede local **não** é — o GPS falha silenciosamente. Use um
túnel HTTPS (ngrok, cloudflared) ou certificado local (mkcert) e aponte
`VITE_API_URL` para a URL pública da API.

**Usuários do seed** (senha `senha123` para todos):

| Perfil | E-mail |
|---|---|
| Gestor | `gestor@prefeitura.gov.br` |
| Cidadão | `joao@email.com` |
| Cidadão | `ana@email.com` |

## Endpoints

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

## Testes

```bash
# Unitários — sem banco, rodam em qualquer lugar
npm test

# Integração — precisam do Postgres de pé
createdb zeladoria_test   # ou: docker compose exec db createdb -U zeladoria zeladoria_test
cp apps/api/.env.test.example apps/api/.env.test

cd apps/api
DATABASE_URL="postgresql://zeladoria:zeladoria@localhost:5432/zeladoria_test?schema=public" \
  npx prisma migrate deploy
DATABASE_URL="postgresql://zeladoria:zeladoria@localhost:5432/zeladoria_test?schema=public" \
  npx tsx prisma/hardening.ts

cd ../.. && npm run test:integration
```

**Use um banco separado.** Os testes de integração truncam tabelas a cada arquivo
— apontar para o banco de desenvolvimento apaga seu seed.

O que a suíte protege, por ordem de importância:

| Arquivo | Regra |
|---|---|
| `audit-trail.test.ts` | Timeline imutável (ataca o banco por fora, não pelo service) |
| `access-control.test.ts` | Isolamento por `userId`; chamado alheio responde 404, não 403 |
| `ticket-lifecycle.test.ts` | Conclusão sem observação é recusada e não muda o status pela metade |
| `schemas.test.ts` | Mesma regra de conclusão no schema compartilhado |
| `labels.test.ts` | "Em Deslocamento" é rótulo, não um quarto status no banco |
| `password.test.ts` / `tokens.test.ts` | Hash com salt; segredos de access e refresh separados |

Os três primeiros existem porque falham em silêncio: um `where` esquecido não
derruba a aplicação, só entrega dado de um cidadão para outro.

O CI (`.github/workflows/ci.yml`) sobe um Postgres+PostGIS, aplica migration e
hardening, e roda typecheck, unitários e integração.

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

## Decisões registradas no código

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

## Design system (`packages/ui`)

Consumido como fonte pelos dois apps, sem build step — igual a `packages/shared`.
Exporta primitivos, ícones, hooks, tokens de movimento e o preset do Tailwind.

**Cor em três camadas.** Rampas primitivas (`gov-blue-600`, `ink-500`) →
variáveis semânticas em `src/styles/tokens.css` → o mapa `colors` do preset, que
aponta para elas. Componente novo usa a camada 3 (`bg-surface`,
`text-content-secondary`); a camada 1 só aparece onde a cor é institucional e não
pode mudar com o tema, como a faixa gov.br. `tokens.css` é o único arquivo com
hex cru, e cada par tem o contraste anotado.

**Dark mode é tonal, não invertido.** Os quatro tokens de preenchimento
(accent/success/warn/danger) sobem para rungs claras no escuro, e por isso cada
um tem o seu `--text-on-*`: `text-white` em cima deles cairia para ~3:1.

**Movimento.** Durações e curvas em `src/lib/motion.ts`. Vale uma regra de
robustez: conteúdo não pode depender de animação para existir. O framer anima em
`requestAnimationFrame`, que o navegador suspende em aba oculta — enquanto isso
o estado `initial` continua aplicado, e um `opacity: 0` deixaria a tela em branco
sem erro nenhum. Entrada de conteúdo anima só `y`/`scale`; opacidade fica com as
sobreposições, que só existem porque o JS rodou.

**Duas armadilhas do Tailwind que o código evita de propósito:**

- O `content` do `tailwind.config.js` de cada app **precisa** varrer
  `../../packages/ui/src`. Sem isso todo primitivo renderiza sem estilo — sem
  erro, sem aviso.
- Nada de classe montada em runtime (`` `bg-${tone}` ``). O Tailwind varre o
  código como texto; classe interpolada não existe no CSS gerado. Use mapa de
  lookup com strings literais.

O `resolve.dedupe` nos dois `vite.config.ts` garante instância única de React e
framer-motion entre os apps e o pacote.

## App do cidadão (`apps/citizen`)

| Rota | Tela |
|---|---|
| `/` | Gateway público (requisito 2.3) |
| `/entrar` | Login do cidadão |
| `/chamados` | Meus chamados |
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

## Painel da prefeitura (`apps/admin`)

| Rota | Tela |
|---|---|
| `/entrar` | Login em duas colunas ("Portal do Servidor") |
| `/painel/visao-geral` | KPIs e atividade recente |
| `/painel/mapa` | Mapa de zonas (Leaflet) |
| `/painel/ordens` | Kanban de ordens de serviço |

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
- **Sem biblioteca de gráfico na visão geral.** O `/admin/metrics` devolve quatro
  contadores e cinco chamados: nenhuma série temporal, nenhum recorte por
  categoria, nenhum SLA. Uma biblioteca desenharia tendência sobre dado que não
  existe. No lugar há uma barra de distribuição em CSS puro, com os números na
  legenda e uma tabela `sr-only`. Gráfico de verdade exige mudar a API.

## Limitações conhecidas desta fase

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
- **Sem testes de interface.** A suíte cobre API e regras compartilhadas; nenhum
  teste exercita os componentes React nem o fluxo no navegador.
- **Retenção de fotos não implementada.** Depende de definição jurídica (base
  legal e prazo) — ver item 1 abaixo. Hoje nada é apagado.
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
- **Versões das dependências precisam ser conferidas.** Foram fixadas em faixas
  conhecidas, mas podem estar desatualizadas — rode `npm outdated` e `npm audit`
  antes de seguir.
