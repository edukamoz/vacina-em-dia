import type { DoseResponse } from '@vacina/shared';
import { OTHER_OWNER, OWNER, buildApp } from '../test-support';

// Hoje (civil, Brasília): 2026-10-06.
const IDOSA = { name: 'Dona Ana', birthDate: '1950-04-02', isPregnant: false };
const BEBE = { name: 'Bebê', birthDate: '2026-02-01', isPregnant: false };
const QUASE_6 = { name: 'Pedro', birthDate: '2020-12-01', isPregnant: false };

async function setup(pessoa: { name: string; birthDate: string; isPregnant: boolean }) {
  const app = buildApp();
  await app.consent();
  const criada = await app.members.create(OWNER, pessoa);
  if (!criada.ok) throw new Error('falhou');
  const memberId = criada.value.id;
  const lista = async (): Promise<DoseResponse[]> => {
    const r = await app.doses.listForMember(OWNER, memberId);
    if (!r.ok) throw new Error('calendário ausente');
    return r.value.items;
  };
  const dosesDa = async (ruleId: string) =>
    (await lista())
      .filter((d) => d.ruleId === ruleId)
      .sort(
        (a, b) => (a.occurrence ?? 0) - (b.occurrence ?? 0) || a.dueDate.localeCompare(b.dueDate),
      );
  const aplicar = (id: string, date = '2026-10-06') =>
    app.doses.applyEvent(OWNER, id, { type: 'APPLY', date });
  return { app, memberId, lista, dosesDa, aplicar };
}

