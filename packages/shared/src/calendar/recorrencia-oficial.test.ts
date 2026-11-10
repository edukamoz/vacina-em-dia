import { PNI_2026 } from './pni-2026';
import { notesForRule, officialRecurrenceRule } from './rules';

const regra = (id: string) => {
  const found = PNI_2026.rules.find((r) => r.id === id);
  if (!found) throw new Error(`regra ${id} ausente`);
  return found;
};

describe('recorrência das linhas do calendário oficial (B69)', () => {
  test('CT-OFIC-01: só três regras têm repetição, e são as que o texto oficial diz que se repetem', () => {
    const comRepeticao = PNI_2026.rules.filter((r) => r.recurrence).map((r) => r.id);
    expect(comRepeticao.sort()).toEqual(['crianca-influenza-1', 'idoso-covid', 'idoso-influenza']);
  });

  test('CT-OFIC-02: influenza do idoso: o texto oficial diz "anual a cada temporada"', () => {
    const r = regra('idoso-influenza');
    expect(r.dose).toMatch(/anual/);
    expect(r.recurrence).toMatchObject({ unit: 'YEAR', every: 1 });
  });

  test('CT-OFIC-03: covid do idoso: o texto oficial diz "semestral"', () => {
    const r = regra('idoso-covid');
    expect(r.dose).toMatch(/semestral/);
    expect(r.recurrence).toMatchObject({ unit: 'MONTH', every: 6 });
  });

  test('CT-OFIC-04: influenza da criança: a nota oficial diz "todo ano" de 6 meses a 5 anos, 11 meses e 29 dias', () => {
    const r = regra('crianca-influenza-1');
    const nota = notesForRule(PNI_2026, r).join(' ');
    expect(nota).toMatch(/entre 6 meses e 5 anos, 11 meses e 29 dias/);
    expect(nota).toMatch(/todo ano/);
    expect(r.recurrence).toMatchObject({ unit: 'YEAR', every: 1, endsAtAgeMonths: 72 });
  });

  test('CT-OFIC-05: toda repetição cita de onde o texto oficial a tira', () => {
    for (const r of PNI_2026.rules.filter((x) => x.recurrence)) {
      expect(r.recurrence?.basis.length).toBeGreaterThan(10);
    }
  });

  test('CT-OFIC-06: dT e gestante não têm repetição: o texto não dá um intervalo seguro para a dose única', () => {
    // dT: "3 doses + reforços periódicos" vira uma só dose no app; repetir a cada 10 anos depois da
    // primeira aplicação estaria errado enquanto a série de 3 doses não termina.
    expect(regra('adulto-dt').recurrence ?? null).toBeNull();
    expect(regra('idoso-dt').recurrence ?? null).toBeNull();
    // Gestante: "por temporada" e "a cada gestação" dependem da gestação, não de um intervalo fixo.
    expect(regra('gestante-influenza').recurrence ?? null).toBeNull();
    expect(regra('gestante-covid').recurrence ?? null).toBeNull();
  });
});

describe('regra de repetição de uma linha oficial', () => {
  test('CT-OFIC-10: conta da aplicação, sem data final nem máximo, quando a linha não tem limite de idade', () => {
    expect(officialRecurrenceRule(regra('idoso-covid'), '1950-01-01', '2026-11-10')).toEqual({
      unit: 'MONTH',
      every: 6,
      anchor: 'APPLICATION',
      anchorDate: '2026-11-10',
      endDate: null,
      maxDoses: null,
    });
  });

  test('CT-OFIC-11: a criança só é vacinada até antes de completar 6 anos', () => {
    const r = officialRecurrenceRule(regra('crianca-influenza-1'), '2025-03-10', '2025-09-10');
    expect(r).toMatchObject({ unit: 'YEAR', every: 1, endDate: '2031-03-09' });
  });

  test('CT-OFIC-12: linha sem repetição não gera regra', () => {
    expect(officialRecurrenceRule(regra('adulto-dt'), '1990-01-01', '2026-11-10')).toBeNull();
    expect(officialRecurrenceRule(regra('crianca-bcg'), '2026-01-01', '2026-02-01')).toBeNull();
  });
});
