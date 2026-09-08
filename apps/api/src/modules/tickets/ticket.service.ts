import type { Prisma, Ticket } from '@prisma/client';
import type {
  AppendExternalProtocolInput,
  CreateTicketInput,
  ForwardTicketInput,
  UpdateTicketStatusInput,
} from '@zeladoria/shared';
import { Errors } from '../../http/errors';
import { prisma } from '../../infra/prisma';

/**
 * COMANDOS de chamado — tudo o que escreve.
 *
 * Toda função aqui é transacional pelo mesmo motivo: status e evento são a
 * mesma verdade contada de dois jeitos, e gravar um sem o outro deixa a
 * auditoria sem bater com a realidade. As leituras ficam em `ticket.queries.ts`.
 */

/**
 * Protocolo sequencial anual (2026-0000123).
 * Roda DENTRO da transação de criação: se a criação falhar, o incremento volta
 * atrás junto e não sobra lacuna na numeração — o que importa em contexto
 * público, onde protocolo faltando vira questionamento.
 *
 * Custo assumido: serializa a criação na linha do ano corrente. Irrelevante no
 * volume previsto; se um dia houver pico de milhares de aberturas simultâneas,
 * a saída é aceitar lacunas usando SEQUENCE.
 */
async function nextProtocol(tx: Prisma.TransactionClient): Promise<string> {
  const rows = await tx.$queryRaw<Array<{ year: number; last_seq: bigint }>>`
    INSERT INTO ticket_counters (year, last_seq)
    VALUES (EXTRACT(YEAR FROM now())::int, 1)
    ON CONFLICT (year) DO UPDATE SET last_seq = ticket_counters.last_seq + 1
    RETURNING year, last_seq
  `;

  const row = rows[0];
  return `${row.year}-${String(row.last_seq).padStart(7, '0')}`;
}

export async function createTicket(
  userId: string,
  input: CreateTicketInput,
  photoKey: string | null
): Promise<Ticket> {
  return prisma.$transaction(async (tx) => {
    const protocol = await nextProtocol(tx);

    const ticket = await tx.ticket.create({
      data: {
        protocol,
        userId,
        title: input.title,
        description: input.description,
        category: input.category,
        latitude: input.latitude,
        longitude: input.longitude,
        photoKey,
        status: 'pending', // Requisito 4.1: todo chamado nasce Pendente.
      },
    });

    // Requisito 4.2: o primeiro evento é automático.
    await tx.ticketEvent.create({
      data: { ticketId: ticket.id, actorId: userId, status: 'pending', note: 'Chamado aberto', photoKey },
    });

    return ticket;
  });
}

/**
 * Requisito 4.1 + 4.2: a transição é livre entre quaisquer status, EXCETO que
 * concluir exige observação. Status e evento são gravados na mesma transação —
 * nunca escreva um sem o outro, ou a auditoria deixa de bater com a realidade.
 */
export async function updateTicketStatus(
  ticketId: string,
  actorId: string,
  input: UpdateTicketStatusInput,
  photoKey: string | null
) {
  if (input.status === 'done' && !input.note?.trim()) {
    throw Errors.completionNoteRequired();
  }
  // Segunda linha de defesa: o schema já recusa, mas esta rota é o caminho do
  // arrasto e um chamado encaminhado sem órgão é um beco sem saída silencioso.
  if (input.status === 'forwarded') {
    throw Errors.useForwardEndpoint();
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.ticket.findUnique({ where: { id: ticketId } });
    if (!existing) throw Errors.ticketNotFound();

    const ticket = await tx.ticket.update({
      where: { id: ticketId },
      data: {
        status: input.status,
        /**
         * Sair de `forwarded` LIMPA o cache do órgão.
         *
         * O campo significa "órgão do encaminhamento vigente". Deixá-lo
         * preenchido num chamado que voltou para a fila municipal faria o
         * cidadão ler "é de responsabilidade da concessionária" logo abaixo de
         * um selo "Pendente" — e a prefeitura, que retomou o chamado,
         * pareceria estar empurrando de novo.
         *
         * Não é perda de histórico: cada encaminhamento continua no seu evento,
         * que é imutável. É exatamente por isso que o dado mora lá.
         */
        forwardedToId: null,
      },
      include: { forwardedTo: true },
    });

    await tx.ticketEvent.create({
      data: {
        ticketId,
        actorId,
        status: input.status,
        note: input.note?.trim() || null,
        photoKey,
      },
    });

    return ticket;
  });
}

/**
 * Encaminha a órgão externo.
 *
 * Grava três coisas na MESMA transação, pelo mesmo motivo de sempre: o status,
 * o evento (que é a verdade auditável de para onde foi) e o cache no ticket.
 *
 * O órgão vai no EVENTO. Se vivesse só no ticket, um chamado encaminhado à
 * concessionária, revertido e reencaminhado ao saneamento teria dois eventos
 * "encaminhado" sem órgão em nenhum — e a pergunta que o repasse existe para
 * responder ficaria sem resposta.
 *
 * A entrega ao órgão é MANUAL: isto registra e audita, não envia nada.
 */
export async function forwardTicket(
  ticketId: string,
  actorId: string,
  input: ForwardTicketInput
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.ticket.findUnique({ where: { id: ticketId } });
    if (!existing) throw Errors.ticketNotFound();

    const agency = await tx.agency.findFirst({
      where: { id: input.agencyId, active: true },
    });
    if (!agency) throw Errors.agencyNotFound();

    const ticket = await tx.ticket.update({
      where: { id: ticketId },
      data: { status: 'forwarded', forwardedToId: agency.id },
      /* Sem o include, a resposta sai com `forwardedTo: null` e quem chamou não
         sabe para onde acabou de encaminhar — o painel anunciaria um
         encaminhamento sem destino logo depois de exigir um. */
      include: { forwardedTo: true },
    });

    await tx.ticketEvent.create({
      data: {
        ticketId,
        actorId,
        status: 'forwarded',
        note: input.note.trim(),
        agencyId: agency.id,
        externalProtocol: input.externalProtocol?.trim() || null,
      },
    });

    return ticket;
  });
}

/**
 * Anota o protocolo que o órgão devolveu — em geral dias depois.
 *
 * É um evento próprio, sem mudar o status: o chamado continua encaminhado, só
 * passou a ter um número de acompanhamento. Só existe porque o campo mora no
 * evento; se vivesse no ticket, seria um UPDATE que apagaria o histórico.
 */
export async function appendExternalProtocol(
  ticketId: string,
  actorId: string,
  input: AppendExternalProtocolInput
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.ticket.findUnique({ where: { id: ticketId } });
    if (!existing) throw Errors.ticketNotFound();
    if (existing.status !== 'forwarded') throw Errors.notForwarded();

    await tx.ticketEvent.create({
      data: {
        ticketId,
        actorId,
        status: 'forwarded', // inalterado: o evento anota, não transiciona
        note: input.note?.trim() || 'Protocolo do órgão registrado.',
        agencyId: existing.forwardedToId,
        externalProtocol: input.externalProtocol.trim(),
      },
    });

    // `updatedAt` precisa mexer para a listagem reordenar.
    return tx.ticket.update({
      where: { id: ticketId },
      data: {},
      include: { forwardedTo: true },
    });
  });
}
