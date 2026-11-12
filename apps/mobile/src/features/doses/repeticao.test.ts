import {
  ESTADO_INICIAL_REPETICAO,
  descreverAviso,
  descreverAvisos,
  descreverRepeticao,
  montarRepeticao,
  type FormaDeRepetir,
} from './repeticao';

const DATA = '2026-11-04';
const forma = (patch: Partial<FormaDeRepetir> = {}): FormaDeRepetir => ({
  ...ESTADO_INICIAL_REPETICAO,
  ...patch,
});

describe('formulário de repetição: montar o que vai para a API', () => {
  test('CT-APP-REP01: sem repetir e sem aviso, não manda nada (o corpo fica como antes)', () => {
    expect(montarRepeticao(forma(), DATA)).toEqual({ ok: true, extras: {} });
  });

  test('CT-APP-REP02: repetir todo ano contando da aplicação', () => {
    expect(montarRepeticao(forma({ repete: true, cada: '1', unidade: 'YEAR' }), DATA)).toEqual({
      ok: true,
      extras: { recurrence: { unit: 'YEAR', every: 1, anchor: 'APPLICATION' } },
    });
  });

  test('CT-APP-REP03: data fixa, a cada 6 meses', () => {
    expect(
      montarRepeticao(
        forma({ repete: true, cada: '6', unidade: 'MONTH', conta: 'SCHEDULE' }),
        DATA,
      ),
    ).toEqual({
      ok: true,
      extras: { recurrence: { unit: 'MONTH', every: 6, anchor: 'SCHEDULE' } },
    });
  });

  test('CT-APP-REP04: terminar em uma data ou depois de N doses', () => {
    const porData = montarRepeticao(
      forma({ repete: true, termina: 'DATA', dataFinal: '2030-11-04' }),
      DATA,
    );
    expect(porData).toMatchObject({
      ok: true,
      extras: { recurrence: { endDate: '2030-11-04' } },
    });
    const porDoses = montarRepeticao(
      forma({ repete: true, termina: 'DOSES', totalDoses: '5' }),
      DATA,
    );
    expect(porDoses).toMatchObject({ ok: true, extras: { recurrence: { maxDoses: 5 } } });
  });

  test('CT-APP-REP05: os campos de término só valem quando o término é escolhido', () => {
    const r = montarRepeticao(
      forma({ repete: true, termina: 'NUNCA', dataFinal: '2030-11-04', totalDoses: '5' }),
      DATA,
    );
    expect(r).toEqual({
      ok: true,
      extras: { recurrence: { unit: 'YEAR', every: 1, anchor: 'APPLICATION' } },
    });
  });

  test.each([
    ['CT-APP-REP06', '0', 'YEAR'],
    ['CT-APP-REP07', '', 'YEAR'],
    ['CT-APP-REP08', 'abc', 'MONTH'],
    ['CT-APP-REP09', '51', 'YEAR'],
    ['CT-APP-REP10', '121', 'MONTH'],
    ['CT-APP-REP11', '105', 'WEEK'],
    ['CT-APP-REP12', '366', 'DAY'],
    ['CT-APP-REP13', '1.5', 'YEAR'],
  ] as const)('%s: "a cada" %j em %s é recusado com mensagem', (_id, cada, unidade) => {
    const r = montarRepeticao(forma({ repete: true, cada, unidade }), DATA);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.cada).toMatch(/Informe um número de 1 a/);
  });

  test.each([
    ['CT-APP-REP14', '1'],
    ['CT-APP-REP15', '121'],
    ['CT-APP-REP16', ''],
  ])('%s: total de doses %j é recusado', (_id, totalDoses) => {
    const r = montarRepeticao(forma({ repete: true, termina: 'DOSES', totalDoses }), DATA);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.totalDoses).toBe('Informe de 2 a 120 doses.');
  });

  test('CT-APP-REP17: a data final precisa ser depois da primeira dose', () => {
    for (const dataFinal of ['2026-11-04', '2026-11-03']) {
      const r = montarRepeticao(forma({ repete: true, termina: 'DATA', dataFinal }), DATA);
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.erros.dataFinal).toBe('Escolha uma data depois da primeira dose.');
    }
  });

  test('CT-APP-REP18: o aviso antecipado vale com ou sem repetição', () => {
    expect(montarRepeticao(forma({ avisar: ['14'] }), DATA)).toEqual({
      ok: true,
      extras: { remindDaysBefore: 14 },
    });
    expect(montarRepeticao(forma({ avisar: ['0'] }), DATA)).toEqual({
      ok: true,
      extras: { remindDaysBefore: 0 },
    });
    expect(montarRepeticao(forma({ avisar: [] }), DATA)).toEqual({ ok: true, extras: {} });
  });

  test('CT-APP-REP18b: vários avisos vão na lista, do maior para o menor, sem repetir', () => {
    expect(montarRepeticao(forma({ avisar: ['0', '7', '3'], avisarOutro: '7' }), DATA)).toEqual({
      ok: true,
      extras: { remindDays: [7, 3, 0] },
    });
    expect(montarRepeticao(forma({ avisar: ['3'], avisarOutro: '20' }), DATA)).toEqual({
      ok: true,
      extras: { remindDays: [20, 3] },
    });
  });

  test.each([['61'], ['99']])('CT-APP-REP18c: outro aviso %s é recusado', (avisarOutro) => {
    const r = montarRepeticao(forma({ avisarOutro }), DATA);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.erros.avisarOutro).toBe('Informe um número de 0 a 60.');
  });

  test('CT-APP-REP19: com "não repete", erros de repetição são ignorados', () => {
    expect(montarRepeticao(forma({ repete: false, cada: 'abc' }), DATA)).toEqual({
      ok: true,
      extras: {},
    });
  });
});

