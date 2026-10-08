import type * as Leaflet from 'leaflet';
import { createUnitsMap } from './leaflet-map';

/** Leaflet de mentira: guarda o que foi criado para o teste conferir. */
function fakeLeaflet() {
  const markers: {
    latlng: [number, number];
    options: Record<string, unknown>;
    clicks: (() => void)[];
  }[] = [];
  const state = {
    view: null as null | { center: [number, number]; zoom: number },
    bounds: null as null | { points: unknown; options: unknown },
    removed: false,
    cleared: 0,
  };
  const map = {
    setView(center: [number, number], zoom: number) {
      state.view = { center, zoom };
      return map;
    },
    fitBounds(points: unknown, options: unknown) {
      state.bounds = { points, options };
    },
    remove() {
      state.removed = true;
    },
  };
  const layer = {
    addTo: () => layer,
    clearLayers() {
      state.cleared++;
      markers.length = 0;
    },
  };
  const L = {
    map: () => map,
    tileLayer: () => ({ addTo: () => undefined }),
    layerGroup: () => layer,
    divIcon: (options: Record<string, unknown>) => options,
    latLngBounds: (points: unknown) => points,
    marker(latlng: [number, number], options: Record<string, unknown>) {
      const marker = { latlng, options, clicks: [] as (() => void)[] };
      markers.push(marker);
      const chain = {
        on(_event: string, handler: () => void) {
          marker.clicks.push(handler);
          return chain;
        },
        addTo: () => chain,
      };
      return chain;
    },
  };
  return { L: L as unknown as typeof Leaflet, markers, state };
}

const COLORS = { fill: '#0b6b52', selectedFill: '#0a5c9e', cross: '#fff', stroke: '#fff' };
const UNITS = [
  { cnes: '1', name: 'Posto A', latitude: -23.5, longitude: -47.4 },
  { cnes: '2', name: 'Posto B', latitude: -23.6, longitude: -47.5 },
];

describe('mapa Leaflet dos postos', () => {
  function setup() {
    const fake = fakeLeaflet();
    const onSelect = jest.fn();
    const controller = createUnitsMap(fake.L, {} as HTMLElement, {
      colors: COLORS,
      positionColor: '#0a5c9e',
      positionRing: '#fff',
      onSelect,
    });
    return { ...fake, controller, onSelect };
  }

  test('CT-UNI-APP-30: começa no Brasil inteiro e coloca um marcador por unidade, com o nome', () => {
    const { controller, markers, state } = setup();
    expect(state.view?.zoom).toBe(4);
    controller.update(UNITS, null, null);
    expect(markers).toHaveLength(2);
    expect(markers[0]?.options['title']).toBe('Posto A');
    expect(markers[0]?.options['alt']).toBe('Posto A');
    expect(markers[0]?.options['keyboard']).toBe(true);
  });

  test('CT-UNI-APP-31: tocar num marcador devolve o código da unidade', () => {
    const { controller, markers, onSelect } = setup();
    controller.update(UNITS, null, null);
    markers[1]?.clicks[0]?.();
    expect(onSelect).toHaveBeenCalledWith('2');
  });

  test('CT-UNI-APP-32: a escolhida fica à frente e a posição da pessoa entra no enquadramento', () => {
    const { controller, markers, state } = setup();
    controller.update(UNITS, '2', { latitude: -23.55, longitude: -47.45 });
    const escolhida = markers.find((m) => m.options['title'] === 'Posto B');
    expect(escolhida?.options['zIndexOffset']).toBe(1000);
    const voce = markers.find((m) => m.options['title'] === 'Você está aqui');
    expect(voce?.options['interactive']).toBe(false);
    expect((state.bounds?.points as unknown[]).length).toBe(3);
  });

  test('CT-UNI-APP-33: com uma só unidade e sem posição, aproxima nela', () => {
    const { controller, state } = setup();
    controller.update([UNITS[0]!], null, null);
    expect(state.view).toEqual({ center: [-23.5, -47.4], zoom: 15 });
  });

  test('CT-UNI-APP-34: sem nada para mostrar, o mapa não se mexe; destruir solta o mapa', () => {
    const { controller, state } = setup();
    controller.update([], null, null);
    expect(state.bounds).toBeNull();
    expect(state.view?.zoom).toBe(4);
    controller.destroy();
    expect(state.removed).toBe(true);
  });

  test('CT-UNI-APP-35: atualizar de novo limpa os marcadores antigos', () => {
    const { controller, state } = setup();
    controller.update(UNITS, null, null);
    controller.update([UNITS[0]!], null, null);
    expect(state.cleared).toBe(2);
  });
});
