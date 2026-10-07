import { createInMemoryStore } from './in-memory-store';
import type { StoredDose, StoredMember } from './repositories';

const member = (id: string): StoredMember => ({
  id,
  name: 'Ana',
  birthDate: '1990-05-20',
  isPregnant: false,
  relationship: null,
});
const dose = (id: string, memberId: string): StoredDose => ({
  id,
  memberId,
  ruleId: 'adulto-hepatite-b',
  status: 'PENDING',
  dueDate: '2026-10-06',
  scheduledDate: null,
  appliedDate: null,
});

describe('repositórios em memória', () => {
  test('CT-REP-01: cada dono só enxerga os próprios dados', async () => {
    const store = createInMemoryStore();
    await store.members.save('a', member('m1'));
    await store.doses.saveMany('a', [dose('d1', 'm1')]);

    expect(await store.members.get('a', 'm1')).toBeDefined();
    expect(await store.members.get('b', 'm1')).toBeUndefined();
    expect(await store.members.list('b')).toEqual([]);
    expect(await store.doses.get('b', 'd1')).toBeUndefined();
    expect(await store.doses.listByMember('b', 'm1')).toEqual([]);
  });

  test('CT-REP-02: salvar de novo substitui; remover o membro apaga as doses dele', async () => {
    const store = createInMemoryStore();
    await store.members.save('a', member('m1'));
    await store.members.save('a', member('m2'));
    await store.doses.saveMany('a', [dose('d1', 'm1'), dose('d2', 'm2')]);
    await store.doses.saveMany('a', [{ ...dose('d1', 'm1'), status: 'APPLIED' }]);
    expect((await store.doses.get('a', 'd1'))?.status).toBe('APPLIED');

    await store.members.remove('a', 'm1');
    expect(await store.members.get('a', 'm1')).toBeUndefined();
    expect(await store.doses.get('a', 'd1')).toBeUndefined();
    expect(await store.doses.get('a', 'd2')).toBeDefined();
    await expect(store.members.remove('desconhecido', 'm1')).resolves.toBeUndefined();
  });

  test('CT-REP-03: ao passar do limite de donos, descarta o mais antigo', async () => {
    const store = createInMemoryStore(2);
    await store.consents.save('a', {
      termVersion: '1',
      acceptedAt: 'x',
      guardianDeclaration: false,
    });
    await store.consents.save('b', {
      termVersion: '1',
      acceptedAt: 'x',
      guardianDeclaration: false,
    });
    await store.consents.save('c', {
      termVersion: '1',
      acceptedAt: 'x',
      guardianDeclaration: false,
    });
    expect(await store.consents.get('a')).toBeUndefined();
    expect(await store.consents.get('b')).toBeDefined();
    expect(await store.consents.get('c')).toBeDefined();
  });

  test('CT-REP-04: excluir a conta remove tudo do dono', async () => {
    const store = createInMemoryStore();
    await store.members.save('a', member('m1'));
    await store.consents.save('a', {
      termVersion: '1',
      acceptedAt: 'x',
      guardianDeclaration: true,
    });
    await store.accounts.deleteAll('a');
    expect(await store.members.list('a')).toEqual([]);
    expect(await store.consents.get('a')).toBeUndefined();
  });
});