describe('formulário de repetição: textos para a pessoa', () => {
  test.each([
    ['CT-APP-REP20', { unit: 'DAY', every: 1 }, 'Todo dia'],
    ['CT-APP-REP21', { unit: 'WEEK', every: 1 }, 'Toda semana'],
    ['CT-APP-REP22', { unit: 'MONTH', every: 1 }, 'Todo mês'],
    ['CT-APP-REP23', { unit: 'YEAR', every: 1 }, 'Todo ano'],
    ['CT-APP-REP24', { unit: 'DAY', every: 15 }, 'A cada 15 dias'],
    ['CT-APP-REP25', { unit: 'WEEK', every: 2 }, 'A cada 2 semanas'],
    ['CT-APP-REP26', { unit: 'MONTH', every: 6 }, 'A cada 6 meses'],
    ['CT-APP-REP27', { unit: 'YEAR', every: 2 }, 'A cada 2 anos'],
  ] as const)('%s: %j', (_id, base, esperado) => {
    expect(
      descreverRepeticao({ ...base, anchor: 'APPLICATION', endDate: null, maxDoses: null }),
    ).toBe(`${esperado}, contando da data da aplicação`);
  });

  test('CT-APP-REP28: data fixa, com término por data e por número de doses', () => {
    expect(
      descreverRepeticao({
        unit: 'YEAR',
        every: 1,
        anchor: 'SCHEDULE',
        endDate: '2030-11-04',
        maxDoses: null,
      }),
    ).toBe('Todo ano, em datas fixas, até 04/11/2030');
    expect(
      descreverRepeticao({
        unit: 'MONTH',
        every: 6,
        anchor: 'SCHEDULE',
        endDate: null,
        maxDoses: 4,
      }),
    ).toBe('A cada 6 meses, em datas fixas, 4 doses no total');
  });

  test.each([
    ['CT-APP-REP29', null, 'Padrão: 7 dias antes'],
    ['CT-APP-REP30', 7, '7 dias antes'],
    ['CT-APP-REP31', 1, '1 dia antes'],
    ['CT-APP-REP32', 0, 'No próprio dia'],
    ['CT-APP-REP33', 30, '30 dias antes'],
  ] as const)('%s: aviso %j', (_id, dias, esperado) => {
    expect(descreverAviso(dias)).toBe(esperado);
  });

  test('CT-APP-REP34: descreve vários avisos em uma frase', () => {
    expect(descreverAvisos({ remindDays: [7, 3, 0], remindDaysBefore: 7 })).toBe(
      '7 dias antes, 3 dias antes e no próprio dia',
    );
    expect(descreverAvisos({ remindDays: null, remindDaysBefore: 14 })).toBe('14 dias antes');
  });
});
