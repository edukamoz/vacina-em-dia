import type { MapPosition, MapUnit } from './map-shared';

/** Propriedades do mapa de postos (iguais na web e no celular). */
export interface UnitMapProps {
  /** Unidades a mostrar, cada uma com um marcador. */
  readonly units: readonly MapUnit[];
  /** Unidade escolhida (marcador maior), se houver. */
  readonly selectedCnes: string | null;
  /** Posição da pessoa, se já foi obtida. */
  readonly position: MapPosition | null;
  /** Chamada com o código CNES da unidade tocada. */
  readonly onSelect: (cnes: string) => void;
}

/** Estilo dos controles de zoom: alvos de 48 px, como pede o design system. */
export const MAP_CONTROLS_CSS = `
.leaflet-container{font-family:inherit}
.leaflet-bar a,.leaflet-bar a:hover{width:48px;height:48px;line-height:48px;font-size:24px}
.leaflet-touch .leaflet-bar a{width:48px;height:48px;line-height:48px}
.leaflet-bar a:focus-visible,.leaflet-marker-icon:focus-visible{outline:3px solid #0a5c9e;outline-offset:2px}
`;
