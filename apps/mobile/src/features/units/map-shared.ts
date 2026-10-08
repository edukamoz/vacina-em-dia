import type { HealthUnit } from '@vacina/shared';

/** O que o mapa precisa saber de cada unidade. */
export type MapUnit = Pick<HealthUnit, 'cnes' | 'name' | 'latitude' | 'longitude'>;

/** Posição da pessoa no mapa, se já foi obtida. */
export interface MapPosition {
  readonly latitude: number;
  readonly longitude: number;
}

/** Mapas do OpenStreetMap (sem chave de API). Uso leve, com a atribuição sempre visível. */
export const TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
/** Atribuição exigida pelo OpenStreetMap. */
export const TILE_ATTRIBUTION = '© colaboradores do OpenStreetMap';

/** Centro do mapa quando ainda não há posição nem unidades: o Brasil inteiro. */
export const BRAZIL_CENTER: readonly [number, number] = [-14.2, -51.9];

/** Cores do pino, vindas do tema do app. */
export interface PinColors {
  readonly fill: string;
  readonly selectedFill: string;
  readonly cross: string;
  readonly stroke: string;
}

/**
 * Pino do mapa em SVG (gota com uma cruz), 40 por 46 pixels. O selecionado fica maior e com outra
 * cor. É só desenho: o nome da unidade vai no rótulo do marcador.
 *
 * @param colors - Cores do tema.
 * @param selected - Se é a unidade escolhida.
 */
export function pinSvg(colors: PinColors, selected: boolean): string {
  const scale = selected ? 1.25 : 1;
  const fill = selected ? colors.selectedFill : colors.fill;
  return `<svg width="${Math.round(40 * scale)}" height="${Math.round(46 * scale)}" viewBox="0 0 56 64" aria-hidden="true"><path d="M28 61S8 42 8 25a20 20 0 0 1 40 0c0 17-20 36-20 36z" fill="${fill}" stroke="${colors.stroke}" stroke-width="3" stroke-linejoin="round"/><path d="M28 16v18M19 25h18" stroke="${colors.cross}" stroke-width="5" stroke-linecap="round" fill="none"/></svg>`;
}

/** Bolinha azul da posição da pessoa ("Você está aqui"). */
export function positionDot(color: string, ring: string): string {
  return `<span style="display:block;width:18px;height:18px;border-radius:50%;background:${color};border:3px solid ${ring};box-shadow:0 0 0 4px ${color}55"></span>`;
}
