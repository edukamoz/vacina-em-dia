import { MAX_CUSTOM_DOSES, type CustomDoseInput, type DoseResponse } from '@vacina/shared';
import { OTHER_OWNER, OWNER, buildApp } from '../test-support';

// Hoje (civil, Brasília): 2026-10-06.
const ADULTO = { name: 'Ana', birthDate: '1990-05-20', isPregnant: false };
const GRIPE: CustomDoseInput = {
  vaccine: 'Gripe',
  doseLabel: 'Anual',
  dueDate: '2026-11-04',
  recurrence: { unit: 'YEAR', every: 1, anchor: 'APPLICATION' },
  remindDaysBefore: 14,
};

async function setup() {
  const app = buildApp();
  await app.consent();
  const created = await app.members.create(OWNER, ADULTO);
  if (!created.ok) throw new Error('falhou');
  const memberId = created.value.id;
  const avulsas = async (): Promise<DoseResponse[]> => {
    const result = await app.doses.listForMember(OWNER, memberId);
    if (!result.ok) throw new Error('calendário ausente');
    return result.value.items.filter((d) => d.origin === 'CUSTOM');
  };
  const criar = async (input: CustomDoseInput = GRIPE): Promise<DoseResponse> => {
    const result = await app.members.addCustomDose(OWNER, memberId, input);
    if (!result.ok) throw new Error(`não criou: ${result.error.code}`);
    return result.value;
  };
  const aplicar = (id: string, date = '2026-10-06') =>
    app.doses.applyEvent(OWNER, id, { type: 'APPLY', date });
  return { app, memberId, avulsas, criar, aplicar };
}

describe('dose avulsa que se repete: cadastro', () => {
  test('CT-REC-90: a resposta traz a repetição, a dose 1 e o aviso antecipado', async () => {
    const { criar } = await setup();
    expect(await criar()).toMatchObject({
      origin: 'CUSTOM',
      status: 'PENDING',
      recurrence: { unit: 'YEAR', every: 1, anchor: 'APPLICATION', endDate: null, maxDoses: null },
      occurrence: 1,
      remindDaysBefore: 14,
    });
  });

  test('CT-REC-91: sem repetição, os campos novos vêm vazios', async () => {
    const { criar } = await setup();
    const dose = await criar({ vaccine: 'Tifoide', doseLabel: '1ª', dueDate: '2026-11-04' });
    expect(dose).toMatchObject({ recurrence: null, occurrence: null, remindDaysBefore: null });
  });

  test('CT-REC-91b: vários avisos voltam em ordem, e o aviso único guarda o maior', async () => {
    const { criar } = await setup();
    const dose = await criar({
      vaccine: 'Raiva',
      doseLabel: '1ª',
      dueDate: '2026-11-04',
      remindDays: [0, 7, 3],
    });
    expect(dose).toMatchObject({ remindDays: [7, 3, 0], remindDaysBefore: 7 });
  });

  test('CT-REC-92: a série conta como uma só no limite de doses avulsas', async () => {
    const { app, memberId, criar, aplicar } = await setup();
    const primeira = await criar();
    await aplicar(primeira.id); // gera a 2ª dose da série
    for (let i = 0; i < MAX_CUSTOM_DOSES - 1; i += 1) {
      const result = await app.members.addCustomDose(OWNER, memberId, {
        vaccine: `Outra ${i}`,
        doseLabel: '1ª',
        dueDate: '2026-11-04',
      });
      expect(result.ok).toBe(true);
    }
    expect(
      await app.members.addCustomDose(OWNER, memberId, {
        vaccine: 'Demais',
        doseLabel: '1ª',
        dueDate: '2026-11-04',
      }),
    ).toEqual({ ok: false, error: { code: 'LIMIT_REACHED', scope: 'customDoses' } });
  });
});

