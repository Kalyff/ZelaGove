import { useQuery } from '@tanstack/react-query';
import {
  Card,
  ErrorState,
  EmptyState,
  IconAlert,
  IconCheck,
  IconChevronRight,
  IconClock,
  IconInbox,
  IconStack,
  Skeleton,
  SkeletonText,
  StatusBadge,
  useReducedMotionSafe,
} from '@zeladoria/ui';
import { animate, m, useMotionValue, useTransform } from 'framer-motion';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { StatusDistribution } from '../components/StatusDistribution';
import { getMetrics } from '../lib/api';
import { dateTime } from '../lib/format';

type Tone = 'plain' | 'amber' | 'blue' | 'green';

/**
 * Os quatro tons produziam chrome IDÊNTICO em três deles — só a cor do ícone
 * mudava, então "Pendentes" e "Em andamento" liam como o mesmo card. Agora
 * cada tom tem régua superior, chip de ícone tingido e cor no valor.
 */
const TONE: Record<Tone, { rule: string; chip: string; value: string }> = {
  plain: {
    rule: 'bg-line-strong',
    chip: 'bg-surface-sunken text-content-tertiary',
    value: 'text-content',
  },
  amber: {
    rule: 'bg-gov-amber-600 dark:bg-warn',
    chip: 'bg-warn-soft text-warn-onSoft',
    value: 'text-warn-onSoft',
  },
  blue: {
    rule: 'bg-accent',
    chip: 'bg-accent-soft text-accent-onSoft',
    value: 'text-accent-onSoft',
  },
  green: {
    rule: 'bg-gov-green-600 dark:bg-success',
    chip: 'bg-success-soft text-success-onSoft',
    value: 'text-success-onSoft',
  },
};

function CountUp({ value }: { value: number }) {
  const reduced = useReducedMotionSafe();
  const mv = useMotionValue(0);
  const text = useTransform(mv, (v) => Math.round(v).toLocaleString('pt-BR'));

  useEffect(() => {
    if (reduced) {
      /* Sob reduced motion o número vai direto ao valor final. Contagem
         crescente é decorativa: a informação é o total, não o caminho. */
      mv.set(value);
      return;
    }
    const controls = animate(mv, value, { duration: 0.7, ease: [0.16, 1, 0.3, 1] });
    return () => controls.stop();
  }, [value, reduced, mv]);

  return <m.span>{text}</m.span>;
}

function KpiCard({
  label,
  value,
  Icon,
  tone,
}: {
  label: string;
  value: number;
  Icon: typeof IconStack;
  tone: Tone;
}) {
  const t = TONE[tone];
  return (
    <Card className="overflow-hidden p-0">
      <div className={`h-1 w-full ${t.rule}`} aria-hidden />
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <p className="font-display text-xs font-bold uppercase tracking-[0.1em] text-content-tertiary">
            {label}
          </p>
          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${t.chip}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        {/* `tabular-nums` evita a largura do número dançar durante a contagem. */}
        <p className={`mt-3 font-display text-4xl font-extrabold tabular-nums ${t.value}`}>
          <CountUp value={value} />
        </p>
      </div>
    </Card>
  );
}

export default function Overview() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['metrics'],
    queryFn: getMetrics,
  });

  if (isError) {
    return (
      <ErrorState
        title="Não foi possível carregar os indicadores"
        description="Verifique a conexão com a API e tente novamente."
        onRetry={() => refetch()}
      />
    );
  }

  if (isLoading || !data) {
    return (
      <div className="space-y-8" aria-hidden>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-5">
              <div className="flex items-start justify-between">
                <SkeletonText className="w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
              </div>
              <Skeleton className="mt-4 h-9 w-16" />
            </Card>
          ))}
        </div>
        <Card className="overflow-hidden">
          <div className="border-b border-line px-6 py-4">
            <SkeletonText className="w-40" />
          </div>
          <div className="divide-y divide-line">
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between gap-4 px-6 py-4">
                <div className="flex-1 space-y-2">
                  <SkeletonText className="w-1/2" />
                  <SkeletonText className="w-1/3" />
                </div>
                <Skeleton className="h-[26px] w-24 rounded-full" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard label="Total de chamados" value={data.total} Icon={IconStack} tone="plain" />
        <KpiCard label="Pendentes" value={data.pending} Icon={IconAlert} tone="amber" />
        <KpiCard label="Em andamento" value={data.inProgress} Icon={IconClock} tone="blue" />
        <KpiCard label="Resolvidos" value={data.done} Icon={IconCheck} tone="green" />
      </div>

      <StatusDistribution
        counts={data.byStatus}
        total={data.total}
      />

      <section className="card overflow-hidden">
        <header className="border-b border-line px-6 py-4">
          <h2 className="font-display text-base font-extrabold text-content">Atividade recente</h2>
        </header>

        {data.recent.length === 0 ? (
          <EmptyState
            Icon={IconInbox}
            title="Nenhum chamado registrado ainda."
            description="Assim que o primeiro chegar, ele aparece aqui."
          />
        ) : (
          <ul className="divide-y divide-line">
            {data.recent.map((ticket) => (
              <li key={ticket.id}>
                {/* As linhas eram mortas: mostravam o chamado e não levavam a
                    ele. Agora abrem a ordem direto no Kanban. */}
                <Link
                  to={`/painel/ordens?ticket=${ticket.id}`}
                  className="flex items-center justify-between gap-4 px-6 py-3.5 transition-colors hover:bg-surface-sunken"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-content">{ticket.title}</p>
                    <p className="text-xs text-content-tertiary">
                      {ticket.categoryLabel} · {dateTime(ticket.createdAt)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <StatusBadge status={ticket.status} label={ticket.statusLabel} />
                    <IconChevronRight className="h-4 w-4 text-content-tertiary" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
