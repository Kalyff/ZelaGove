/**
 * Cria a PRIMEIRA conta de gestor de uma instalação.
 *
 * Existe porque o `seed.ts` não serve para isso: ele começa com um TRUNCATE de
 * todas as tabelas. Numa instalação nova de produção não há nenhum usuário, e
 * sem este script o único caminho para o primeiro login seria escrever SQL à
 * mão com um hash `scrypt` montado por fora — que é exatamente o tipo de
 * operação que se erra em silêncio.
 *
 *   npm run create-admin --workspace @zeladoria/api -- --email a@b.gov.br --nome "Fulana"
 *
 * Em produção, dentro do container (o `-it` importa: a senha é lida do
 * terminal):
 *
 *   docker compose -f docker-compose.prod.yml exec -it api \
 *     npx tsx prisma/create-admin.ts --email a@b.gov.br --nome "Fulana"
 *
 * A senha NUNCA é argumento de linha de comando. Argumento fica no histórico do
 * shell e aparece para qualquer usuário da máquina num `ps`. Ela é lida do
 * terminal com o eco desligado ou, quando a entrada não é um terminal, da
 * stdin — o que permite alimentá-la de um gerenciador de segredos sem que ela
 * passe pela linha de comando.
 *
 * Segue o padrão do `seed.ts` ao instanciar o PrismaClient direto: esta tarefa
 * precisa do banco e de mais nada, e passar por `infra/prisma.ts` arrastaria a
 * validação de `config/env.ts`, que exigiria segredos de JWT e de S3 para
 * cadastrar um usuário.
 */
import { PrismaClient } from '@prisma/client';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { hashPassword } from '../src/modules/auth/password';

const prisma = new PrismaClient();

/**
 * Piso de 12 caracteres, acima do que o seed usa em desenvolvimento.
 *
 * Esta é a conta que abre o back-office de um município inteiro, o sistema não
 * tem segundo fator e não tem tela de troca de senha — então a senha escolhida
 * aqui tende a durar. O `login` é limitado a 10 tentativas por 15 minutos, o
 * que protege contra força bruta online, não contra senha adivinhável.
 */
const MIN_SENHA = 12;

/**
 * Teclas de controle, que em modo raw chegam como caractere comum em vez de
 * virarem sinal ou edição de linha.
 */
const ENTER = ['\n', '\r'];
const CTRL_C = '\u0003';
const CTRL_D = '\u0004';
const BACKSPACE = ['\u007f', '\b'];

const argsSchema = z.object({
  email: z
    .string({ required_error: 'Informe --email.' })
    .trim()
    .toLowerCase()
    .email('E-mail inválido.'),
  nome: z
    .string({ required_error: 'Informe --nome.' })
    .trim()
    .min(2, 'Informe o nome completo em --nome.'),
});

const USO = `
Cria a primeira conta de gestor.

  --email   e-mail de acesso (obrigatório)
  --nome    nome exibido no painel (obrigatório)

A senha é pedida em seguida, sem eco. Para automatizar, mande pela stdin:
  echo -n 'a-senha' | npx tsx prisma/create-admin.ts --email a@b.gov.br --nome "Fulana"
`;

/** Lê do terminal sem ecoar o que é digitado. */
function pedirSenhaNoTerminal(pergunta: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const { stdin, stdout } = process;
    stdout.write(pergunta);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let valor = '';
    const aoDigitar = (pedaco: string) => {
      for (const ch of pedaco) {
        // Ctrl-D encerra junto com o Enter, para não travar em entrada vazia.
        if (ENTER.includes(ch) || ch === CTRL_D) {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', aoDigitar);
          stdout.write('\n');
          return resolve(valor);
        }
        // Em modo raw o Ctrl-C não vira sinal sozinho: sem tratá-lo aqui, não
        // haveria como abandonar o prompt.
        if (ch === CTRL_C) {
          stdin.setRawMode(false);
          stdin.pause();
          stdin.off('data', aoDigitar);
          stdout.write('\n');
          return reject(new Error('Cancelado.'));
        }
        if (BACKSPACE.includes(ch)) {
          valor = valor.slice(0, -1);
          continue;
        }
        valor += ch;
      }
    };

    stdin.on('data', aoDigitar);
  });
}

function lerStdin(): Promise<string> {
  return new Promise((resolve) => {
    let dados = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (pedaco) => (dados += pedaco));
    // A quebra de linha final é do `echo`, não faz parte da senha.
    process.stdin.on('end', () => resolve(dados.replace(/\r?\n$/, '')));
  });
}

async function obterSenha(): Promise<string> {
  // Entrada canalizada (pipe, arquivo, gerenciador de segredos): lê tudo e não
  // pede confirmação — não há quem confirme.
  if (!process.stdin.isTTY) return lerStdin();

  const senha = await pedirSenhaNoTerminal('Senha: ');
  const confirmacao = await pedirSenhaNoTerminal('Repita a senha: ');
  if (senha !== confirmacao) throw new Error('As senhas não conferem.');
  return senha;
}

async function main() {
  const { values } = parseArgs({
    options: { email: { type: 'string' }, nome: { type: 'string' } },
    allowPositionals: false,
  });

  const args = argsSchema.safeParse(values);
  if (!args.success) {
    console.error(args.error.issues.map((i) => `  - ${i.message}`).join('\n'));
    console.error(USO);
    process.exitCode = 1;
    return;
  }
  const { email, nome } = args.data;

  /* Recusa em vez de sobrescrever. Um script de bootstrap que troca em silêncio
     a senha de uma conta existente vira caminho de escalada para quem tenha o
     shell da máquina — e um jeito fácil de derrubar por engano o acesso do
     gestor que está de plantão. */
  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) {
    console.error(`Já existe uma conta com ${email} (papel: ${existente.role}).`);
    console.error('Este script só cria contas novas; ele não redefine senha.');
    process.exitCode = 1;
    return;
  }

  const senha = await obterSenha();
  if (senha.length < MIN_SENHA) {
    console.error(`A senha precisa de pelo menos ${MIN_SENHA} caracteres.`);
    process.exitCode = 1;
    return;
  }

  const usuario = await prisma.user.create({
    data: { name: nome, email, role: 'admin', passwordHash: await hashPassword(senha) },
  });

  console.log(`Gestor criado: ${usuario.name} <${usuario.email}>`);
  console.log('Entre pelo painel da prefeitura com este e-mail.');
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
