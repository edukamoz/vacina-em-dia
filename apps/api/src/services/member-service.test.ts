import { MAX_CUSTOM_DOSES, PNI_2026 } from '@vacina/shared';
import { MAX_MEMBERS } from './member-service';
import { OTHER_OWNER, OWNER, buildApp } from '../test-support';

const BABY = { name: 'Bebê', birthDate: '2026-09-01', isPregnant: false };
const ADULT = { name: 'Ana', birthDate: '1990-05-20', isPregnant: false };

const dosesOf = async (app: ReturnType<typeof buildApp>, memberId: string) => {
  const result = await app.doses.listForMember(OWNER, memberId);
  if (!result.ok) throw new Error('calendário ausente');
  return result.value;
};

describe('serviço de membros da família (RF02)', () => {
  test('CT-FAM-01: sem consentimento, não cadastra', async () => {
    const app = buildApp();
    expect(await app.members.create(OWNER, ADULT)).toEqual({
      ok: false,
      error: { code: 'CONSENT_REQUIRED' },
    });
    expect(await app.members.list(OWNER)).toEqual([]);
  });

  test('CT-FAM-02: um bebê recebe todo o calendário da infância em Pendente (T1)', async () => {
    const app = buildApp();
    await app.consent();
    const created = await app.members.create(OWNER, BABY);
    if (!created.ok) throw new Error('falhou');
    expect(created.value).toMatchObject({ name: 'Bebê', ageGroup: 'CHILD', isPregnant: false });

    const calendar = await dosesOf(app, created.value.id);
    expect(calendar.items).toHaveLength(34);
    // Nascido em 01/09: as doses "ao nascer" já venceram; as demais ainda estão no futuro.
    const status = (rule: string) => calendar.items.find((d) => d.ruleId === rule)?.status;
    expect(status('crianca-hepatite-b')).toBe('OVERDUE');
    expect(status('crianca-bcg')).toBe('OVERDUE');
    expect(calendar.items.filter((d) => d.status === 'PENDING')).toHaveLength(32);
    const penta = calendar.items.find((d) => d.ruleId === 'crianca-penta-1');
    expect(penta?.dueDate).toBe('2026-11-01');
    expect(calendar.source.version).toBe(PNI_2026.source.version);
    expect(calendar.source.isFictitious).toBe(false);
  });

  test('CT-FAM-03: menor de 18 anos exige a declaração de responsável', async () => {
    const app = buildApp();
    await app.consent(OWNER, false);
    expect(await app.members.create(OWNER, BABY)).toEqual({
      ok: false,
      error: { code: 'GUARDIAN_DECLARATION_REQUIRED' },
    });
    await app.consent(OWNER, true);
    expect((await app.members.create(OWNER, BABY)).ok).toBe(true);
  });

  test('CT-FAM-04: um adulto não precisa da declaração e recebe a faixa adulta', async () => {
    const app = buildApp();
    await app.consent(OWNER, false);
    const created = await app.members.create(OWNER, ADULT);
    if (!created.ok) throw new Error('falhou');
    expect(created.value.ageGroup).toBe('ADULT');
    const calendar = await dosesOf(app, created.value.id);
    expect(calendar.items).toHaveLength(6);
    // "Conforme histórico": nunca fica atrasada sozinha.
    expect(calendar.items.every((d) => d.status === 'PENDING')).toBe(true);
  });

  test('CT-FAM-05: data de nascimento no futuro é recusada; hoje é aceito', async () => {
    const app = buildApp();
    await app.consent();
    expect(await app.members.create(OWNER, { ...ADULT, birthDate: '2026-10-07' })).toEqual({
      ok: false,
      error: { code: 'INVALID_BIRTH_DATE' },
    });
    expect((await app.members.create(OWNER, { ...ADULT, birthDate: '2026-10-06' })).ok).toBe(true);
  });

  test('CT-FAM-06: respeita o limite de membros por conta', async () => {
    const app = buildApp();
    await app.consent();
    for (let i = 0; i < MAX_MEMBERS; i += 1) {
      expect((await app.members.create(OWNER, ADULT)).ok).toBe(true);
    }
    expect(await app.members.create(OWNER, ADULT)).toEqual({
      ok: false,
      error: { code: 'LIMIT_REACHED', scope: 'members' },
    });
  });

  test('CT-FAM-07: lista e busca só os membros do próprio dono', async () => {
    const app = buildApp();
    await app.consent();
    await app.consent(OTHER_OWNER);
    const mine = await app.members.create(OWNER, ADULT);
    if (!mine.ok) throw new Error('falhou');

    expect(await app.members.list(OWNER)).toHaveLength(1);
    expect(await app.members.list(OTHER_OWNER)).toEqual([]);
    expect(await app.members.get(OWNER, mine.value.id)).toMatchObject({ ok: true });
    expect(await app.members.get(OTHER_OWNER, mine.value.id)).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect((await app.members.remove(OTHER_OWNER, mine.value.id)).ok).toBe(false);
    expect((await app.doses.listForMember(OTHER_OWNER, mine.value.id)).ok).toBe(false);
  });

  test('CT-FAM-08: editar para gestante gera as doses da gestação sem duplicar nem apagar', async () => {
    const app = buildApp();
    await app.consent();
    const created = await app.members.create(OWNER, ADULT);
    if (!created.ok) throw new Error('falhou');
    const before = await dosesOf(app, created.value.id);
    expect(before.items).toHaveLength(6);

    const updated = await app.members.update(OWNER, created.value.id, {
      ...ADULT,
      isPregnant: true,
    });
    expect(updated).toMatchObject({ ok: true, value: { isPregnant: true } });
    expect((await dosesOf(app, created.value.id)).items).toHaveLength(13);

    // Salvar de novo não duplica.
    await app.members.update(OWNER, created.value.id, { ...ADULT, isPregnant: true });
    expect((await dosesOf(app, created.value.id)).items).toHaveLength(13);
  });

  test('CT-FAM-09: editar exige consentimento, data válida e membro existente', async () => {
    const app = buildApp();
    await app.consent();
    const created = await app.members.create(OWNER, ADULT);
    if (!created.ok) throw new Error('falhou');
    expect(await app.members.update(OWNER, 'nao-existe', ADULT)).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(
      await app.members.update(OWNER, created.value.id, { ...ADULT, birthDate: '2030-01-01' }),
    ).toEqual({ ok: false, error: { code: 'INVALID_BIRTH_DATE' } });
  });

  test('CT-FAM-10: excluir o membro apaga as doses dele em cascata', async () => {
    const app = buildApp();
    await app.consent();
    const created = await app.members.create(OWNER, ADULT);
    if (!created.ok) throw new Error('falhou');
    const doseId = (await dosesOf(app, created.value.id)).items[0]?.id ?? '';

    expect(await app.members.remove(OWNER, created.value.id)).toEqual({ ok: true, value: null });
    expect(await app.members.list(OWNER)).toEqual([]);
    expect(await app.doses.get(OWNER, doseId)).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(await app.members.remove(OWNER, created.value.id)).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });

  test('CT-FAM-REL-01: guarda o parentesco, troca na edição e aceita não informar', async () => {
    const app = buildApp();
    await app.consent();
    const created = await app.members.create(OWNER, { ...ADULT, relationship: 'MOTHER' });
    if (!created.ok) throw new Error('falhou');
    expect(created.value.relationship).toBe('MOTHER');
    const updated = await app.members.update(OWNER, created.value.id, {
      ...ADULT,
      relationship: 'SELF',
    });
    expect(updated.ok && updated.value.relationship).toBe('SELF');
    const cleared = await app.members.update(OWNER, created.value.id, ADULT);
    expect(cleared.ok && cleared.value.relationship).toBeNull();
    expect((await app.members.list(OWNER))[0]?.relationship).toBeNull();
  });

  describe('dose avulsa (RF04)', () => {
    const AVULSA = { vaccine: 'Febre tifoide', doseLabel: '1ª dose', dueDate: '2026-11-04' };

    async function comMembro() {
      const app = buildApp();
      await app.consent();
      const created = await app.members.create(OWNER, ADULT);
      if (!created.ok) throw new Error('falhou');
      return { app, memberId: created.value.id };
    }

    test('CT-AV-01: cadastra em Pendente, com origem CUSTOM e sem linha do calendário', async () => {
      const { app, memberId } = await comMembro();
      const result = await app.members.addCustomDose(OWNER, memberId, AVULSA);
      expect(result).toMatchObject({
        ok: true,
        value: {
          origin: 'CUSTOM',
          ruleId: null,
          vaccine: 'Febre tifoide',
          doseLabel: '1ª dose',
          status: 'PENDING',
          dueDate: '2026-11-04',
          scheduledDate: null,
          appliedDate: null,
          notes: [],
        },
      });
    });

    test('CT-AV-02: aparece na lista do membro, junto das oficiais, na ordem da data prevista', async () => {
      const { app, memberId } = await comMembro();
      await app.members.addCustomDose(OWNER, memberId, { ...AVULSA, dueDate: '2026-10-06' });
      const lista = await app.doses.listForMember(OWNER, memberId);
      if (!lista.ok) throw new Error('falhou');
      const avulsas = lista.value.items.filter((d) => d.origin === 'CUSTOM');
      expect(avulsas).toHaveLength(1);
      expect(lista.value.items.some((d) => d.origin === 'OFFICIAL')).toBe(true);
      const datas = lista.value.items.map((d) => d.dueDate);
      expect(datas).toEqual([...datas].sort());
    });

    test('CT-AV-03: segue o ciclo de estados: agenda, aplica e cancela como as oficiais', async () => {
      const { app, memberId } = await comMembro();
      const criada = await app.members.addCustomDose(OWNER, memberId, AVULSA);
      if (!criada.ok) throw new Error('falhou');
      const id = criada.value.id;
      expect(
        await app.doses.applyEvent(OWNER, id, { type: 'SCHEDULE', date: '2026-10-20' }),
      ).toMatchObject({ ok: true, value: { status: 'SCHEDULED', scheduledDate: '2026-10-20' } });
      expect(
        await app.doses.applyEvent(OWNER, id, { type: 'APPLY', date: '2026-10-06' }),
      ).toMatchObject({ ok: true, value: { status: 'APPLIED', origin: 'CUSTOM' } });
      const outra = await app.members.addCustomDose(OWNER, memberId, AVULSA);
      if (!outra.ok) throw new Error('falhou');
      expect(
        await app.doses.applyEvent(OWNER, outra.value.id, { type: 'CANCEL', confirmed: true }),
      ).toMatchObject({ ok: true, value: { status: 'CANCELLED' } });
    });

    test('CT-T04 em dose avulsa: a rotina de prazo a marca como atrasada quando a data passa', async () => {
      const { app, memberId } = await comMembro();
      await app.members.addCustomDose(OWNER, memberId, { ...AVULSA, dueDate: '2026-10-06' });
      app.setNow('2026-10-08T15:00:00.000Z');
      const lista = await app.doses.listForMember(OWNER, memberId);
      if (!lista.ok) throw new Error('falhou');
      expect(lista.value.items.find((d) => d.origin === 'CUSTOM')?.status).toBe('OVERDUE');
    });

    test('CT-AV-04: editar a pessoa não duplica nem apaga a dose avulsa', async () => {
      const { app, memberId } = await comMembro();
      await app.members.addCustomDose(OWNER, memberId, AVULSA);
      await app.members.update(OWNER, memberId, { ...ADULT, name: 'Ana Maria' });
      const lista = await app.doses.listForMember(OWNER, memberId);
      if (!lista.ok) throw new Error('falhou');
      expect(lista.value.items.filter((d) => d.origin === 'CUSTOM')).toHaveLength(1);
    });

    test.each([
      ['ontem', '2026-10-05'],
      ['mais de 10 anos à frente', '2037-01-01'],
    ])('CT-AV-05: recusa a data prevista %s', async (_nome, dueDate) => {
      const { app, memberId } = await comMembro();
      expect(await app.members.addCustomDose(OWNER, memberId, { ...AVULSA, dueDate })).toEqual({
        ok: false,
        error: { code: 'INVALID_DOSE_DATE' },
      });
    });

    test('CT-AV-06: hoje é aceito (valor limite)', async () => {
      const { app, memberId } = await comMembro();
      const result = await app.members.addCustomDose(OWNER, memberId, {
        ...AVULSA,
        dueDate: '2026-10-06',
      });
      expect(result.ok).toBe(true);
    });

    test('CT-AV-07: respeita o limite de doses avulsas por pessoa', async () => {
      const { app, memberId } = await comMembro();
      for (let i = 0; i < MAX_CUSTOM_DOSES; i += 1) {
        expect((await app.members.addCustomDose(OWNER, memberId, AVULSA)).ok).toBe(true);
      }
      expect(await app.members.addCustomDose(OWNER, memberId, AVULSA)).toEqual({
        ok: false,
        error: { code: 'LIMIT_REACHED', scope: 'customDoses' },
      });
    });

    test('CT-AV-08: exige consentimento e só vale para membro do próprio dono', async () => {
      const semConsentimento = buildApp();
      expect(await semConsentimento.members.addCustomDose(OWNER, 'm-1', AVULSA)).toEqual({
        ok: false,
        error: { code: 'CONSENT_REQUIRED' },
      });
      const { app, memberId } = await comMembro();
      await app.consent(OTHER_OWNER);
      expect(await app.members.addCustomDose(OTHER_OWNER, memberId, AVULSA)).toEqual({
        ok: false,
        error: { code: 'NOT_FOUND' },
      });
      expect(await app.members.addCustomDose(OWNER, 'nao-existe', AVULSA)).toEqual({
        ok: false,
        error: { code: 'NOT_FOUND' },
      });
    });
  });
});
