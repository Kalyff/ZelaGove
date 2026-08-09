/**
 * Distância entre dois pontos, para a lista "Na cidade" do app do cidadão.
 *
 * Mora em `shared` e não no app pelo mesmo motivo de `forwardedNotice`: é regra
 * de apresentação com matemática dentro, erra em silêncio (uma distância errada
 * parece plausível) — e aqui existe suíte de testes, enquanto `apps/citizen`
 * não tem nenhuma.
 */

export interface Point {
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS_M = 6_371_000;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Haversine, em metros.
 *
 * Trata a Terra como esfera. O erro contra o elipsoide fica abaixo de 0,5%, o
 * que numa lista que diz "a 180 m" é irrelevante — e a alternativa (Vincenty)
 * traria iteração e casos de não-convergência para ganhar nada visível.
 */
export function distanceBetween(a: Point, b: Point): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

/**
 * "180 m", "1,2 km".
 *
 * Abaixo de 1 km arredonda para 10 m: o GPS de celular erra mais que isso, e
 * "a 183 m" finge uma precisão que o aparelho não tem. Acima, uma casa decimal
 * com vírgula — separador decimal do português.
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters / 10) * 10} m`;
  }
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}
