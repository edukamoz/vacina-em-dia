import {
  addMonths,
  civilOf,
  daysInMonth,
  longDateLabel,
  monthGrid,
  monthLabel,
  monthOf,
} from './calendar-grid';

describe('calendário em grade', () => {
  test.each([
    [{ year: 2026, month: 2 }, 28],
    [{ year: 2028, month: 2 }, 29],
    [{ year: 2026, month: 10 }, 31],
    [{ year: 2026, month: 11 }, 30],
  ])('CT-CAL-01: %p tem %i dias', (mes, dias) => {
    expect(daysInMonth(mes)).toBe(dias);
  });

  test('CT-CAL-02: soma e subtrai meses atravessando o ano', () => {
    expect(addMonths({ year: 2026, month: 12 }, 1)).toEqual({ year: 2027, month: 1 });
    expect(addMonths({ year: 2026, month: 1 }, -1)).toEqual({ year: 2025, month: 12 });
    expect(addMonths({ year: 2026, month: 10 }, 0)).toEqual({ year: 2026, month: 10 });
    expect(addMonths({ year: 2026, month: 3 }, -15)).toEqual({ year: 2024, month: 12 });
  });

  test('CT-CAL-03: outubro de 2026 começa numa quinta e termina num sábado, em semanas completas', () => {
    const semanas = monthGrid({ year: 2026, month: 10 });
    expect(semanas.every((semana) => semana.length === 7)).toBe(true);
    expect(semanas[0]).toEqual([null, null, null, null, '2026-10-01', '2026-10-02', '2026-10-03']);
    expect(semanas.flat().filter((dia) => dia !== null)).toHaveLength(31);
    expect(semanas.at(-1)?.at(-1)).toBe('2026-10-31');
  });

  test('CT-CAL-04: fevereiro de 2026 ocupa exatamente quatro semanas (começa no domingo)', () => {
    const semanas = monthGrid({ year: 2026, month: 2 });
    expect(semanas).toHaveLength(4);
    expect(semanas[0]?.[0]).toBe('2026-02-01');
    expect(semanas[3]?.[6]).toBe('2026-02-28');
  });

  test('CT-CAL-05: monta e lê datas civis e escreve por extenso', () => {
    expect(civilOf({ year: 2026, month: 3 }, 5)).toBe('2026-03-05');
    expect(monthOf('2026-10-06')).toEqual({ year: 2026, month: 10 });
    expect(monthLabel({ year: 2026, month: 3 })).toBe('março de 2026');
    expect(longDateLabel('2026-10-06')).toBe('6 de outubro de 2026');
  });
});
