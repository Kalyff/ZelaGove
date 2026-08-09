import { PrismaClient, type AgencyKind, type TicketCategory, type TicketStatus } from '@prisma/client';
import { hashPassword } from '../src/modules/auth/password';

const prisma = new PrismaClient();

// Centro aproximado usado só para espalhar os pontos de exemplo no mapa.
const BASE_LAT = -9.97499;
const BASE_LNG = -67.8243;

function jitter(base: number) {
  return Number((base + (Math.random() - 0.5) * 0.05).toFixed(6));
}

const SAMPLES: Array<{
  title: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
}> = [
  { title: 'Buraco na via', description: 'Buraco grande na pista, já causou dano em dois carros.', category: 'paving', status: 'pending' },
  { title: 'Poste apagado há uma semana', description: 'A rua inteira ficou escura, moradores evitam sair à noite.', category: 'lighting', status: 'in_progress' },
  { title: 'Semáforo piscando em amarelo', description: 'Cruzamento movimentado, risco de acidente no horário de pico.', category: 'traffic', status: 'pending' },
  { title: 'Boca de lobo entupida', description: 'Alaga a cada chuva forte e a água invade as calçadas.', category: 'sanitation', status: 'done' },
  { title: 'Terreno baldio com mato alto', description: 'Acúmulo de lixo e risco de animais peçonhentos.', category: 'cleaning', status: 'done' },
  { title: 'Calçada quebrada em frente à escola', description: 'Crianças precisam desviar pela rua para passar.', category: 'paving', status: 'in_progress' },
  { title: 'Lâmpada queimada na praça', description: 'Dois postes da praça central estão sem iluminação.', category: 'lighting', status: 'pending' },
  { title: 'Placa de pare derrubada', description: 'A placa caiu após o temporal e ninguém recolheu.', category: 'traffic', status: 'pending' },
  { title: 'Vazamento de água na esquina', description: 'Água corrente há três dias, desperdício grande.', category: 'sanitation', status: 'in_progress' },
  { title: 'Descarte irregular de entulho', description: 'Entulho de obra deixado na esquina bloqueando a calçada.', category: 'cleaning', status: 'pending' },
  { title: 'Tampa de bueiro faltando', description: 'Bueiro aberto no meio da via, sinalizado só com um galho.', category: 'sanitation', status: 'pending' },
  { title: 'Poda de árvore sobre a fiação', description: 'Galhos encostando nos fios de energia.', category: 'other', status: 'done' },
];

/**
 * Órgãos de exemplo. Os campos `public*` são o que o CIDADÃO vê quando o
 * chamado dele é encaminhado — sem eles o encaminhamento vira beco sem saída.
 *
 * Os nomes aqui são fictícios de propósito: cada município tem a sua
 * concessionária e a sua autarquia, e cravar nomes reais no seed convidaria a
 * subir isso para produção sem revisão.
 */
const AGENCIES: Array<{
  name: string;
  kind: AgencyKind;
  publicPhone?: string;
  publicUrl?: string;
  publicNote?: string;
}> = [
  {
    name: 'Concessionária de Energia',
    kind: 'concessionaria',
    publicPhone: '0800 000 0000',
    publicUrl: 'https://exemplo.com.br/atendimento',
    publicNote: 'Rede elétrica, postes e iluminação alimentada pela distribuidora.',
  },
  {
    name: 'Companhia de Saneamento',
    kind: 'concessionaria',
    publicPhone: '0800 000 0001',
    publicNote: 'Água tratada e esgoto até o cavalete do imóvel.',
  },
  {
    name: 'DNIT — Superintendência Regional',
    kind: 'federal',
    publicUrl: 'https://www.gov.br/dnit',
    publicNote: 'Rodovias federais (BR-) e suas faixas de domínio.',
  },
  {
    name: 'Departamento Estadual de Estradas',
    kind: 'estadual',
    publicNote: 'Rodovias estaduais.',
  },
  {
    name: 'Secretaria Municipal de Meio Ambiente',
    kind: 'secretaria',
    publicNote: 'Arborização urbana e licenciamento — outra pasta da prefeitura.',
  },
];

async function main() {
  console.log('Limpando dados...');
  // TRUNCATE em vez de deleteMany: o trigger append-only bloqueia DELETE em
  // ticket_events. TRUNCATE não dispara triggers de linha.
  // `agencies` entra na lista por causa das FKs vindas de tickets e eventos.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE ticket_events, tickets, ticket_counters, agencies, users RESTART IDENTITY CASCADE'
  );

  console.log('Criando órgãos externos...');
  await prisma.agency.createMany({ data: AGENCIES });

  const password = await hashPassword('senha123');

  const admin = await prisma.user.create({
    data: { name: 'Marina Duarte', email: 'gestor@prefeitura.gov.br', passwordHash: password, role: 'admin' },
  });

  const citizens = await Promise.all([
    prisma.user.create({ data: { name: 'João Ferreira', email: 'joao@email.com', passwordHash: password, role: 'citizen' } }),
    prisma.user.create({ data: { name: 'Ana Beatriz Lima', email: 'ana@email.com', passwordHash: password, role: 'citizen' } }),
  ]);

  const year = new Date().getFullYear();
  let seq = 0;

  for (const [i, sample] of SAMPLES.entries()) {
    seq += 1;
    const owner = citizens[i % citizens.length];
    /**
     * 48h entre chamados, e não 7h.
     *
     * Com 7h, a última amostra nascia 7h atrás e o evento de conclusão (+30h)
     * caía NO FUTURO: a linha do tempo mostrava um chamado concluído amanhã, e
     * qualquer ordenação por data ficava sem sentido. O intervalo precisa ser
     * maior que o maior deslocamento de evento abaixo.
     */
    const createdAt = new Date(Date.now() - (SAMPLES.length - i) * 36e5 * 48);

    const ticket = await prisma.ticket.create({
      data: {
        protocol: `${year}-${String(seq).padStart(7, '0')}`,
        userId: owner.id,
        category: sample.category,
        title: sample.title,
        description: sample.description,
        status: sample.status,
        latitude: jitter(BASE_LAT),
        longitude: jitter(BASE_LNG),
        createdAt,
        updatedAt: createdAt,
      },
    });

    // Requisito 4.2: primeiro evento sempre 'pending' / "Chamado aberto".
    await prisma.ticketEvent.create({
      data: { ticketId: ticket.id, actorId: owner.id, status: 'pending', note: 'Chamado aberto', createdAt },
    });

    if (sample.status !== 'pending') {
      await prisma.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          actorId: admin.id,
          status: 'in_progress',
          note: 'Equipe designada e a caminho do local.',
          createdAt: new Date(createdAt.getTime() + 36e5 * 6),
        },
      });
    }

    if (sample.status === 'done') {
      await prisma.ticketEvent.create({
        data: {
          ticketId: ticket.id,
          actorId: admin.id,
          status: 'done',
          note: 'Serviço executado e local liberado.',
          createdAt: new Date(createdAt.getTime() + 36e5 * 30),
        },
      });
    }
  }

  await prisma.ticketCounter.create({ data: { year, lastSeq: BigInt(seq) } });

  console.log(`Seed concluído: 1 admin, ${citizens.length} cidadãos, ${SAMPLES.length} chamados.`);
  console.log('Login: gestor@prefeitura.gov.br | joao@email.com | ana@email.com — senha: senha123');
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
