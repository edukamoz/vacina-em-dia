import { DEFAULT_API_BASE_URL, ajustarParaEmulador, resolveApiBaseUrl } from './config';

describe('resolveApiBaseUrl', () => {
  test.each([undefined, '', '   '])(
    'CT-APP-A01: sem valor (%p) usa a URL local padrão',
    (value) => {
      expect(resolveApiBaseUrl(value)).toBe(DEFAULT_API_BASE_URL);
    },
  );

  test.each([
    ['https://api.exemplo.com/api', 'https://api.exemplo.com/api'],
    ['https://api.exemplo.com/api/', 'https://api.exemplo.com/api'],
    ['  http://192.168.0.10:7071/api  ', 'http://192.168.0.10:7071/api'],
  ])('CT-APP-A02: normaliza %p', (value, expected) => {
    expect(resolveApiBaseUrl(value)).toBe(expected);
  });

  test.each([
    ['/api', '/api'],
    ['/api/', '/api'],
  ])(
    'CT-APP-A12: aceita caminho relativo na mesma origem (web atrás de proxy): %p',
    (value, expected) => {
      expect(resolveApiBaseUrl(value)).toBe(expected);
    },
  );

  test.each(['//evil.example/api', '///x', '/\\evil.example'])(
    'CT-APP-A13: rejeita endereço que muda de origem sem dizer (%p)',
    (value) => {
      expect(() => resolveApiBaseUrl(value)).toThrow('EXPO_PUBLIC_API_URL');
    },
  );

  test.each(['ftp://x', 'javascript:alert(1)', 'nao-e-url'])('CT-APP-A03: rejeita %p', (value) => {
    expect(() => resolveApiBaseUrl(value)).toThrow('EXPO_PUBLIC_API_URL');
  });
});

describe('ajustarParaEmulador', () => {
  test.each([
    ['http://localhost:7071/api', 'http://10.0.2.2:7071/api'],
    ['http://127.0.0.1:7071/api', 'http://10.0.2.2:7071/api'],
    ['http://192.168.0.10:7071/api', 'http://192.168.0.10:7071/api'],
    [
      'https://func-vacinaemdia.azurewebsites.net/api',
      'https://func-vacinaemdia.azurewebsites.net/api',
    ],
    ['http://localhost.exemplo.com/api', 'http://localhost.exemplo.com/api'],
    ['/api', '/api'],
  ])('CT-APP-C01: no Android, %s vira %s', (entrada, esperado) => {
    expect(ajustarParaEmulador(entrada, 'android')).toBe(esperado);
  });

  test.each(['ios', 'web'])('CT-APP-C02: em %s não muda o endereço', (plataforma) => {
    expect(ajustarParaEmulador('http://localhost:7071/api', plataforma)).toBe(
      'http://localhost:7071/api',
    );
  });
});
