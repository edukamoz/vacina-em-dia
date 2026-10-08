/** Raio médio da Terra, em metros. */
const EARTH_RADIUS_M = 6_371_000;

/** Um ponto na Terra, em graus decimais. */
export interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Distância em linha reta entre dois pontos (fórmula de haversine), em metros. É a distância "de
 * passarinho", não a do caminho a pé ou de carro.
 *
 * @param a - Primeiro ponto.
 * @param b - Segundo ponto.
 * @returns Distância em metros.
 */
export function distanceMeters(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Caixa de coordenadas (retângulo) que contém o círculo de um raio em volta do ponto. Serve para
 * descartar de longe os pontos que certamente estão fora do raio, antes de calcular a distância.
 *
 * @param center - Centro do círculo.
 * @param radiusMeters - Raio, em metros.
 */
export function boundingBox(
  center: GeoPoint,
  radiusMeters: number,
): { minLat: number; maxLat: number; minLon: number; maxLon: number } {
  const dLat = (radiusMeters / EARTH_RADIUS_M) * (180 / Math.PI);
  const cosLat = Math.max(0.01, Math.cos(toRadians(center.latitude)));
  const dLon = dLat / cosLat;
  return {
    minLat: center.latitude - dLat,
    maxLat: center.latitude + dLat,
    minLon: center.longitude - dLon,
    maxLon: center.longitude + dLon,
  };
}
