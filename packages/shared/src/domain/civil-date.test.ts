import { addDays, compareCivilDates, isValidCivilDate } from './civil-date';

describe('isValidCivilDate', () => {
  test.each(['2026-10-15', '2024-02-29', '2000-01-01', '1999-12-31'])('aceita %s', (value) => {
    expect(isValidCivilDate(value)).toBe(true);
  });

  test.each([
    '2026-13-01',
    '2026-00-10',
    '2026-02-30',
    '2025-02-29',
    '2026-1-5',
    '15/10/2026',
    '2026-10-15T00:00:00Z',
    '',
    'abc',
  ])('rejeita %s', (value) => {
    expect(isValidCivilDate(value)).toBe(false);
  });
});

describe('compareCivilDates', () => {
  test('ordena datas', () => {
    expect(compareCivilDates('2026-10-14', '2026-10-15')).toBeLessThan(0);
    expect(compareCivilDates('2026-10-15', '2026-10-15')).toBe(0);
    expect(compareCivilDates('2026-10-16', '2026-10-15')).toBeGreaterThan(0);
  });
});

describe('addDays', () => {
  test.each([
    ['2026-10-15', 1, '2026-10-16'],
    ['2026-10-15', -1, '2026-10-14'],
    ['2026-10-31', 1, '2026-11-01'],
    ['2026-12-31', 1, '2027-01-01'],
    ['2024-02-28', 1, '2024-02-29'],
    ['2024-02-28', 2, '2024-03-01'],
    ['2026-03-01', -1, '2026-02-28'],
    ['2026-10-15', 0, '2026-10-15'],
  ])('%s + %i dia(s) = %s', (date, days, expected) => {
    expect(addDays(date, days)).toBe(expected);
  });
});
