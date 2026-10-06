import { DEFAULT_API_BASE_URL, resolveApiBaseUrl } from './config';

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

  test.each(['ftp://x', 'javascript:alert(1)', 'nao-e-url'])('CT-APP-A03: rejeita %p', (value) => {
    expect(() => resolveApiBaseUrl(value)).toThrow('EXPO_PUBLIC_API_URL');
  });
});
