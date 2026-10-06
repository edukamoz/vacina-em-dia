import { PNI_2026 } from './pni-2026';
import {
  ageGroupForMonths,
  ageGroupOf,
  canBecomeOverdue,
  dueDateForRule,
  notesForRule,
  rulesForMember,
} from './rules';
import { CALENDAR_GROUPS, type CalendarRule } from './types';

const ruleById = (id: string): CalendarRule => {
  const found = PNI_2026.rules.find((r) => r.id === id);
  if (!found) throw new Error(`regra ${id} ausente`);
  return found;
};

describe('dados do calendário (PNI 2026)', () => {
  test('CT-CAL-01 os identificadores das regras são únicos', () => {
    const ids = PNI_2026.rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test('CT-CAL-02 toda nota citada por uma regra existe, e toda nota é usada', () => {
    const cited = new Set(PNI_2026.rules.flatMap((r) => r.noteIds));
    for (const id of cited) expect(PNI_2026.notes[id]).toBeDefined();
    for (const id of Object.keys(PNI_2026.notes)) expect(cited.has(id)).toBe(true);
  });

  test.each([
    ['CHILD', 34],
    ['ADOLESCENT_YOUTH', 10],
    ['ADULT', 6],
    ['ELDERLY', 8],
    ['PREGNANT', 7],
  ] as const)('CT-CAL-03 a faixa %s tem %i linhas, como no calendário oficial', (group, total) => {
    expect(PNI_2026.rules.filter((r) => r.group === group)).toHaveLength(total);
  });

  test('CT-CAL-04 toda faixa conhecida tem regras e a fonte é oficial e versionada', () => {
    for (const group of CALENDAR_GROUPS) {
      expect(PNI_2026.rules.some((r) => r.group === group)).toBe(true);
    }
    expect(PNI_2026.source.isFictitious).toBe(false);
    expect(PNI_2026.source.version).toBe('2026');
    expect(PNI_2026.source.files).toHaveLength(5);
    expect(PNI_2026.source.notice).toMatch(/não substitui a caderneta oficial/);
  });

  test('CT-CAL-05 regras por idade usam meses válidos e dentro da faixa', () => {
    for (const r of PNI_2026.rules) {
      if (r.timing.kind !== 'AGE') continue;
      expect(Number.isInteger(r.timing.months)).toBe(true);
      if (r.group === 'CHILD') expect(r.timing.months).toBeLessThan(120);
      if (r.group === 'ADOLESCENT_YOUTH') {
        expect(r.timing.months).toBeGreaterThanOrEqual(120);
        expect(r.timing.months).toBeLessThan(300);
      }
    }
  });
});

describe('ageGroupForMonths', () => {
  test.each([
    [0, 'CHILD'],
    [119, 'CHILD'],
    [120, 'ADOLESCENT_YOUTH'],
    [299, 'ADOLESCENT_YOUTH'],
    [300, 'ADULT'],
    [719, 'ADULT'],
    [720, 'ELDERLY'],
    [1200, 'ELDERLY'],
  ] as const)('CT-CAL-06 %i meses pertencem à faixa %s', (months, group) => {
    expect(ageGroupForMonths(months)).toBe(group);
  });

  test('CT-CAL-07 ageGroupOf usa o nascimento e o dia de hoje', () => {
    expect(ageGroupOf('2016-10-07', '2026-10-06')).toBe('CHILD');
    expect(ageGroupOf('2016-10-06', '2026-10-06')).toBe('ADOLESCENT_YOUTH');
  });
});

describe('rulesForMember', () => {
  const today = '2026-10-06';

  test('CT-CAL-08 um bebê recebe todo o calendário da infância', () => {
    const rules = rulesForMember(PNI_2026, { birthDate: '2026-09-01', isPregnant: false }, today);
    expect(rules).toHaveLength(34);
    expect(rules.every((r) => r.group === 'CHILD')).toBe(true);
  });

  test('CT-CAL-09 um adulto recebe só as linhas da faixa adulta', () => {
    const rules = rulesForMember(PNI_2026, { birthDate: '1990-05-20', isPregnant: false }, today);
    expect(rules.every((r) => r.group === 'ADULT')).toBe(true);
    expect(rules).toHaveLength(6);
  });

  test('CT-CAL-10 uma gestante soma as linhas da gestação às da sua faixa', () => {
    const rules = rulesForMember(PNI_2026, { birthDate: '1995-03-01', isPregnant: true }, today);
    const groups = new Set(rules.map((r) => r.group));
    expect(groups).toEqual(new Set(['ADULT', 'PREGNANT']));
    expect(rules).toHaveLength(6 + 7);
  });

  test('CT-CAL-11 sem o grupo gestante, as linhas da gestação não aparecem', () => {
    const rules = rulesForMember(PNI_2026, { birthDate: '1995-03-01', isPregnant: false }, today);
    expect(rules.some((r) => r.group === 'PREGNANT')).toBe(false);
  });

  test('CT-CAL-12 um idoso recebe as linhas do idoso', () => {
    const rules = rulesForMember(PNI_2026, { birthDate: '1950-01-10', isPregnant: false }, today);
    expect(rules.every((r) => r.group === 'ELDERLY')).toBe(true);
    expect(rules).toHaveLength(8);
  });
});

describe('dueDateForRule e canBecomeOverdue', () => {
  test.each([
    ['crianca-hepatite-b', '2026-01-31', '2026-01-31'],
    ['crianca-penta-1', '2026-01-31', '2026-03-31'],
    ['crianca-scr-1', '2025-02-28', '2026-02-28'],
    ['crianca-dtp-2', '2022-03-10', '2026-03-10'],
    ['crianca-hpv', '2017-05-15', '2026-05-15'],
  ])('CT-CAL-13 %s para nascido em %s vence em %s', (id, birth, due) => {
    expect(dueDateForRule(ruleById(id), birth, '2026-10-06')).toBe(due);
  });

  test('CT-CAL-14 regra "conforme histórico" e de gestação usam o dia de hoje', () => {
    expect(dueDateForRule(ruleById('adulto-hepatite-b'), '1990-01-01', '2026-10-06')).toBe(
      '2026-10-06',
    );
    expect(dueDateForRule(ruleById('gestante-dtpa'), '1990-01-01', '2026-10-06')).toBe(
      '2026-10-06',
    );
  });

  test('CT-CAL-15 só regra por idade e sem condição pode atrasar', () => {
    expect(canBecomeOverdue(ruleById('crianca-penta-1'))).toBe(true);
    expect(canBecomeOverdue(ruleById('adolescente-dng4'))).toBe(true);
    expect(canBecomeOverdue(ruleById('crianca-febre-amarela-excepcional'))).toBe(false);
    expect(canBecomeOverdue(ruleById('crianca-pneumo-20-5-anos'))).toBe(false);
    expect(canBecomeOverdue(ruleById('adulto-hepatite-b'))).toBe(false);
    expect(canBecomeOverdue(ruleById('gestante-vsr'))).toBe(false);
  });
});

describe('notesForRule', () => {
  test('CT-CAL-16 devolve as notas da regra na ordem e vazio quando não há', () => {
    expect(notesForRule(PNI_2026, ruleById('crianca-rotavirus-1'))).toEqual([
      PNI_2026.notes['crianca.1'],
    ]);
    expect(notesForRule(PNI_2026, ruleById('crianca-bcg'))).toEqual([]);
  });

  test('CT-CAL-17 ignora notas ausentes do calendário', () => {
    const rule: CalendarRule = { ...ruleById('crianca-bcg'), noteIds: ['inexistente.9'] };
    expect(notesForRule(PNI_2026, rule)).toEqual([]);
  });
});
