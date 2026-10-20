import { dataDaLinha, lerCaderneta, normalizar, type DoseAlvo } from './ler-caderneta';

const HOJE = '2026-10-20';

const dose = (id: string, vaccine: string, doseLabel: string, status = 'PENDING'): DoseAlvo => ({
  id,
  vaccine,
  doseLabel,
  status: status as DoseAlvo['status'],
});

const CRIANCA: DoseAlvo[] = [
  dose('hepb', 'hepatite B', '1 dose'),
  dose('penta1', 'penta (DTP+Hib+HB)', '1ª dose'),
  dose('penta2', 'penta (DTP+Hib+HB)', '2ª dose'),
  dose('vip1', 'poliomielite inativada VIP', '1ª dose'),
  dose('vip2', 'poliomielite inativada VIP', '2ª dose'),
  dose('vipr1', 'poliomielite inativada VIP', '1ª dose reforço'),
  dose('rota1', 'rotavírus humano', '1ª dose'),
  dose('scr1', 'tríplice viral SCR', '1ª dose'),
  dose('scr2', 'tríplice viral SCR', '2ª dose'),
  dose('fa1', 'febre amarela', '1 dose'),
  dose('dtp1', 'DTP', '1ª dose reforço'),
  dose('covid1', 'covid-19', '1ª dose'),
  dose('covid2', 'covid-19', '2ª dose'),
];

const ids = (linhas: string[], doses = CRIANCA) =>
  lerCaderneta(linhas, doses, HOJE).encontradas.map((e) => [e.dose.id, e.data]);

describe('normalizar', () => {
  test('CT-APP-OCR01: tira acento, maiúscula e as marcas de ordinal', () => {
    expect(normalizar('Rotavírus 1ª Dose')).toBe('rotavirus 1 dose');
    expect(normalizar('2º REFORÇO')).toBe('2 reforco');
  });
});

describe('dataDaLinha', () => {
  test.each([
    ['Vacina aplicada em 15/03/2026', '2026-03-15'],
    ['15-03-2026 Lote 123', '2026-03-15'],
    ['15.03.2026', '2026-03-15'],
    ['15 / 03 / 2026', '2026-03-15'],
    ['5/3/2026', '2026-03-05'],
    ['15/03/26', '2026-03-15'],
    ['02/05/98', '1998-05-02'],
  ])('CT-APP-OCR02: "%s" vira %s', (linha, esperado) => {
    expect(dataDaLinha(linha, HOJE)).toBe(esperado);
  });

  test.each([
    ['sem data nenhuma'],
    ['31/02/2026'],
    ['15/13/2026'],
    ['21/10/2026'],
    ['validade 12/2027'],
    ['telefone 3333-4444'],
  ])('CT-APP-OCR03: "%s" não dá data (inexistente, futura ou incompleta)', (linha) => {
    expect(dataDaLinha(linha, HOJE)).toBeNull();
  });

  test('CT-APP-OCR04: com duas datas na linha usa a primeira que já passou', () => {
    expect(dataDaLinha('Aplicada 10/08/2026 próxima 10/12/2026', HOJE)).toBe('2026-08-10');
    expect(dataDaLinha('próxima 10/12/2026 aplicada 10/08/2026', HOJE)).toBe('2026-08-10');
  });
});

