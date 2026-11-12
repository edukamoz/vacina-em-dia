import {
  HORA_PADRAO_DO_AVISO,
  HORAS_DE_AVISO,
  HORIZONTE_DE_AVISOS_EM_DIAS,
  MAXIMO_DE_AVISOS,
  planejarAvisos,
  type DoseParaAviso,
} from './avisos';

const HOJE = '2026-10-06';
// 07:00: ainda antes do horário padrão (8h) de hoje.
const MANHA = { hoje: HOJE, minutos: 7 * 60 };
const dose = (patch: Partial<DoseParaAviso> = {}): DoseParaAviso => ({
  status: 'PENDING',
  dueDate: '2026-10-20',
  scheduledDate: null,
  remindDaysBefore: null,
  ...patch,
});

describe('avisos no aparelho: o que agendar', () => {
  test('CT-AVISO-01: os horários e os limites estão definidos', () => {
    expect(HORAS_DE_AVISO).toEqual([8, 12, 18]);
    expect(HORA_PADRAO_DO_AVISO).toBe(8);
    expect(HORIZONTE_DE_AVISOS_EM_DIAS).toBe(45);
    // O iOS guarda no máximo 64 avisos agendados.
    expect(MAXIMO_DE_AVISOS).toBeLessThanOrEqual(64);
  });

  test('CT-AVISO-02b: vários avisos geram um para cada antecedência, mais o do dia', () => {
    const avisos = planejarAvisos([dose({ remindDays: [7, 3, 0] })], MANHA, 8);
    expect(avisos.map((a) => a.data)).toEqual(['2026-10-13', '2026-10-17', '2026-10-20']);
  });

  test('CT-AVISO-02: sem doses, não há o que agendar', () => {
    expect(planejarAvisos([], MANHA, 8)).toEqual([]);
  });

  test('CT-AVISO-03: uma dose gera dois avisos, o do dia e o da antecedência padrão de 7 dias', () => {
    const avisos = planejarAvisos([dose()], MANHA, 8);
    expect(avisos.map((a) => [a.data, a.hora])).toEqual([
      ['2026-10-13', 8],
      ['2026-10-20', 8],
    ]);
    expect(avisos[0]?.corpo).toContain('1 vacina chega nos próximos dias');
    expect(avisos[1]?.corpo).toContain('1 vacina é para hoje');
  });

  test('CT-AVISO-04: a antecedência escolhida na dose vale no lugar dos 7 dias', () => {
    const avisos = planejarAvisos([dose({ remindDaysBefore: 14 })], MANHA, 8);
    expect(avisos.map((a) => a.data)).toEqual(['2026-10-06', '2026-10-20']);
  });

  test('CT-AVISO-05: antecedência zero avisa só no próprio dia', () => {
    const avisos = planejarAvisos([dose({ remindDaysBefore: 0 })], MANHA, 8);
    expect(avisos.map((a) => a.data)).toEqual(['2026-10-20']);
  });

  test('CT-AVISO-06: dose agendada usa a data do agendamento, não a prevista', () => {
    const avisos = planejarAvisos(
      [dose({ status: 'SCHEDULED', dueDate: '2026-12-01', scheduledDate: '2026-10-10' })],
      MANHA,
      8,
    );
    // A antecedência (7 dias antes de 10/10) cairia em 03/10, que já passou: só resta o aviso do dia.
    expect(avisos.map((a) => a.data)).toEqual(['2026-10-10']);
  });

  test('CT-AVISO-07: dose aplicada ou cancelada nunca gera aviso', () => {
    expect(
      planejarAvisos([dose({ status: 'APPLIED' }), dose({ status: 'CANCELLED' })], MANHA, 8),
    ).toEqual([]);
  });

  test('CT-AVISO-08: a mesma data junta as doses em um só aviso, só com a quantidade', () => {
    const avisos = planejarAvisos([dose(), dose(), dose({ dueDate: '2026-10-20' })], MANHA, 8);
    const noDia = avisos.find((a) => a.data === '2026-10-20');
    expect(noDia?.corpo).toContain('3 vacinas são para hoje');
    expect(noDia?.titulo).toBe('Vacina em Dia');
  });

  test('CT-AVISO-09: o texto nunca traz nome de pessoa nem de vacina', () => {
    const avisos = planejarAvisos([dose()], MANHA, 8);
    for (const aviso of avisos) {
      expect(`${aviso.titulo} ${aviso.corpo}`).not.toMatch(/Maria|BCG|hepatite|gripe|Gripe/i);
    }
  });

  test('CT-AVISO-10: dose que venceu ontem gera um aviso de atraso hoje', () => {
    const avisos = planejarAvisos([dose({ status: 'OVERDUE', dueDate: '2026-10-05' })], MANHA, 8);
    expect(avisos).toHaveLength(1);
    expect(avisos[0]).toMatchObject({ data: '2026-10-06' });
    expect(avisos[0]?.corpo).toContain('1 vacina está atrasada');
  });

  test('CT-AVISO-11: dose atrasada há muito tempo não gera aviso novo (já avisou)', () => {
    expect(planejarAvisos([dose({ status: 'OVERDUE', dueDate: '2026-09-01' })], MANHA, 8)).toEqual(
      [],
    );
  });

  test('CT-AVISO-12: um dia pode juntar vacina de hoje, que chega e atrasada', () => {
    const avisos = planejarAvisos(
      [
        dose({ dueDate: '2026-10-13', remindDaysBefore: 7 }), // aviso antecipado hoje (06 -> 13)
        dose({ dueDate: '2026-10-06' }), // é para hoje
        dose({ status: 'OVERDUE', dueDate: '2026-10-05' }), // atraso avisado hoje
      ],
      MANHA,
      8,
    );
    const hoje = avisos.find((a) => a.data === HOJE);
    expect(hoje?.corpo).toBe(
      '1 vacina é para hoje, 1 vacina chega nos próximos dias e 1 vacina está atrasada. Abra o aplicativo para ver quais.',
    );
  });
});

