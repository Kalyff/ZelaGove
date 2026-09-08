import {
  Button,
  ErrorState,
  Field,
  IconEye,
  IconEyeOff,
  IconButton,
  Input,
} from '@zeladoria/ui';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, useAuth } from '@zeladoria/client';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setFormError(null);
    setFieldErrors({});
    try {
      await signIn(email, password);
      navigate('/chamados', { replace: true });
    } catch (err) {
      /* O servidor já mandava `field` em todo erro de validação e nenhuma tela
         lia. Com ele, a mensagem aparece NO campo em vez de num aviso genérico
         no topo que não diz qual dos dois está errado. */
      if (err instanceof ApiError && err.field) {
        setFieldErrors({ [err.field]: err.message });
      } else {
        setFormError(err instanceof Error ? err.message : 'Não foi possível entrar.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-1 flex-col justify-center px-7 py-10">
      <p className="font-mono text-[11px] uppercase tracking-[0.3em] text-accent">gov.br</p>
      <h1 className="mt-2 font-display text-3xl font-extrabold text-content">
        Zeladoria<span className="text-success-onSoft">.gov</span>
      </h1>
      <p className="mt-2 text-sm text-content-secondary">
        Entre para abrir e acompanhar seus chamados.
      </p>

      <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-4">
        <Field label="E-mail" required error={fieldErrors.email}>
          {(p) => (
            <Input
              {...p}
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="voce@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          )}
        </Field>

        <Field label="Senha" required error={fieldErrors.password}>
          {(p) => (
            <div className="relative">
              <Input
                {...p}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                placeholder="Sua senha"
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

        {formError && <ErrorState title="Não foi possível entrar" description={formError} />}

        {/* `loading` mantém o rótulo e adiciona spinner + aria-busy. Trocar o
            texto por "Entrando..." muda a largura do botão e apaga o nome
            acessível no meio da ação. */}
        <Button type="submit" size="lg" fullWidth loading={busy}>
          Entrar com gov.br
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
