import { civilToday } from './clock';

describe('civilToday', () => {
  test.each([
    ['CT-API-C01: meio-dia em Brasília', '2026-10-06T15:00:00.000Z', '2026-10-06'],
    [
      'CT-API-C02: 23h30 em Brasília ainda é o mesmo dia (UTC já virou)',
      '2026-10-07T02:30:00.000Z',
      '2026-10-06',
    ],
    ['CT-API-C03: 00h30 em Brasília é o dia seguinte', '2026-10-07T03:30:00.000Z', '2026-10-07'],
    ['CT-API-C04: virada de ano', '2027-01-01T02:59:59.000Z', '2026-12-31'],
  ])('%s', (_nome, iso, expected) => {
    expect(civilToday(() => iso)).toBe(expected);
  });

  test('CT-API-C05: rejeita instante inválido', () => {
    expect(() => civilToday(() => 'ontem')).toThrow('Instante inválido');
  });
});