describe('doses oficiais que se repetem (B69)', () => {
  test('CT-OFIC-20: só as doses cujo texto oficial diz a periodicidade mostram a repetição', async () => {
    const { dosesDa } = await setup(IDOSA);
    expect((await dosesDa('idoso-influenza'))[0]?.recurrence).toMatchObject({
      unit: 'YEAR',
      every: 1,
      anchor: 'APPLICATION',
      endDate: null,
    });
    expect((await dosesDa('idoso-covid'))[0]?.recurrence).toMatchObject({
      unit: 'MONTH',
      every: 6,
    });
    expect((await dosesDa('idoso-dt'))[0]?.recurrence ?? null).toBeNull();
    expect((await dosesDa('idoso-influenza'))[0]?.occurrence ?? null).toBeNull();
  });

  test('CT-OFIC-21: aplicar a influenza do idoso cria a próxima, um ano depois, na mesma linha', async () => {
    const { dosesDa, aplicar } = await setup(IDOSA);
    const [primeira] = await dosesDa('idoso-influenza');
    expect(await aplicar(String(primeira?.id))).toMatchObject({
      ok: true,
      value: { status: 'APPLIED' },
    });
    const [aplicada, proxima] = await dosesDa('idoso-influenza');
    expect(aplicada).toMatchObject({ id: primeira?.id, status: 'APPLIED', occurrence: 1 });
    expect(proxima).toMatchObject({
      status: 'PENDING',
      dueDate: '2027-10-06',
      occurrence: 2,
      ruleId: 'idoso-influenza',
      origin: 'OFFICIAL',
      vaccine: 'influenza trivalente',
      recurrence: { unit: 'YEAR', every: 1 },
    });
  });

  test('CT-OFIC-22: a covid do idoso volta em seis meses', async () => {
    const { dosesDa, aplicar } = await setup(IDOSA);
    const [primeira] = await dosesDa('idoso-covid');
    await aplicar(String(primeira?.id));
    expect((await dosesDa('idoso-covid'))[1]).toMatchObject({
      dueDate: '2027-04-06',
      occurrence: 2,
      status: 'PENDING',
    });
  });

  test('CT-OFIC-23: a cadeia continua: aplicar a segunda cria a terceira', async () => {
    const { dosesDa, aplicar } = await setup(IDOSA);
    await aplicar(String((await dosesDa('idoso-covid'))[0]?.id));
    await aplicar(String((await dosesDa('idoso-covid'))[1]?.id));
    expect((await dosesDa('idoso-covid')).map((d) => [d.occurrence, d.status])).toEqual([
      [1, 'APPLIED'],
      [2, 'APPLIED'],
      [3, 'PENDING'],
    ]);
  });

  test('CT-OFIC-24: aplicar de novo a mesma dose é recusado e não duplica a próxima', async () => {
    const { dosesDa, aplicar } = await setup(IDOSA);
    const [primeira] = await dosesDa('idoso-influenza');
    await aplicar(String(primeira?.id));
    expect(await aplicar(String(primeira?.id))).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TRANSITION' },
    });
    expect(await dosesDa('idoso-influenza')).toHaveLength(2);
  });

  test('CT-OFIC-25: cancelar só esta pula a dose e a próxima nasce; cancelar a série não cria nada', async () => {
    const { app, dosesDa } = await setup(IDOSA);
    const [flu] = await dosesDa('idoso-influenza');
    const [covid] = await dosesDa('idoso-covid');
    await app.doses.applyEvent(OWNER, String(flu?.id), { type: 'CANCEL', confirmed: true });
    expect(await dosesDa('idoso-influenza')).toHaveLength(2);
    await app.doses.applyEvent(OWNER, String(covid?.id), {
      type: 'CANCEL',
      confirmed: true,
      scope: 'SERIES',
    });
    expect(await dosesDa('idoso-covid')).toHaveLength(1);
  });

  test('CT-OFIC-26: dose oficial sem repetição não gera próxima', async () => {
    const { dosesDa, aplicar } = await setup(IDOSA);
    const [dt] = await dosesDa('idoso-dt');
    await aplicar(String(dt?.id));
    expect(await dosesDa('idoso-dt')).toHaveLength(1);
  });

  test('CT-OFIC-27: a criança é vacinada todo ano; a resposta mostra até quando', async () => {
    const { dosesDa, aplicar } = await setup(BEBE);
    const [primeira] = await dosesDa('crianca-influenza-1');
    expect(primeira?.recurrence).toMatchObject({ unit: 'YEAR', endDate: '2032-01-31' });
    await aplicar(String(primeira?.id));
    expect((await dosesDa('crianca-influenza-1'))[1]).toMatchObject({
      dueDate: '2027-10-06',
      occurrence: 2,
    });
  });

  test('CT-OFIC-28: a repetição da criança para antes de ela completar 6 anos', async () => {
    const { dosesDa, aplicar } = await setup(QUASE_6);
    const [primeira] = await dosesDa('crianca-influenza-1');
    expect(primeira?.recurrence).toMatchObject({ endDate: '2026-11-30' });
    await aplicar(String(primeira?.id));
    // A próxima cairia em 06/10/2027, depois do 6º aniversário (01/12/2026): não é criada.
    expect(await dosesDa('crianca-influenza-1')).toHaveLength(1);
  });

  test('CT-OFIC-29: outro dono não aplica nem cria a próxima dose', async () => {
    const { app, dosesDa } = await setup(IDOSA);
    const [flu] = await dosesDa('idoso-influenza');
    expect(
      await app.doses.applyEvent(OTHER_OWNER, String(flu?.id), {
        type: 'APPLY',
        date: '2026-10-06',
      }),
    ).toEqual({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(await dosesDa('idoso-influenza')).toHaveLength(1);
  });

  test('CT-OFIC-30: reler o calendário não gera de novo a dose já criada pela repetição', async () => {
    const { app, memberId, dosesDa, aplicar } = await setup(IDOSA);
    await aplicar(String((await dosesDa('idoso-influenza'))[0]?.id));
    await app.members.update(OWNER, memberId, { ...IDOSA, name: 'Dona Ana Maria' });
    expect(await dosesDa('idoso-influenza')).toHaveLength(2);
  });

  test('CT-OFIC-31: a próxima dose da série (futura) não aparece atrasada', async () => {
    const { dosesDa, aplicar } = await setup(IDOSA);
    await aplicar(String((await dosesDa('idoso-influenza'))[0]?.id));
    expect((await dosesDa('idoso-influenza'))[1]?.status).toBe('PENDING');
  });
});