describe('dose avulsa que se repete: aplicar cria a próxima', () => {
  test('CT-REC-93: contando da aplicação, a próxima nasce Pendente um ano depois', async () => {
    const { criar, aplicar, avulsas } = await setup();
    const primeira = await criar();
    expect(await aplicar(primeira.id)).toMatchObject({ ok: true, value: { status: 'APPLIED' } });
    const [aplicada, proxima] = await avulsas();
    expect(aplicada).toMatchObject({ id: primeira.id, status: 'APPLIED', occurrence: 1 });
    expect(proxima).toMatchObject({
      status: 'PENDING',
      dueDate: '2027-10-06',
      scheduledDate: null,
      appliedDate: null,
      occurrence: 2,
    });
  });

  test('CT-REC-94: a próxima herda nome, dose, repetição e aviso antecipado', async () => {
    const { criar, aplicar, avulsas } = await setup();
    const primeira = await criar();
    await aplicar(primeira.id);
    const proxima = (await avulsas()).find((d) => d.occurrence === 2);
    expect(proxima).toMatchObject({
      vaccine: 'Gripe',
      doseLabel: 'Anual',
      origin: 'CUSTOM',
      recurrence: { unit: 'YEAR', every: 1, anchor: 'APPLICATION' },
      remindDaysBefore: 14,
    });
    expect(proxima?.id).not.toBe(primeira.id);
  });

  test('CT-REC-95: na grade fixa, aplicar antes do prazo não desloca a próxima data', async () => {
    const { criar, aplicar, avulsas } = await setup();
    const primeira = await criar({
      ...GRIPE,
      recurrence: { unit: 'YEAR', every: 1, anchor: 'SCHEDULE' },
    });
    await aplicar(primeira.id, '2026-10-06');
    expect((await avulsas()).find((d) => d.occurrence === 2)?.dueDate).toBe('2027-11-04');
  });

  test('CT-REC-96: aplicar de novo a mesma dose é recusado e não duplica a próxima', async () => {
    const { criar, aplicar, avulsas } = await setup();
    const primeira = await criar();
    await aplicar(primeira.id);
    expect(await aplicar(primeira.id)).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TRANSITION' },
    });
    expect(await avulsas()).toHaveLength(2);
  });

  test('CT-REC-97: aplicação antiga gera uma próxima já vencida, que aparece Atrasada', async () => {
    const { criar, aplicar, avulsas } = await setup();
    const primeira = await criar();
    await aplicar(primeira.id, '2025-01-10');
    const proxima = (await avulsas()).find((d) => d.occurrence === 2);
    expect(proxima).toMatchObject({ dueDate: '2026-01-10', status: 'OVERDUE' });
  });

  test('CT-REC-98: a série para no máximo de doses informado', async () => {
    const { criar, aplicar, avulsas } = await setup();
    const primeira = await criar({
      ...GRIPE,
      recurrence: { unit: 'MONTH', every: 6, anchor: 'APPLICATION', maxDoses: 2 },
    });
    await aplicar(primeira.id);
    const segunda = (await avulsas()).find((d) => d.occurrence === 2);
    expect(segunda?.dueDate).toBe('2027-04-06');
    await aplicar(String(segunda?.id), '2026-10-06');
    expect(await avulsas()).toHaveLength(2);
  });

  test('CT-REC-99: a série para na data final', async () => {
    const { criar, aplicar, avulsas } = await setup();
    const primeira = await criar({
      ...GRIPE,
      recurrence: { unit: 'YEAR', every: 1, anchor: 'APPLICATION', endDate: '2027-10-05' },
    });
    await aplicar(primeira.id);
    expect(await avulsas()).toHaveLength(1);
  });

  test('CT-REC-100: dose sem repetição não gera próxima', async () => {
    const { criar, aplicar, avulsas } = await setup();
    const unica = await criar({ vaccine: 'Tifoide', doseLabel: '1ª', dueDate: '2026-11-04' });
    await aplicar(unica.id);
    expect(await avulsas()).toHaveLength(1);
  });

  test('CT-REC-101: agendar e reagendar não criam a próxima antes da aplicação', async () => {
    const { app, criar, avulsas } = await setup();
    const primeira = await criar();
    await app.doses.applyEvent(OWNER, primeira.id, { type: 'SCHEDULE', date: '2026-10-20' });
    expect(await avulsas()).toHaveLength(1);
    expect((await avulsas())[0]).toMatchObject({ status: 'SCHEDULED', occurrence: 1 });
  });

  test('CT-REC-102: outro dono não aplica nem cria a próxima dose', async () => {
    const { app, criar, avulsas } = await setup();
    const primeira = await criar();
    expect(
      await app.doses.applyEvent(OTHER_OWNER, primeira.id, { type: 'APPLY', date: '2026-10-06' }),
    ).toEqual({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(await avulsas()).toHaveLength(1);
  });

  test('CT-REC-103: dose do calendário oficial não gera próxima ao ser aplicada', async () => {
    const { app, memberId, aplicar } = await setup();
    const calendario = await app.doses.listForMember(OWNER, memberId);
    if (!calendario.ok) throw new Error('calendário ausente');
    const oficial = calendario.value.items.find(
      (d) => d.origin === 'OFFICIAL' && d.dueDate <= '2026-10-06',
    );
    if (!oficial) throw new Error('sem dose oficial vencida');
    const antes = calendario.value.items.length;
    await aplicar(oficial.id);
    const depois = await app.doses.listForMember(OWNER, memberId);
    if (!depois.ok) throw new Error('calendário ausente');
    expect(depois.value.items).toHaveLength(antes);
  });
});

describe('dose avulsa que se repete: cancelar', () => {
  test('CT-REC-104: cancelar só esta pula a dose e a série continua', async () => {
    const { app, criar, avulsas } = await setup();
    const primeira = await criar();
    expect(
      await app.doses.applyEvent(OWNER, primeira.id, { type: 'CANCEL', confirmed: true }),
    ).toMatchObject({ ok: true, value: { status: 'CANCELLED' } });
    const lista = await avulsas();
    expect(lista).toHaveLength(2);
    // Pular uma dose futura conta da data prevista dela (04/11), não de hoje.
    expect(lista.find((d) => d.occurrence === 2)).toMatchObject({
      status: 'PENDING',
      dueDate: '2027-11-04',
    });
  });

  test('CT-REC-105: cancelar a série encerra a repetição', async () => {
    const { app, criar, avulsas } = await setup();
    const primeira = await criar();
    const result = await app.doses.applyEvent(OWNER, primeira.id, {
      type: 'CANCEL',
      confirmed: true,
      scope: 'SERIES',
    });
    expect(result).toMatchObject({ ok: true, value: { status: 'CANCELLED', recurrence: null } });
    expect(await avulsas()).toHaveLength(1);
  });

  test('CT-REC-106: sem confirmação, nada muda e nenhuma dose é criada', async () => {
    const { app, criar, avulsas } = await setup();
    const primeira = await criar();
    expect(
      await app.doses.applyEvent(OWNER, primeira.id, { type: 'CANCEL', confirmed: false }),
    ).toMatchObject({ ok: false, error: { code: 'GUARD_VIOLATION' } });
    expect(await avulsas()).toHaveLength(1);
    expect((await avulsas())[0]?.status).toBe('PENDING');
  });
});
