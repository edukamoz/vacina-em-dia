import { createInMemoryDoseRepository } from './in-memory-dose-repository';
import type { StoredDose } from './dose-repository';

const dose = (id: string): StoredDose => ({
  id,
  vaccine: 'Vacina de exemplo',
  doseLabel: '1ª dose',
  status: 'PENDING',
  dueDate: '2026-11-04',
  scheduledDate: null,
  appliedDate: null,
});

describe('repositório de doses em memória', () => {
  test('CT-API-R01: lista as doses na ordem do seed', async () => {
    const repo = createInMemoryDoseRepository([dose('a'), dose('b')]);
    expect((await repo.list()).map((d) => d.id)).toEqual(['a', 'b']);
  });

  test('CT-API-R02: devolve undefined para dose inexistente', async () => {
    const repo = createInMemoryDoseRepository([dose('a')]);
    expect(await repo.get('zzz')).toBeUndefined();
  });

  test('CT-API-R03: save substitui a dose e preserva a ordem', async () => {
    const repo = createInMemoryDoseRepository([dose('a'), dose('b')]);
    await repo.save({ ...dose('a'), status: 'APPLIED', appliedDate: '2026-10-01' });
    expect((await repo.get('a'))?.status).toBe('APPLIED');
    expect((await repo.list()).map((d) => d.id)).toEqual(['a', 'b']);
  });

  test('CT-API-R04: alterar o seed original não afeta o repositório', async () => {
    const seed = [dose('a')];
    const repo = createInMemoryDoseRepository(seed);
    seed.push(dose('b'));
    expect(await repo.list()).toHaveLength(1);
  });
});
