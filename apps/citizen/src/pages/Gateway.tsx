import { IconChevronRight, SkipLink, ThemeToggle } from '@zeladoria/ui';
import { m } from 'framer-motion';
import { Link } from 'react-router-dom';

const ADMIN_URL = import.meta.env.VITE_ADMIN_URL ?? 'http://localhost:5174';

/**
 * Requisito 2.3. Vive no app do cidadão porque é o front público; em produção
 * os dois apps ficam atrás do mesmo proxy e o gateway responde na raiz.
 */
export default function Gateway() {
  return (
    /* A capa institucional é escura nos dois temas — é a identidade gov.br, não
       uma superfície do tema. No escuro só aprofunda. */
    <main
      id="conteudo"
      className="flex min-h-[100dvh] flex-col bg-gov-blue-900 text-chrome dark:bg-gov-blue-950"
    >
      <SkipLink />
      <div className="flex h-1.5 shrink-0" aria-hidden>
        <div className="w-2/3 bg-stripe-a" />
        <div className="w-1/3 bg-stripe-b" />
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
        <div className="mb-8 flex justify-end">
          <ThemeToggle onChrome />
        </div>

        <p className="font-mono text-xs uppercase tracking-[0.3em] text-gov-yellow-400">gov.br</p>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight">
          Zeladoria<span className="text-gov-yellow-400">.gov</span>
        </h1>
        <p className="mt-4 text-[15px] leading-relaxed text-chrome-secondary">
          Buraco na rua, poste apagado, bueiro entupido. Você registra, a prefeitura responde, e
          todo mundo acompanha o que foi feito.
        </p>

        {/* Card claro fixo nos dois temas. Usar `bg-surface` aqui faria o card
            virar quase-preto no escuro e a distinção entre a opção primária e a
            secundária desapareceria — as duas ficariam retângulos escuros sobre
            fundo escuro. */}
        <div className="mt-10 space-y-3">
          <m.div whileHover={{ y: -2 }} whileTap={{ scale: 0.985 }}>
            <Link
              to="/entrar"
              className="flex min-h-[72px] items-center justify-between gap-4 rounded-card bg-ink-50 px-5 py-4 text-ink-900"
            >
              <span>
                <span className="block font-display text-base font-bold">Sou cidadão</span>
                <span className="text-sm text-ink-600">Abrir e acompanhar chamados</span>
              </span>
              <IconChevronRight className="h-5 w-5 shrink-0 text-ink-500" />
            </Link>
          </m.div>

          <m.div whileHover={{ y: -2 }} whileTap={{ scale: 0.985 }}>
            <a
              href={ADMIN_URL}
              className="flex min-h-[72px] items-center justify-between gap-4 rounded-card border border-white/25 px-5 py-4 transition-colors hover:border-white/50"
            >
              <span>
                <span className="block font-display text-base font-bold">Sou servidor</span>
                <span className="text-sm text-chrome-secondary">Portal da prefeitura</span>
              </span>
              <IconChevronRight className="h-5 w-5 shrink-0 text-chrome-tertiary" />
            </a>
          </m.div>
        </div>
      </div>
    </main>
  );
}
