import { OTHER_OWNER, OWNER, buildApp } from '../test-support';

describe('consentimento e exclusão de conta (RF09)', () => {
  test('CT-PRIV-01: sem registro, o consentimento aparece como não aceito', async () => {
    const app = buildApp();
    expect(await app.consents.get(OWNER)).toEqual({
      accepted: false,
      termVersion: null,
      acceptedAt: null,
      guardianDeclaration: false,
    });
  });

  test('CT-PRIV-02: registra o aceite com a versão do termo e o horário', async () => {
    const app = buildApp();
    const saved = await app.consents.accept(OWNER, {
      acceptedTerms: true,
      termVersion: '2026-10-06',
      guardianDeclaration: true,
    });
    expect(saved).toEqual({
      accepted: true,
      termVersion: '2026-10-06',
      acceptedAt: '2026-10-06T15:00:00.000Z',
      guardianDeclaration: true,
    });
    expect(await app.consents.get(OWNER)).toEqual(saved);
    expect((await app.consents.get(OTHER_OWNER)).accepted).toBe(false);
  });

  test('CT-PRIV-03: excluir a conta apaga membros, doses e consentimento, só do dono', async () => {
    const app = buildApp();
    await app.consent(OWNER);
    await app.consent(OTHER_OWNER);
    const mine = await app.members.create(OWNER, {
      name: 'Ana',
      birthDate: '1990-05-20',
      isPregnant: false,
    });
    await app.members.create(OTHER_OWNER, {
      name: 'Beto',
      birthDate: '1985-01-01',
      isPregnant: false,
    });
    if (!mine.ok) throw new Error('falhou');

    await app.accounts.deleteAccount(OWNER);

    expect(await app.members.list(OWNER)).toEqual([]);
    expect((await app.consents.get(OWNER)).accepted).toBe(false);
    expect(await app.store.doses.listByMember(OWNER, mine.value.id)).toEqual([]);
    expect(await app.members.list(OTHER_OWNER)).toHaveLength(1);
  });

  test('CT-PRIV-04: excluir uma conta que não existe não dá erro', async () => {
    const app = buildApp();
    await expect(app.accounts.deleteAccount(OWNER)).resolves.toBeUndefined();
  });
});
