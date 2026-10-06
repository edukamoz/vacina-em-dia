import { describeAge, maskBrDate, parseBrDate, todayCivil } from './dates';

describe('datas da interface', () => {
  test('CT-DATA-03: todayCivil usa o dia local e completa com zeros', () => {
    expect(todayCivil(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(todayCivil(new Date(2026, 9, 6))).toBe('2026-10-06');
    expect(todayCivil()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test.each([
    ['', ''],
    ['2', '2'],
    ['20', '20'],
    ['205', '20/5'],
    ['2005', '20/05'],
    ['20052', '20/05/2'],
    ['20052024', '20/05/2024'],
    ['20/05/2024999', '20/05/2024'],
    ['2a0b0c5', '20/05'],
  ])('CT-DATA-04: máscara de %p vira %p', (input, expected) => {
    expect(maskBrDate(input)).toBe(expected);
  });

  test.each([
    ['20/05/2024', '2024-05-20'],
    ['29/02/2024', '2024-02-29'],
    ['29/02/2025', null],
    ['31/04/2025', null],
    ['20/05/24', null],
    ['', null],
    ['2024-05-20', null],
  ])('CT-DATA-05: parseBrDate(%p) = %p', (text, expected) => {
    expect(parseBrDate(text)).toBe(expected);
  });

  test.each([
    ['2026-10-06', '2026-10-06', 'menos de 1 mês'],
    ['2026-09-06', '2026-10-06', '1 mês'],
    ['2026-05-06', '2026-10-06', '5 meses'],
    ['2025-05-06', '2026-10-06', '17 meses'],
    ['2024-07-06', '2026-10-06', '2 anos e 3 meses'],
    ['2024-09-06', '2026-10-06', '2 anos e 1 mês'],
    ['2024-10-06', '2026-10-06', '2 anos'],
    ['2018-01-06', '2026-10-06', '8 anos'],
    ['1990-05-20', '2026-10-06', '36 anos'],
  ])('CT-DATA-06: nascido em %s, em %s tem %s', (birth, today, expected) => {
    expect(describeAge(birth, today)).toBe(expected);
  });
});
