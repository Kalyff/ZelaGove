import { useQuery } from '@tanstack/react-query';
import { ErrorState, Skeleton } from '@zeladoria/ui';
import { TicketsMap } from '../components/TicketsMap';
import { listMapPoints } from '../lib/api';

export default function MapZones() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['map-points'],
    queryFn: listMapPoints,
  });

  if (isError) {
    return (
      <ErrorState
        title="Não foi possível carregar o mapa"
        description="Os pontos não chegaram. Verifique a conexão com a API."
        onRetry={() => refetch()}
      />
    );
  }

  return (
    /* `h-full` em vez do `h-[calc(100vh-9.5rem)]` mágico de antes: o Shell
       marca esta rota como não-rolável e entrega a altura exata. Aquele 9.5rem
       era a soma do header com os paddings, e quebrava a cada mudança neles.
       O piso evita o mapa virar uma faixa fina em tela baixa. */
    <div className="h-full min-h-[24rem]">
      {isLoading ? (
        <Skeleton className="h-full w-full rounded-card" />
      ) : (
        <TicketsMap points={data?.data ?? []} />
      )}
    </div>
  );
}
