import L from 'leaflet';
import { useEffect, useMemo, useState } from 'react';
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from 'react-leaflet';
import {
  CATEGORY_LABELS,
  STATUS_LABELS_ADMIN,
  TICKET_STATUSES,
  type TicketStatus,
} from '@zeladoria/shared';
import {
  Button,
  DOT_STROKE,
  HEAT_OPACITY,
  HEAT_RADIUS_M,
  STATUS_HEX,
  STATUS_HEX_DARK,
  cn,
  useAnnouncer,
  useTheme,
} from '@zeladoria/ui';
import { Link } from 'react-router-dom';
import type { MapPointDTO } from '@zeladoria/shared';

const CENTER: [number, number] = [
  Number(import.meta.env.VITE_MAP_LAT ?? -9.97499),
  Number(import.meta.env.VITE_MAP_LNG ?? -67.8243),
];
const ZOOM = Number(import.meta.env.VITE_MAP_ZOOM ?? 13);

/**
 * Basemap CARTO em vez do OSM padrão.
 *
 * O OSM colorido disputa atenção com os círculos de status — o mapa vira uma
 * salada de cor e o dado, que é o ponto, fica em segundo plano. O Positron é
 * cinza e recua; o Dark Matter é o par escuro.
 * A atribuição precisa creditar OSM E CARTO.
 */
const TILES = {
  light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
  dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
} as const;

const ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>';

/**
 * Enquadra os pontos.
 *
 * Precisa ser um componente filho do MapContainer porque `useMap()` só existe
 * dentro do contexto do mapa. Roda uma vez quando os pontos chegam — sem isto
 * o mapa abre no centro fixo do `.env`, que pode não conter chamado nenhum.
 */
function FitBounds({ points, nonce }: { points: MapPointDTO[]; nonce: number }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    const bounds = L.latLngBounds(points.map((p) => [p.latitude, p.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [48, 48], maxZoom: 16 });
  }, [map, points, nonce]);

  return null;
}

/**
 * Requisito 3.2.4. Duas camadas por chamado: um círculo grande e translúcido
 * simulando zona de calor, e um ponto pequeno e preciso no centro.
 *
 * Nota: círculos sobrepostos não somam intensidade como um heatmap de verdade.
 * Para densidade real seria preciso um plugin de heatmap — o que os requisitos
 * descrevem, porém, é exatamente este desenho.
 */
