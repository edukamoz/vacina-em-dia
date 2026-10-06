import { formatCivilDate } from './format-date';

describe('formatCivilDate', () => {
  test('CT-DATA-01: converte AAAA-MM-DD para DD/MM/AAAA', () => {
    expect(formatCivilDate('2026-11-04')).toBe('04/11/2026');
  });

  test.each(['2026-1-4', '04/11/2026', '', '2026-11-04T00:00'])(
    'CT-DATA-02: rejeita formato inválido %p',
    (value) => {
      expect(() => formatCivilDate(value)).toThrow('Data civil inválida');
    },
  );
});
