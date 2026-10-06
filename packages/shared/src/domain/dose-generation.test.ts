import { selectDoseRulesToGenerate } from './dose-generation';

describe('selectDoseRulesToGenerate', () => {
  test('CT-G09: gerar as doses duas vezes não duplica (uma por regra indicada)', () => {
    const applicable = ['r1', 'r2', 'r3'];
    const first = selectDoseRulesToGenerate(applicable, []);
    expect(first).toEqual(['r1', 'r2', 'r3']);
    const second = selectDoseRulesToGenerate(applicable, first);
    expect(second).toEqual([]);
  });

  test('gera só as regras que ainda não têm dose', () => {
    expect(selectDoseRulesToGenerate(['r1', 'r2', 'r3'], ['r2'])).toEqual(['r1', 'r3']);
  });

  test('ignora regras repetidas na lista de indicadas', () => {
    expect(selectDoseRulesToGenerate(['r1', 'r1', 'r2'], [])).toEqual(['r1', 'r2']);
  });

  test('não altera as listas recebidas', () => {
    const applicable = Object.freeze(['r1']);
    const existing = Object.freeze<string[]>([]);
    expect(selectDoseRulesToGenerate(applicable, existing)).toEqual(['r1']);
  });
});