describe('lerCaderneta', () => {
  test('CT-APP-OCR05: vacina, dose e data na mesma linha viram uma dose encontrada', () => {
    const r = lerCaderneta(['Pentavalente 1ª dose 15/03/2026 Lote AB12'], CRIANCA, HOJE);
    expect(r.encontradas).toHaveLength(1);
    expect(r.encontradas[0]).toMatchObject({ data: '2026-03-15' });
    expect(r.encontradas[0]?.dose.id).toBe('penta1');
    expect(r.encontradas[0]?.trecho).toContain('Pentavalente');
  });

  test.each([
    ['Hepatite B  dose ao nascer 02/02/2026', 'hepb'],
    ['Penta (DTP+Hib+HB) 2a dose 02/02/2026', 'penta2'],
    ['VIP 2ª dose 02/02/2026', 'vip2'],
    ['Poliomielite inativada D1 02/02/2026', 'vip1'],
    ['Rotavírus 1ª dose 02/02/2026', 'rota1'],
    ['Tríplice viral 2ª dose 02/02/2026', 'scr2'],
    ['SCR 1ª dose 02/02/2026', 'scr1'],
    ['Febre amarela dose única 02/02/2026', 'fa1'],
    ['Febre amarela 02/02/2026', 'fa1'],
    ['VIP 1º reforço 02/02/2026', 'vipr1'],
    ['VIP R1 02/02/2026', 'vipr1'],
    ['DTP reforço 02/02/2026', 'dtp1'],
  ])('CT-APP-OCR06: "%s" → dose %s', (linha, esperado) => {
    expect(ids([linha])).toEqual([[esperado, '2026-02-02']]);
  });

  test('CT-APP-OCR07: vacina numa linha e data na seguinte (colunas lidas em linhas separadas)', () => {
    expect(ids(['Rotavírus humano 1ª dose', '02/02/2026', 'Lote XY9'])).toEqual([
      ['rota1', '2026-02-02'],
    ]);
  });

  test('CT-APP-OCR08: a data não é emprestada da linha de outra vacina', () => {
    const r = lerCaderneta(['Rotavírus 1ª dose 02/02/2026', '03/03/2026'], CRIANCA, HOJE);
    expect(r.encontradas.map((e) => e.dose.id)).toEqual(['rota1']);
    expect(r.semEncaixe).toEqual(['03/03/2026']);
  });

  test('CT-APP-OCR09: várias vacinas na mesma foto, cada uma com a sua data', () => {
    expect(
      ids([
        'CADERNETA DE VACINAÇÃO',
        'Hepatite B ao nascer 01/01/2026',
        'Penta 1ª dose 01/03/2026',
        'VIP 1ª dose 01/03/2026',
        'Rotavírus 1ª dose 01/03/2026',
      ]),
    ).toEqual([
      ['hepb', '2026-01-01'],
      ['penta1', '2026-03-01'],
      ['vip1', '2026-03-01'],
      ['rota1', '2026-03-01'],
    ]);
  });

  test('CT-APP-OCR10: sem o número da dose e com mais de uma possível, não chuta', () => {
    const r = lerCaderneta(['Covid-19 10/05/2026'], CRIANCA, HOJE);
    expect(r.encontradas).toEqual([]);
    expect(r.semEncaixe).toEqual(['Covid-19 10/05/2026']);
  });

  test('CT-APP-OCR11: o número da dose escolhe entre as possíveis', () => {
    expect(ids(['Covid-19 2ª dose 10/05/2026'])).toEqual([['covid2', '2026-05-10']]);
  });

  test('CT-APP-OCR12: dose já aplicada ou cancelada não é proposta de novo', () => {
    const doses = [
      dose('a', 'febre amarela', '1 dose', 'APPLIED'),
      dose('b', 'rotavírus humano', '1ª dose', 'CANCELLED'),
    ];
    const r = lerCaderneta(
      ['Febre amarela 02/02/2026', 'Rotavírus 1ª dose 02/02/2026'],
      doses,
      HOJE,
    );
    expect(r.encontradas).toEqual([]);
  });

  test.each(['SCHEDULED', 'OVERDUE', 'PENDING'])(
    'CT-APP-OCR13: dose %s pode ser encontrada',
    (status) => {
      const doses = [dose('a', 'febre amarela', '1 dose', status)];
      expect(ids(['Febre amarela 02/02/2026'], doses)).toEqual([['a', '2026-02-02']]);
    },
  );

  test('CT-APP-OCR14: a mesma dose não é usada duas vezes (vale a primeira leitura)', () => {
    const r = lerCaderneta(['Febre amarela 02/02/2026', 'Febre amarela 03/03/2026'], CRIANCA, HOJE);
    expect(r.encontradas.map((e) => [e.dose.id, e.data])).toEqual([['fa1', '2026-02-02']]);
    expect(r.semEncaixe).toEqual(['Febre amarela 03/03/2026']);
  });

  test('CT-APP-OCR15: data no futuro ou vacina que a pessoa não tem ficam sem encaixe', () => {
    const r = lerCaderneta(['Febre amarela 02/02/2027', 'Raiva 1ª dose 02/02/2026'], CRIANCA, HOJE);
    expect(r.encontradas).toEqual([]);
    expect(r.semEncaixe).toEqual(['Raiva 1ª dose 02/02/2026']);
  });

  test('CT-APP-OCR16: texto sem nada útil ou lista vazia devolve resultado vazio', () => {
    expect(lerCaderneta([], CRIANCA, HOJE)).toEqual({ encontradas: [], semEncaixe: [] });
    expect(lerCaderneta(['Lote 123', 'Unidade de saúde'], CRIANCA, HOJE)).toEqual({
      encontradas: [],
      semEncaixe: [],
    });
  });

  test('CT-APP-OCR17: ordem pentavalente antes de DTP (a linha da penta não vira DTP)', () => {
    expect(ids(['Penta (DTP+Hib+HB) 1ª dose 02/02/2026'])).toEqual([['penta1', '2026-02-02']]);
  });
});
