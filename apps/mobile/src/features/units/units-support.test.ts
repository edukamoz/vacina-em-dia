import AsyncStorage from '@react-native-async-storage/async-storage';
import { RESPONSE } from './test-fixtures';
import { buildSetDataScript, MAP_BASE_URL, NATIVE_MAP_HTML } from './native-map-html';
import { pinSvg, positionDot } from './map-shared';
import { clearUnitsCache, loadUnitsCache, saveUnitsCache } from './units-cache';
import { formatDistance, normalizeSearch, routeUrl, telUrl } from './units-format';

describe('formatação dos postos (CT-UNI-APP)', () => {
  test.each([
    [5, 'a 10 m'],
    [450, 'a 450 m'],
    [454, 'a 450 m'],
    [999, 'a 1000 m'],
    [1000, 'a 1,0 km'],
    [1234, 'a 1,2 km'],
    [12_400, 'a 12,4 km'],
  ])('CT-UNI-APP-01: %i m vira "%s"', (metros, texto) => {
    expect(formatDistance(metros)).toBe(texto);
  });

  test('CT-UNI-APP-02: a busca ignora acentos e maiúsculas', () => {
    expect(normalizeSearch('  Unidade Básica DE SAÚDE ')).toBe('unidade basica de saude');
    expect(normalizeSearch('Avenida João')).toBe('avenida joao');
  });

  test('CT-UNI-APP-03: o telefone vira link tel: só com dígitos e "+"', () => {
    expect(telUrl('(15) 3243-1513')).toBe('tel:1532431513');
    expect(telUrl('+55 15 3243-1513')).toBe('tel:+551532431513');
  });

  test('CT-UNI-APP-04: a rota abre o aplicativo de mapas sem chave de API', () => {
    expect(routeUrl(-23.5, -47.4)).toBe(
      'https://www.google.com/maps/dir/?api=1&destination=-23.5,-47.4',
    );
  });
});

describe('lista de postos guardada no aparelho', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('CT-UNI-APP-10: guarda e lê a lista, sem a posição da pessoa', async () => {
    expect(await loadUnitsCache()).toBeNull();
    await saveUnitsCache({ savedAt: '2026-10-08T01:00:00.000Z', response: RESPONSE });
    const cache = await loadUnitsCache();
    expect(cache?.response.items[0]?.name).toBe('Unidade Básica de Saúde Rio Acima');
    expect(cache?.savedAt).toBe('2026-10-08T01:00:00.000Z');
    const bruto = (await AsyncStorage.getItem('vacina-em-dia:postos:v1')) ?? '';
    expect(bruto).not.toMatch(/"position"|"lat"|"lon"/);
  });

  test.each([
    ['texto que não é JSON', 'isto não é json'],
    ['formato errado', JSON.stringify({ savedAt: 'x', response: { items: 1 } })],
    ['sem data', JSON.stringify({ response: RESPONSE })],
  ])('CT-UNI-APP-11: cache corrompido (%s) é ignorado', async (_nome, conteudo) => {
    await AsyncStorage.setItem('vacina-em-dia:postos:v1', conteudo);
    expect(await loadUnitsCache()).toBeNull();
  });

  test('CT-UNI-APP-12: limpar apaga a lista; falha do armazenamento nunca vira erro', async () => {
    await saveUnitsCache({ savedAt: '2026-10-08T01:00:00.000Z', response: RESPONSE });
    await clearUnitsCache();
    expect(await loadUnitsCache()).toBeNull();

    jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(new Error('falha'));
    jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(new Error('falha'));
    jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(new Error('falha'));
    expect(await loadUnitsCache()).toBeNull();
    await expect(
      saveUnitsCache({ savedAt: '2026-10-08T01:00:00.000Z', response: RESPONSE }),
    ).resolves.toBeUndefined();
    await expect(clearUnitsCache()).resolves.toBeUndefined();
  });
});

describe('página do mapa no celular', () => {
  const cores = { fill: '#0b6b52', selectedFill: '#0a5c9e', cross: '#ffffff', stroke: '#ffffff' };

  test('CT-UNI-APP-20: o HTML carrega o Leaflet fixo com verificação de integridade', () => {
    expect(NATIVE_MAP_HTML).toContain('leaflet@1.9.4');
    expect(NATIVE_MAP_HTML).toMatch(/integrity="sha256-[^"]+"/g);
    expect(NATIVE_MAP_HTML).toContain('window.setData');
    expect(NATIVE_MAP_HTML).toContain('colaboradores do OpenStreetMap');
    expect(MAP_BASE_URL).toMatch(/^https:\/\//);
  });

  test('CT-UNI-APP-21: o comando entrega unidades, escolha e posição e protege o HTML', () => {
    const script = buildSetDataScript(
      [
        {
          cnes: '1',
          name: 'Posto </script><b>x</b>',
          latitude: -23.5,
          longitude: -47.4,
        },
      ],
      '1',
      { latitude: -23.6, longitude: -47.5 },
      cores,
      '#0a5c9e',
    );
    expect(script.startsWith('window.setData(')).toBe(true);
    expect(script).not.toContain('</script>');
    expect(script).toContain('\\u003c/script>');
    expect(script).toContain('"selected":"1"');
    expect(script).toContain('"position":{"latitude":-23.6,"longitude":-47.5}');
    expect(script.endsWith('true;')).toBe(true);
  });

  test('CT-UNI-APP-22: o pino escolhido é maior e usa outra cor', () => {
    expect(pinSvg(cores, false)).toContain('width="40"');
    expect(pinSvg(cores, true)).toContain('width="50"');
    expect(pinSvg(cores, true)).toContain(cores.selectedFill);
    expect(positionDot('#0a5c9e', '#fff')).toContain('border-radius:50%');
  });
});
