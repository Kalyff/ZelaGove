import { PrefeituraLogo } from '@zeladoria/ui';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@zeladoria/client';

const CITIZEN_URL = import.meta.env.VITE_CITIZEN_URL ?? 'http://localhost:5173';

/**
 * Requisito 3.2.1: layout dividido em duas colunas — dentro de um cartão
 * centralizado. Com as colunas ocupando metade da tela cada, o azul virava um
 * painel de ~950 × 1000 px com o conteúdo numa faixa estreita no meio.
 */
export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(email, password);
      navigate('/painel/visao-geral', { replace: true });
    } catch {
      // Mensagem única, sem distinguir e-mail inexistente de senha errada.
      setError('Acesso negado.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-sunken p-4 sm:p-8">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-panel bg-surface shadow-lift lg:grid-cols-2">
        <div className="flex flex-col gap-6 bg-gov-blue-900 p-8 text-chrome dark:bg-gov-blue-950 lg:justify-between lg:gap-8 lg:p-10">
          <div className="flex h-1.5 w-40" aria-hidden>
            <div className="w-2/3 bg-stripe-a" />
            <div className="w-1/3 bg-stripe-b" />
          </div>
          <div>
            {/* Sobre o azul institucional o brasão precisa da placa clara: a ponte
                e o texto do logo são pretos. */}
            <PrefeituraLogo size={88} />
            <p className="mt-6 font-mono text-xs uppercase tracking-[0.3em] text-gov-yellow-400">gov.br</p>
            <h1 className="mt-3 font-display text-3xl font-extrabold leading-tight">Portal do Servidor</h1>
            {/* Justificado com hifenização (o `lang="pt-BR"` do index.html dá o
                dicionário): sem ela, a coluna estreita abre buracos entre as
                palavras para alinhar as duas margens. */}
            <p className="mt-4 hyphens-auto text-justify text-[15px] leading-relaxed text-chrome-secondary">
              Gestão operacional dos chamados de zeladoria urbana: acompanhamento, despacho de equipes
              e registro do que foi executado.
            </p>
          </div>
          <p className="hyphens-auto text-justify text-xs text-chrome-tertiary">
            Zeladoria.gov — uso exclusivo de servidores designados.
          </p>
        </div>

        <div className="flex flex-col justify-center p-8 lg:p-10">
          <h2 className="font-display text-2xl font-extrabold text-content">Acesso restrito</h2>
          <p className="mt-1 text-sm text-content-secondary">Use seu e-mail corporativo.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="field-label">E-mail corporativo</label>
              <input
                id="email" type="email" required autoComplete="email"
                value={email} onChange={(e) => setEmail(e.target.value)}
                className="field-input" placeholder="nome@prefeitura.gov.br"
              />
            </div>
            <div>
              <label htmlFor="password" className="field-label">Senha</label>
              <input
                id="password" type="password" required autoComplete="current-password"
                value={password} onChange={(e) => setPassword(e.target.value)}
                className="field-input" placeholder="••••••••"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger-onSoft">{error}</p>
            )}

            <button
              type="submit" disabled={busy}
              className="w-full rounded-xl bg-accent py-3 font-display font-bold text-accent-on transition hover:bg-accent-hover disabled:saturate-50"
            >
              {busy ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <a href={CITIZEN_URL} className="mt-6 block text-center text-sm font-semibold text-content-secondary underline">
            Voltar ao início
          </a>
        </div>
      </div>
    </div>
  );
}
