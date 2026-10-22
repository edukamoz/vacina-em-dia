import type { DoseResponse } from '@vacina/shared';
import { dose } from '../test-utils';
import {
  aplicadasPorMes,
  cobertura,
  contarPorEstado,
  mesDe,
  previstasPorMes,
  somarMeses,
  totalDaContagem,
} from './estatisticas';

const HOJE = '2026-10-21';
const aplicada = (appliedDate: string, id = appliedDate): DoseResponse =>
  dose({ id, status: 'APPLIED', appliedDate, dueDate: '2026-01-01' });

describe('estatísticas do painel de gráficos', () => {
  test('CT-GRA-01: conta por estado e deixa as canceladas de fora', () => {
    const contagem = contarPorEstado([
      aplicada('2026-03-10', 'a'),
      aplicada('2026-04-10', 'b'),
      dose({ id: 'c', status: 'SCHEDULED', scheduledDate: '2026-11-05' }),
      dose({ id: 'd', status: 'PENDING' }),
      dose({ id: 'e', status: 'OVERDUE', dueDate: '2026-08-01' }),
      dose({ id: 'f', status: 'CANCELLED' }),
    ]);
    expect(contagem).toEqual({ APPLIED: 2, SCHEDULED: 1, PENDING: 1, OVERDUE: 1 });
    expect(totalDaContagem(contagem)).toBe(5);
  });

  test.each([
    [{ APPLIED: 1, SCHEDULED: 0, PENDING: 2, OVERDUE: 0 }, 33],
    [{ APPLIED: 3, SCHEDULED: 0, PENDING: 0, OVERDUE: 0 }, 100],
    [{ APPLIED: 0, SCHEDULED: 1, PENDING: 1, OVERDUE: 1 }, 0],
    [{ APPLIED: 0, SCHEDULED: 0, PENDING: 0, OVERDUE: 0 }, 0],
  ])('CT-GRA-02: cobertura de %j é %i%%', (contagem, esperado) => {
    expect(cobertura(contagem)).toBe(esperado);
  });

  test.each([
    ['2026-10', 1, '2026-11'],
    ['2026-12', 1, '2027-01'],
    ['2026-01', -1, '2025-12'],
    ['2026-10', -11, '2025-11'],
    ['2026-10', 0, '2026-10'],
  ])('CT-GRA-03: %s mais %i meses é %s', (mes, n, esperado) => {
    expect(somarMeses(mes, n)).toBe(esperado);
  });

  test('CT-GRA-04: mesDe pega o ano e o mês da data civil', () => {
    expect(mesDe('2026-10-21')).toBe('2026-10');
  });

  test('CT-GRA-05: aplicadas por mês cobre 12 meses terminando no mês de hoje', () => {
    const serie = aplicadasPorMes(
      [
        aplicada('2026-10-02', 'a'),
        aplicada('2026-10-20', 'b'),
        aplicada('2025-11-15', 'c'),
        aplicada('2025-10-30', 'fora'),
        dose({ id: 'p', status: 'PENDING' }),
      ],
      HOJE,
    );
    expect(serie).toHaveLength(12);
    expect(serie[0]).toMatchObject({ chave: '2025-11', rotulo: 'nov', total: 1 });
    expect(serie[11]).toMatchObject({
      chave: '2026-10',
      rotulo: 'out',
      rotuloCompleto: 'outubro de 2026',
      total: 2,
    });
    expect(serie.reduce((soma, mes) => soma + mes.total, 0)).toBe(3);
  });

  test('CT-GRA-06: previstas por mês separa atrasadas, sem data e além do período', () => {
    const previstas = previstasPorMes(
      [
        dose({ id: 'a', status: 'SCHEDULED', scheduledDate: '2026-10-25', dueDate: '2026-10-01' }),
        dose({ id: 'b', status: 'PENDING', dueDate: '2026-12-01' }),
        dose({ id: 'c', status: 'PENDING', dueDate: '2026-12-20' }),
        dose({ id: 'd', status: 'OVERDUE', dueDate: '2026-08-01' }),
        dose({ id: 'e', status: 'PENDING', dueDate: '2026-05-01' }),
        dose({ id: 'f', status: 'PENDING', dueDate: '2027-08-01' }),
        dose({
          id: 'g',
          status: 'PENDING',
          dueDate: null as unknown as string,
          timingKind: 'HISTORY',
        }),
        aplicada('2026-02-02', 'h'),
        dose({ id: 'i', status: 'CANCELLED' }),
      ],
      HOJE,
    );
    expect(previstas.meses.map((mes) => mes.chave)).toEqual([
      '2026-10',
      '2026-11',
      '2026-12',
      '2027-01',
      '2027-02',
      '2027-03',
    ]);
    expect(previstas.meses[0]?.total).toBe(1);
    expect(previstas.meses[2]?.total).toBe(2);
    expect(previstas.emAtraso).toBe(2);
    expect(previstas.depois).toBe(1);
    expect(previstas.semData).toBe(1);
  });
});
