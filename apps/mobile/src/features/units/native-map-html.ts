import {
  BRAZIL_CENTER,
  pinSvg,
  positionDot,
  TILE_ATTRIBUTION,
  TILE_URL,
  type MapPosition,
  type MapUnit,
  type PinColors,
} from './map-shared';

/** Leaflet 1.9.4 do CDN oficial (unpkg), com verificação de integridade (SRI). */
const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_CSS_SRI = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_JS_SRI = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';

/**
 * Endereço usado como origem da página do mapa. Os mapas do OpenStreetMap pedem que quem os usa se
 * identifique pela origem (`Referer`); aqui é o endereço público do app.
 */
export const MAP_BASE_URL = 'https://blue-rock-0d7abc710.4.azurestaticapps.net';

/**
 * Página HTML do mapa, para a `WebView` do celular: Leaflet (com controles de 48 px), os mapas do
 * OpenStreetMap e a função `window.setData`, que o app chama para trocar unidades, escolha e
 * posição. Ao tocar num marcador, a página manda o código CNES de volta ao app.
 */
export const NATIVE_MAP_HTML = `<!doctype html>
<html lang="pt-BR"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
<link rel="stylesheet" href="${LEAFLET_CSS}" integrity="${LEAFLET_CSS_SRI}" crossorigin="">
<style>
html,body,#mapa{margin:0;height:100%;width:100%;background:#e7f3ee}
.leaflet-bar a,.leaflet-bar a:hover{width:48px;height:48px;line-height:48px;font-size:24px}
.leaflet-touch .leaflet-bar a{width:48px;height:48px;line-height:48px}
</style>
</head><body>
<div id="mapa" role="application" aria-label="Mapa dos postos de saúde"></div>
<script src="${LEAFLET_JS}" integrity="${LEAFLET_JS_SRI}" crossorigin=""></script>
<script>
var map = L.map('mapa', { zoomControl: true }).setView([${BRAZIL_CENTER[0]}, ${BRAZIL_CENTER[1]}], 4);
L.tileLayer(${JSON.stringify(TILE_URL)}, { maxZoom: 19, attribution: ${JSON.stringify(TILE_ATTRIBUTION)} }).addTo(map);
var layer = L.layerGroup().addTo(map);
function send(text) { window.ReactNativeWebView.postMessage(text); }
window.setData = function (data) {
  layer.clearLayers();
  var points = [];
  data.units.forEach(function (u) {
    var selected = u.cnes === data.selected;
    var icon = L.divIcon({
      className: '',
      html: selected ? data.pinSelected : data.pin,
      iconSize: selected ? [50, 58] : [40, 46],
      iconAnchor: selected ? [25, 58] : [20, 46]
    });
    L.marker([u.latitude, u.longitude], { icon: icon, title: u.name, alt: u.name, zIndexOffset: selected ? 1000 : 0 })
      .on('click', function () { send(u.cnes); })
      .addTo(layer);
    points.push([u.latitude, u.longitude]);
  });
  if (data.position) {
    L.marker([data.position.latitude, data.position.longitude], {
      icon: L.divIcon({ className: '', html: data.dot, iconSize: [18, 18], iconAnchor: [9, 9] }),
      title: 'Você está aqui', alt: 'Você está aqui', interactive: false
    }).addTo(layer);
    points.push([data.position.latitude, data.position.longitude]);
  }
  if (points.length === 1) map.setView(points[0], 15);
  else if (points.length > 1) map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 16 });
};
send('pronto');
</script>
</body></html>`;

/**
 * Comando JavaScript que entrega ao mapa as unidades, a escolhida e a posição. Os dados passam por
 * `JSON.stringify`, então nomes com aspas ou `</script>` não quebram a página.
 *
 * @param units - Unidades.
 * @param selectedCnes - Unidade escolhida.
 * @param position - Posição da pessoa.
 * @param colors - Cores dos pinos.
 * @param positionColor - Cor da bolinha da posição.
 */
export function buildSetDataScript(
  units: readonly MapUnit[],
  selectedCnes: string | null,
  position: MapPosition | null,
  colors: PinColors,
  positionColor: string,
): string {
  const data = {
    units: units.map(({ cnes, name, latitude, longitude }) => ({
      cnes,
      name,
      latitude,
      longitude,
    })),
    selected: selectedCnes,
    position,
    pin: pinSvg(colors, false),
    pinSelected: pinSvg(colors, true),
    dot: positionDot(positionColor, '#ffffff'),
  };
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `window.setData(${json}); true;`;
}