describe('avisos no aparelho: horário e limites', () => {
  test('CT-AVISO-13: o aviso de hoje só entra se o horário ainda não passou', () => {
    const d = [dose({ dueDate: '2026-10-06', remindDaysBefore: 0 })];
    expect(planejarAvisos(d, { hoje: HOJE, minutos: 7 * 60 }, 8)).toHaveLength(1);
    expect(planejarAvisos(d, { hoje: HOJE, minutos: 8 * 60 }, 8)).toHaveLength(0);
    expect(planejarAvisos(d, { hoje: HOJE, minutos: 9 * 60 }, 8)).toHaveLength(0);
  });

  test('CT-AVISO-14: o horário escolhido vai em cada aviso', () => {
    for (const hora of HORAS_DE_AVISO) {
      expect(planejarAvisos([dose()], MANHA, hora).every((a) => a.hora === hora)).toBe(true);
    }
  });

  test('CT-AVISO-15: não agenda além do horizonte', () => {
    const longe = dose({ dueDate: '2026-12-31', remindDaysBefore: 0 });
    expect(planejarAvisos([longe], MANHA, 8)).toEqual([]);
    const limite = dose({ dueDate: '2026-11-20', remindDaysBefore: 0 }); // 45 dias depois de hoje
    expect(planejarAvisos([limite], MANHA, 8)).toHaveLength(1);
    const alem = dose({ dueDate: '2026-11-21', remindDaysBefore: 0 });
    expect(planejarAvisos([alem], MANHA, 8)).toEqual([]);
  });

  test('CT-AVISO-16: a lista é limitada e fica em ordem de data', () => {
    const muitas = Array.from({ length: 200 }, (_, i) =>
      dose({ dueDate: `2026-10-${String((i % 25) + 7).padStart(2, '0')}`, remindDaysBefore: 3 }),
    );
    const avisos = planejarAvisos(muitas, MANHA, 8);
    expect(avisos.length).toBeLessThanOrEqual(MAXIMO_DE_AVISOS);
    const datas = avisos.map((a) => a.data);
    expect(datas).toEqual([...datas].sort());
  });

  test('CT-AVISO-17: dose aplicada é ignorada mesmo entre muitas', () => {
    const avisos = planejarAvisos(
      [dose({ status: 'APPLIED' }), dose({ dueDate: '2026-10-08', remindDaysBefore: 0 })],
      MANHA,
      8,
    );
    expect(avisos).toHaveLength(1);
    expect(avisos[0]?.data).toBe('2026-10-08');
  });
});
