import { addDays, addMonths, ageInMonths, compareCivilDates, isValidCivilDate } from './civil-date';

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

describe('addMonths e ageInMonths', () => {
  test.each([
    ['2026-01-31', 1, '2026-02-28'],
    ['2024-01-31', 1, '2024-02-29'],
    ['2026-10-06', 2, '2026-12-06'],
    ['2026-11-15', 3, '2027-02-15'],
    ['2026-03-10', -3, '2025-12-10'],
    ['2026-10-06', 0, '2026-10-06'],
  ])('CT-CAL-D01 addMonths(%s, %i) = %s', (date, months, expected) => {
    expect(addMonths(date, months)).toBe(expected);
  });

  test('CT-CAL-D02 addMonths rejeita data inválida', () => {
    expect(() => addMonths('2026-02-30', 1)).toThrow(RangeError);
  });

  test.each([
    ['2026-10-06', '2026-10-06', 0],
    ['2026-10-06', '2026-11-05', 0],
    ['2026-10-06', '2026-11-06', 1],
    ['2026-01-31', '2026-02-28', 1],
    ['2000-02-29', '2026-02-28', 312],
    ['2026-10-06', '2026-01-01', 0],
  ])('CT-CAL-D03 ageInMonths(%s, %s) = %i', (birth, today, expected) => {
    expect(ageInMonths(birth, today)).toBe(expected);
  });

  test('CT-CAL-D04 ageInMonths rejeita data inválida', () => {
    expect(() => ageInMonths('x', '2026-10-06')).toThrow(RangeError);
  });
});
