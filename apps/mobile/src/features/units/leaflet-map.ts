import type * as Leaflet from 'leaflet';
import {
  BRAZIL_CENTER,
  positionDot,
  pinSvg,
  TILE_ATTRIBUTION,
  TILE_URL,
  type MapPosition,
  type MapUnit,
  type PinColors,
} from './map-shared';

/** Opções para criar o mapa. */
export interface UnitsMapOptions {
  readonly colors: PinColors;
  readonly positionColor: string;
  readonly positionRing: string;
  /** Chamada com o código CNES da unidade tocada. */
  readonly onSelect: (cnes: string) => void;
}

/** Controle do mapa criado: atualiza o que aparece e o destrói. */
export interface UnitsMapController {
  /** Troca as unidades, a escolhida e a posição, e enquadra o mapa. */
  update(
    units: readonly MapUnit[],
    selectedCnes: string | null,
    position: MapPosition | null,
  ): void;
  /** Desmonta o mapa e solta os eventos. */
  destroy(): void;
}

/**
 * Cria o mapa de postos dentro de um elemento, com Leaflet e os mapas do OpenStreetMap. A
 * biblioteca é injetada para poder ser testada sem navegador. Os marcadores são botões com o nome
 * da unidade, então também funcionam pelo teclado.
 *
 * @param L - Módulo `leaflet`.
 * @param container - Elemento que recebe o mapa.
 * @param options - Cores e o que fazer ao tocar numa unidade.
 */
export function createUnitsMap(
  L: typeof Leaflet,
  container: HTMLElement,
  options: UnitsMapOptions,
): UnitsMapController {
  const map = L.map(container, { zoomControl: true, attributionControl: true }).setView(
    [BRAZIL_CENTER[0], BRAZIL_CENTER[1]],
    4,
  );
  L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);
  const layer = L.layerGroup().addTo(map);
  let lastPosition: MapPosition | null = null;
  let lastUnits: readonly MapUnit[] = [];

  function frame(): void {
    const points: Leaflet.LatLngTuple[] = lastUnits.map((u) => [u.latitude, u.longitude]);
    if (lastPosition) points.push([lastPosition.latitude, lastPosition.longitude]);
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0] as Leaflet.LatLngTuple, 15);
      return;
    }
    map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
  }

  return {
    update(units, selectedCnes, position) {
      layer.clearLayers();
      lastUnits = units;
      lastPosition = position;
      for (const unit of units) {
        const selected = unit.cnes === selectedCnes;
        const icon = L.divIcon({
          className: '',
          html: pinSvg(options.colors, selected),
          iconSize: selected ? [50, 58] : [40, 46],
          iconAnchor: selected ? [25, 58] : [20, 46],
        });
        L.marker([unit.latitude, unit.longitude], {
          icon,
          title: unit.name,
          alt: unit.name,
          keyboard: true,
          zIndexOffset: selected ? 1000 : 0,
        })
          .on('click', () => options.onSelect(unit.cnes))
          .addTo(layer);
      }
      if (position) {
        L.marker([position.latitude, position.longitude], {
          icon: L.divIcon({
            className: '',
            html: positionDot(options.positionColor, options.positionRing),
            iconSize: [18, 18],
            iconAnchor: [9, 9],
          }),
          title: 'Você está aqui',
          alt: 'Você está aqui',
          interactive: false,
        }).addTo(layer);
      }
      frame();
    },
    destroy() {
      map.remove();
    },
  };
}