export function TicketsMap({ points }: { points: MapPointDTO[] }) {
  const { theme } = useTheme();
  const { announce } = useAnnouncer();
  const hex = theme === 'dark' ? STATUS_HEX_DARK : STATUS_HEX;

  /* Sem filtro era impossível esconder os concluídos: numa cidade com histórico,
     o verde acumula e cobre justamente o que ainda demanda ação. */
  const [hidden, setHidden] = useState<Set<TicketStatus>>(() => new Set());
  const [fitNonce, setFitNonce] = useState(0);
  const [legendOpen, setLegendOpen] = useState(false);

  const visible = useMemo(
    () => points.filter((p) => !hidden.has(p.status)),
    [points, hidden],
  );

  function toggle(status: TicketStatus) {
    setHidden((old) => {
      const next = new Set(old);
      if (next.has(status)) next.delete(status);
      else next.add(status);
      return next;
    });
  }

  useEffect(() => {
    announce(`${visible.length} ${visible.length === 1 ? 'ponto' : 'pontos'} no mapa.`);
  }, [visible.length, announce]);

  return (
    <div className="relative h-full w-full overflow-hidden rounded-card border border-line">
      <MapContainer center={CENTER} zoom={ZOOM} scrollWheelZoom className="h-full w-full">
        {/* `key` força o remount da camada: trocar só a prop `url` deixa os
            tiles antigos em cache na tela até o próximo pan. */}
        <TileLayer key={theme} attribution={ATTRIBUTION} url={TILES[theme]} />

        <FitBounds points={visible} nonce={fitNonce} />

        {/* `Circle` (raio em METROS), não `CircleMarker` (raio em pixels).
            Em pixels o halo tinha sempre o mesmo tamanho na tela: ao afastar o
            zoom, halos de bairros distintos se sobrepunham até o mapa virar uma
            mancha sólida, e a "zona de calor" deixava de informar qualquer
            coisa. Em metros o halo representa área real e escala com o zoom. */}
        {visible.map((point) => (
          <Circle
            key={`heat-${point.id}`}
            center={[point.latitude, point.longitude]}
            radius={HEAT_RADIUS_M[point.status]}
            pathOptions={{
              color: 'transparent',
              fillColor: hex[point.status],
              fillOpacity: HEAT_OPACITY[point.status],
            }}
          />
        ))}

        {visible.map((point) => (
          <CircleMarker
            key={`dot-${point.id}`}
            center={[point.latitude, point.longitude]}
            radius={6}
            pathOptions={{
              color: DOT_STROKE[theme],
              weight: 1.5,
              fillColor: hex[point.status],
              fillOpacity: 1,
            }}
          >
            <Popup>
              <p className="font-display text-sm font-bold text-content">{point.title}</p>
              <p className="text-xs text-content-secondary">{CATEGORY_LABELS[point.category]}</p>
              <p className="mt-1 text-xs font-semibold" style={{ color: hex[point.status] }}>
                {STATUS_LABELS_ADMIN[point.status]}
              </p>
              <p className="mt-1 font-mono text-[10px] text-content-tertiary">{point.protocol}</p>
              {/* O mapa mostrava o problema e não levava a ele: para agir era
                  preciso decorar o protocolo e procurá-lo no Kanban. */}
              <Link
                to={`/painel/ordens?ticket=${point.id}`}
                className="mt-2 inline-block text-xs font-semibold text-accent underline"
              >
                Ver ordem de serviço
              </Link>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Painel de controle. `pointer-events-auto` porque agora ele age, não só
          informa. Abaixo de `sm` colapsa num botão para não cobrir o mapa. */}
      <div className="absolute bottom-4 left-4 z-[400] max-w-[calc(100%-2rem)]">
        <button
          type="button"
          onClick={() => setLegendOpen((v) => !v)}
          aria-expanded={legendOpen}
          className="mb-2 rounded-field border border-line bg-surface-raised/90 px-3 py-2 text-xs font-semibold text-content shadow-panel backdrop-blur sm:hidden"
        >
          {legendOpen ? 'Ocultar filtros' : 'Filtros e legenda'}
        </button>

        <div
          className={cn(
            'rounded-field border border-line bg-surface-raised/90 px-4 py-3 shadow-panel backdrop-blur',
            legendOpen ? 'block' : 'hidden sm:block',
          )}
        >
          <p className="field-label mb-2">Filtrar por status</p>
          <ul className="space-y-1">
            {TICKET_STATUSES.map((status) => {
              const on = !hidden.has(status);
              const count = points.filter((p) => p.status === status).length;
              return (
                <li key={status}>
                  <button
                    type="button"
                    onClick={() => toggle(status)}
                    aria-pressed={on}
                    className={cn(
                      'flex min-h-11 w-full items-center gap-2 rounded-field px-2 text-xs transition-colors sm:min-h-0 sm:py-1.5',
                      on ? 'text-content' : 'text-content-tertiary line-through',
                      'hover:bg-surface-sunken',
                    )}
                  >
                    <span
                      className="h-3 w-3 shrink-0 rounded-full ring-1 ring-inset ring-black/10"
                      style={{ backgroundColor: on ? hex[status] : 'transparent' }}
                    />
                    {STATUS_LABELS_ADMIN[status]}
                    <span className="ml-auto font-mono tabular-nums text-content-tertiary">
                      {count}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          <Button
            variant="secondary"
            size="sm"
            fullWidth
            className="mt-3"
            onClick={() => setFitNonce((n) => n + 1)}
            disabled={visible.length === 0}
          >
            Enquadrar chamados
          </Button>
        </div>
      </div>
    </div>
  );
}
