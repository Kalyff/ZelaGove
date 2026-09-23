import { ApiError, useAuth } from '@zeladoria/client';
import {
  Button,
  ErrorState,
  Field,
  IconButton,
  IconEye,
  IconEyeOff,
  Input,
  PrefeituraLogo,
  cn,
} from '@zeladoria/ui';
import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

type Modo = 'entrar' | 'cadastrar';

const TEXTOS = {
  entrar: {
    descricao: 'Entre para abrir e acompanhar seus chamados.',
    acao: 'Entrar',
    falha: 'Não foi possível entrar',
  },
  cadastrar: {
    descricao: 'Crie sua conta para registrar problemas na sua rua.',
    acao: 'Criar conta e entrar',
    falha: 'Não foi possível criar a conta',
  },
} satisfies Record<Modo, { descricao: string; acao: string; falha: string }>;

export default function Login() {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [modo, setModo] = useState<Modo>('entrar');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  /* Refs em vez de `getElementById`: o `Field` gera o `id` internamente para
     casar `<label for>` com o controle, e fixar um id por fora quebraria essa
     associação. */
  const nomeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  const cadastrando = modo === 'cadastrar';
  const textos = TEXTOS[modo];

  /**
   * Trocar de modo limpa o erro e leva o foco ao primeiro campo do formulário
   * novo. Sem isso, quem usa teclado continuaria com o foco num botão enquanto o
   * formulário mudou por baixo, e a mensagem de erro do login sobreviveria em
   * cima de um cadastro que ainda nem foi enviado.
   */
  function trocarModo(proximo: Modo) {
    if (proximo === modo) return;
    setModo(proximo);
    setFormError(null);
    setFieldErrors({});
    queueMicrotask(() => (proximo === 'cadastrar' ? nomeRef : emailRef).current?.focus());
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      if (cadastrando) await signUp(name, email, password);
      else await signIn(email, password);
      navigate('/chamados', { replace: true });
    } catch (err) {
      /* O servidor manda `field` em todo erro de validação — com ele a mensagem
         aparece NO campo em vez de num aviso genérico no topo que não diz qual
         dos três está errado. É por aqui que "Este e-mail já tem cadastro"
         chega no campo de e-mail. */
      if (err instanceof ApiError && err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setFormError(err instanceof Error ? err.message : 'Não foi possível continuar.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-7 py-10">
      {/* O brasão antes do nome do produto: quem abre esta tela precisa saber de
          qual prefeitura é o serviço antes de digitar e-mail e senha nele. */}
      <PrefeituraLogo size={84} />
      <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.3em] text-accent">gov.br</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-content">
        Zeladoria<span className="text-success-onSoft">.gov</span>
      </h1>
      <p className="mt-2 text-sm text-content-secondary">{textos.descricao}</p>

      {/* Alternador entre os dois modos.
          Botões com `aria-pressed`, e não abas com `role="tablist"`: aba
          promete navegação por setas, que ninguém implementou aqui. Prometer
          menos e cumprir é melhor que anunciar um padrão pela metade. */}
      <div className="mt-6 flex gap-1 rounded-field bg-surface-sunken p-1">
        {(['entrar', 'cadastrar'] as const).map((valor) => (
          <button
            key={valor}
            type="button"
            aria-pressed={modo === valor}
            onClick={() => trocarModo(valor)}
            className={cn(
              'min-h-11 flex-1 rounded-field font-display text-sm font-bold transition-colors',
              modo === valor
                ? 'bg-surface text-content shadow-panel'
                : 'text-content-secondary hover:text-content',
            )}
          >
            {valor === 'entrar' ? 'Entrar' : 'Criar conta'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
        {cadastrando && (
          <Field label="Nome" required error={fieldErrors.name}>
            {(p) => (
              <Input
                {...p}
                ref={nomeRef}
                autoComplete="name"
                maxLength={120}
                placeholder="Como você quer ser chamado"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            )}
          </Field>
        )}

        <Field label="E-mail" required error={fieldErrors.email}>
          {(p) => (
            <Input
              {...p}
              ref={emailRef}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>

        <Field
          label="Senha"
          required
          error={fieldErrors.password}
          hint={cadastrando ? 'Pelo menos 8 caracteres.' : undefined}
        >
          {(p) => (
            <div className="relative">
              <Input
                {...p}
                type={showPassword ? 'text' : 'password'}
                /* `new-password` no cadastro: é o que faz o gerenciador de
                   senhas oferecer uma senha nova em vez de tentar preencher com
                   uma antiga que não existe. */
                autoComplete={cadastrando ? 'new-password' : 'current-password'}
                placeholder={cadastrando ? 'Crie uma senha' : 'Sua senha'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="pr-12"
              />
              {/* Digitar senha no celular é onde mais se erra sem perceber. */}
              <IconButton
                label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-0 top-1/2 -translate-y-1/2"
              >
                {showPassword ? <IconEyeOff className="h-5 w-5" /> : <IconEye className="h-5 w-5" />}
              </IconButton>
            </div>
          )}
        </Field>

        {formError && <ErrorState title={textos.falha} description={formError} />}

        {/* `loading` mantém o rótulo e adiciona spinner + aria-busy. Trocar o
            texto por "Entrando..." muda a largura do botão e apaga o nome
            acessível no meio da ação. */}
        <Button type="submit" size="lg" fullWidth loading={busy}>
          {textos.acao}
        </Button>
      </form>

      <Link
        to="/"
        className="mt-6 block text-center text-sm font-semibold text-content-secondary underline"
      >
        Voltar ao início
      </Link>
    </div>
  );
}
