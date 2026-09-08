import { describe, expect, it } from 'vitest';
import {
  createTicketSchema,
  registerSchema,
  forwardTicketSchema,
  listTicketsQuerySchema,
  updateTicketStatusSchema,
} from '../src/schemas';

/**
 * Requisito 4.1 — a regra que mais quebra em silêncio.
 * Se este schema deixar passar 'done' sem nota, o chamado é concluído sem
 * ninguém documentar o que foi feito, e a trilha de auditoria vira ficção.
 * O modal do painel usa a mesma regra, mas quem manda é o servidor.
 */
describe('updateTicketStatusSchema', () => {
  it('recusa conclusão sem observação', () => {
    const result = updateTicketStatusSchema.safeParse({ status: 'done' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['note']);
    }
  });

  it('recusa conclusão com observação só de espaços', () => {
    // O trim do Zod roda antes do superRefine, então '   ' vira '' e cai na regra.
    expect(updateTicketStatusSchema.safeParse({ status: 'done', note: '   ' }).success).toBe(false);
  });

  it('aceita conclusão com observação', () => {
    const result = updateTicketStatusSchema.safeParse({
      status: 'done',
      note: 'Buraco tapado e via liberada.',
    });
    expect(result.success).toBe(true);
  });

  it('aceita os demais status sem observação — a transição é livre', () => {
    expect(updateTicketStatusSchema.safeParse({ status: 'pending' }).success).toBe(true);
    expect(updateTicketStatusSchema.safeParse({ status: 'in_progress' }).success).toBe(true);
  });

  it('recusa status inexistente', () => {
    expect(updateTicketStatusSchema.safeParse({ status: 'cancelado' }).success).toBe(false);
  });

  /**
   * Esta rota também é a do ARRASTO no Kanban, que não tem como informar o
   * órgão. Se ela aceitasse `forwarded`, soltar um card produziria um chamado
   * encaminhado para lugar nenhum — terminal, sem órgão e sem justificativa.
   */
  it('recusa `forwarded` — encaminhar tem rota própria', () => {
    const result = updateTicketStatusSchema.safeParse({
      status: 'forwarded',
      note: 'É da concessionária.',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['status']);
    }
  });
});

describe('forwardTicketSchema', () => {
  const valid = {
    agencyId: '3f1c9f4e-0c4a-4a0b-9d1e-2b7c8a5f6d10',
    note: 'Poste na rede de distribuição da concessionária.',
  };

  it('exige órgão — encaminhar sem destino é beco sem saída', () => {
    const result = forwardTicketSchema.safeParse({ note: valid.note });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toEqual(['agencyId']);
    }
  });

  it('exige justificativa — é o que impede o encaminhamento de virar lixeira', () => {
    expect(forwardTicketSchema.safeParse({ agencyId: valid.agencyId, note: '  ' }).success).toBe(
      false,
    );
  });

  /**
   * O número do outro órgão quase nunca existe no momento do encaminhamento:
   * chega dias depois. Exigi-lo aqui obrigaria o operador a inventar ou a adiar
   * o registro inteiro.
   */
  it('aceita sem protocolo externo', () => {
    expect(forwardTicketSchema.safeParse(valid).success).toBe(true);
  });
});

describe('listTicketsQuerySchema', () => {
  it('aceita um status só', () => {
    const result = listTicketsQuerySchema.safeParse({ status: 'forwarded' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toEqual(['forwarded']);
  });

  /* O quadro pede exatamente os três operacionais. Sem isso os encaminhados
     ocupariam o teto de 100 linhas e empurrariam pendentes para fora. */
  it('aceita vários status separados por vírgula', () => {
    const result = listTicketsQuerySchema.safeParse({ status: 'pending,in_progress,done' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toEqual(['pending', 'in_progress', 'done']);
  });

  it('recusa a lista inteira quando um dos valores é inválido', () => {
    expect(listTicketsQuerySchema.safeParse({ status: 'pending,cancelado' }).success).toBe(false);
  });

  it('sem status devolve undefined — a listagem não filtra', () => {
    const result = listTicketsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.status).toBeUndefined();
  });
});

describe('createTicketSchema', () => {
  const valid = {
    title: 'Buraco na via',
    description: 'Buraco grande em frente ao número 120.',
    category: 'paving',
    latitude: '-9.97499',
    longitude: '-67.8243',
  };

  it('converte coordenadas que chegam como texto no multipart', () => {
    const result = createTicketSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.latitude).toBeCloseTo(-9.97499);
      expect(typeof result.data.latitude).toBe('number');
    }
  });

  it('recusa coordenadas fora do intervalo geográfico', () => {
    expect(createTicketSchema.safeParse({ ...valid, latitude: '120' }).success).toBe(false);
    expect(createTicketSchema.safeParse({ ...valid, longitude: '-999' }).success).toBe(false);
  });

  it('recusa categoria fora da lista fixa', () => {
    expect(createTicketSchema.safeParse({ ...valid, category: 'buraco' }).success).toBe(false);
  });

  it('recusa título vazio', () => {
    expect(createTicketSchema.safeParse({ ...valid, title: '  ' }).success).toBe(false);
  });
});

/**
 * O cadastro é o único caminho pelo qual uma conta nasce a pedido de um
 * desconhecido. O que este schema deixa passar vira usuário no banco.
 */
describe('registerSchema', () => {
  const valido = { name: 'Ana Beatriz', email: 'ana@email.com', password: 'senha-de-verdade' };

  it('aceita um cadastro completo', () => {
    expect(registerSchema.safeParse(valido).success).toBe(true);
  });

  /* É o `.trim().toLowerCase()` que faz o e-mail colidir com o já cadastrado na
     constraint de unicidade, em vez de abrir uma segunda conta para a mesma
     pessoa. */
  it('normaliza o e-mail para caixa baixa e sem espaços', () => {
    const parsed = registerSchema.parse({ ...valido, email: '  ANA@Email.com  ' });
    expect(parsed.email).toBe('ana@email.com');
  });

  it('recusa senha com menos de 8 caracteres, apontando o campo', () => {
    const res = registerSchema.safeParse({ ...valido, password: 'curta' });
    expect(res.success).toBe(false);
    if (!res.success) expect(res.error.issues[0].path).toEqual(['password']);
  });

  /* Teto contra negação de serviço: cada tentativa custa um `scrypt`, que é
     caro de propósito. */
  it('recusa senha absurdamente longa', () => {
    expect(registerSchema.safeParse({ ...valido, password: 'a'.repeat(5000) }).success).toBe(false);
  });

  it('recusa e-mail inválido', () => {
    expect(registerSchema.safeParse({ ...valido, email: 'nao-e-email' }).success).toBe(false);
  });

  /**
   * O PAPEL NÃO É ESCOLHIDO PELO CLIENTE. O schema nem declara `role`, então o
   * zod descarta a chave — se ela um dia sobreviver ao parse e chegar ao
   * `prisma.user.create`, qualquer pessoa vira gestor pelo formulário público.
   */
  it('descarta `role` vindo do corpo', () => {
    const parsed = registerSchema.parse({ ...valido, role: 'admin' });
    expect(parsed).not.toHaveProperty('role');
  });
});
