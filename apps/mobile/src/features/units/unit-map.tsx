import { useEffect, useRef, useState } from 'react';
import { Linking, View } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useThemeColors } from '../../theme/theme-provider';
import { buildSetDataScript, MAP_BASE_URL, NATIVE_MAP_HTML } from './native-map-html';
import type { UnitMapProps } from './unit-map-types';

/**
 * Mapa de postos para o celular: Leaflet com os mapas do OpenStreetMap dentro de uma `WebView`
 * (não precisa de chave de API do Google). O app entrega as unidades à página e recebe de volta o
 * código CNES do marcador tocado. Links de fora (como o direito autoral do OpenStreetMap) abrem no
 * navegador do aparelho, nunca dentro do mapa.
 */
export function UnitMap({ units, selectedCnes, position, onSelect }: UnitMapProps) {
  const cores = useThemeColors();
  const webview = useRef<WebView>(null);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    if (!pronto) return;
    webview.current?.injectJavaScript(
      buildSetDataScript(
        units,
        selectedCnes,
        position,
        {
          fill: cores.primaria,
          selectedFill: cores.agendada,
          cross: cores.sobrePrimaria,
          stroke: cores.sobrePrimaria,
        },
        cores.agendada,
      ),
    );
  }, [pronto, units, selectedCnes, position, cores.primaria, cores.agendada, cores.sobrePrimaria]);

  function aoReceber(event: WebViewMessageEvent) {
    const mensagem = event.nativeEvent.data;
    if (mensagem === 'pronto') setPronto(true);
    else onSelect(mensagem);
  }

  return (
    <View
      accessibilityLabel="Mapa dos postos de saúde"
      className="h-[360px] w-full overflow-hidden rounded-cartao border-fina border-bordaSuave"
    >
      <WebView
        ref={webview}
        originWhitelist={['*']}
        source={{ html: NATIVE_MAP_HTML, baseUrl: MAP_BASE_URL }}
        javaScriptEnabled
        onMessage={aoReceber}
        onShouldStartLoadWithRequest={(request) => {
          if (request.url.startsWith(MAP_BASE_URL) || request.url.startsWith('about:')) return true;
          if (request.url.startsWith('https://')) void Linking.openURL(request.url);
          return false;
        }}
      />
    </View>
  );
}
