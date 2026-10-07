import type { DoseSnapshot } from '@vacina/shared';
import { createReminderHandlers } from '../handlers/reminders';
import type { ReminderCandidate, ReminderRepository } from '../repositories/repositories';
import { NOW, OTHER_OWNER, OWNER, buildApp } from '../test-support';
import { EmailSendError, type EmailClient, type EmailMessage } from './email-ports';
import { buildReminderEmail } from './reminder-email';
import { createReminderService } from './reminder-service';

// Hoje (civil, Brasília): 2026-10-06.
const HOJE = '2026-10-06';

const ADULT = { name: 'Carla', birthDate: '1990-05-10', isPregnant: false };

/** Repositório de lembretes falso: candidatos fixos e registro dos envios reservados. */
function fakeReminders(candidates: readonly ReminderCandidate[] = []) {
  const claimed = new Set<string>();
  let enabled = true;
  const repo: ReminderRepository = {
    getEmailEnabled: async () => enabled,
    setEmailEnabled: async (_owner, value) => {
      enabled = value;
    },
    listEmailCandidates: async () => candidates.filter((c) => !claimed.has(c.accountId)),
    claimEmailDay: async (account, day) => {
      const key = `${account}|${day}`;
      if (claimed.has(account) || claimed.has(key)) return false;
      claimed.add(account);
      claimed.add(key);
      return true;
    },
    releaseEmailDay: async (account, day) => {
      claimed.delete(account);
      claimed.delete(`${account}|${day}`);
    },
  };
  return { repo, claimed };
}

function fakeEmail(failFor: readonly string[] = []) {
  const sent: EmailMessage[] = [];
  const client: EmailClient = {
    async send(message) {
      if (failFor.includes(message.to)) throw new EmailSendError();
      sent.push(message);
    },
  };
  return { client, sent };
}

const dose = (patch: Partial<DoseSnapshot>): DoseSnapshot => ({
  status: 'PENDING',
  dueDate: HOJE,
  scheduledDate: null,
  appliedDate: null,
  ...patch,
});

function setup(candidates: readonly ReminderCandidate[] = [], failFor: readonly string[] = []) {
  const app = buildApp();
  const reminders = fakeReminders(candidates);
  const email = fakeEmail(failFor);
  const errors: string[] = [];
  const service = createReminderService({
    members: app.store.members,
    doseService: app.doses,
    reminders: reminders.repo,
    email: email.client,
    clock: () => NOW,
    webBaseUrl: 'https://app.exemplo.com.br/',
    reportError: (kind) => errors.push(kind),
  });
  return { app, service, reminders, email, errors };
}

async function addCustom(
  app: ReturnType<typeof buildApp>,
  memberId: string,
  vaccine: string,
  dueDate: string,
) {
  const result = await app.members.addCustomDose(OWNER, memberId, {
    vaccine,
    doseLabel: '1ª dose',
    dueDate,
  });
  if (!result.ok) throw new Error('dose avulsa não criada');
}

describe('lembretes no app (RF05)', () => {
  test('CT-LEM-20: junta atrasadas, de hoje e dos próximos 7 dias, nessa ordem', async () => {
    const { app, service } = setup();
    await app.consent();
    const created = await app.members.create(OWNER, ADULT);
    if (!created.ok) throw new Error('falhou');
    const id = created.value.id;
    await addCustom(app, id, 'Vacina A', '2026-10-13');
    await addCustom(app, id, 'Vacina B', '2026-10-06');
    await addCustom(app, id, 'Vacina C', '2026-10-14');

    const result = await service.list(OWNER);
    const custom = result.items.filter((i) => i.vaccine.startsWith('Vacina'));
    expect(custom.map((i) => [i.vaccine, i.kind])).toEqual([
      ['Vacina B', 'TODAY'],
      ['Vacina A', 'UPCOMING'],
    ]);
    expect(result.leadDays).toBe(7);
    expect(result.emailEnabled).toBe(true);
  });

  test('CT-LEM-21: dose avulsa vencida aparece como atrasada, antes das demais', async () => {
    const app = buildApp('2026-10-06T15:00:00.000Z');
    await app.consent();
    const created = await app.members.create(OWNER, ADULT);
    if (!created.ok) throw new Error('falhou');
    await addCustom(app, created.value.id, 'Vacina D', '2026-10-06');
    await addCustom(app, created.value.id, 'Vacina E', '2026-10-08');
    app.setNow('2026-10-07T15:00:00.000Z');
    const reminders = fakeReminders();
    const service = createReminderService({
      members: app.store.members,
      doseService: app.doses,
      reminders: reminders.repo,
      email: fakeEmail().client,
      clock: () => '2026-10-07T15:00:00.000Z',
    });
    const items = (await service.list(OWNER)).items.filter((i) => i.vaccine.startsWith('Vacina'));
    expect(items.map((i) => [i.vaccine, i.kind])).toEqual([
      ['Vacina D', 'OVERDUE'],
      ['Vacina E', 'UPCOMING'],
    ]);
  });

  test('CT-LEM-22: dose aplicada ou cancelada não gera lembrete', async () => {
    const { app, service } = setup();
    await app.consent();
    const created = await app.members.create(OWNER, ADULT);
    if (!created.ok) throw new Error('falhou');
    await addCustom(app, created.value.id, 'Vacina F', '2026-10-06');
    const before = (await service.list(OWNER)).items.find((i) => i.vaccine === 'Vacina F');
    expect(before).toBeDefined();
    await app.doses.applyEvent(OWNER, before?.doseId ?? '', { type: 'APPLY', date: '2026-10-06' });
    const after = (await service.list(OWNER)).items.find((i) => i.vaccine === 'Vacina F');
    expect(after).toBeUndefined();
  });

  test('CT-LEM-23: um usuário não vê os lembretes de outro', async () => {
    const { app, service } = setup();
    await app.consent();
    const created = await app.members.create(OWNER, ADULT);
    if (!created.ok) throw new Error('falhou');
    await addCustom(app, created.value.id, 'Vacina G', '2026-10-06');
    expect((await service.list(OTHER_OWNER)).items).toEqual([]);
  });

  test('CT-LEM-24: a preferência de e-mail liga por padrão e pode ser desligada e religada', async () => {
    const { service } = setup();
    expect((await service.list(OWNER)).emailEnabled).toBe(true);
    expect(await service.setEmailEnabled(OWNER, false)).toEqual({ emailEnabled: false });
    expect((await service.list(OWNER)).emailEnabled).toBe(false);
    expect(await service.setEmailEnabled(OWNER, true)).toEqual({ emailEnabled: true });
  });
});

describe('rotina diária de e-mail (RF05)', () => {
  const candidate = (accountId: string, patch: Partial<DoseSnapshot>): ReminderCandidate => ({
    accountId,
    email: `${accountId}@exemplo.com.br`,
    dose: dose(patch),
  });

  test('CT-LEM-30: envia um e-mail por conta, juntando as doses de hoje e de daqui a 7 dias', async () => {
    const { service, email } = setup([
      candidate('conta-a', { dueDate: '2026-10-06' }),
      candidate('conta-a', { dueDate: '2026-10-13' }),
      candidate('conta-a', { dueDate: '2026-10-13' }),
      candidate('conta-b', { dueDate: '2026-10-13' }),
    ]);
    expect(await service.runDailyEmails()).toEqual({ recipients: 2, sent: 2, failed: 0 });
    const toA = email.sent.find((m) => m.to === 'conta-a@exemplo.com.br');
    expect(toA?.text).toContain('1 vacina é para hoje e 2 vacinas são para daqui a 7 dias');
    expect(toA?.text).toContain('https://app.exemplo.com.br');
  });

  test('CT-LEM-31: ignora dose que não é de hoje nem de daqui a 7 dias, atrasada ou aplicada', async () => {
    const { service, email } = setup([
      candidate('conta-a', { dueDate: '2026-10-10' }),
      candidate('conta-a', { status: 'OVERDUE', dueDate: '2026-10-06' }),
      candidate('conta-a', { status: 'APPLIED', dueDate: '2026-10-06' }),
    ]);
    expect(await service.runDailyEmails()).toEqual({ recipients: 0, sent: 0, failed: 0 });
    expect(email.sent).toHaveLength(0);
  });

  test('CT-LEM-32: rodar duas vezes no mesmo dia não repete o e-mail', async () => {
    const { service, email } = setup([candidate('conta-a', { dueDate: '2026-10-06' })]);
    await service.runDailyEmails();
    await service.runDailyEmails();
    expect(email.sent).toHaveLength(1);
  });

  test('CT-LEM-33: falha de uma conta não impede as outras; a reserva volta para tentar depois', async () => {
    const { service, email, reminders, errors } = setup(
      [
        candidate('conta-a', { dueDate: '2026-10-06' }),
        candidate('conta-b', { dueDate: '2026-10-06' }),
      ],
      ['conta-a@exemplo.com.br'],
    );
    expect(await service.runDailyEmails()).toEqual({ recipients: 2, sent: 1, failed: 1 });
    expect(email.sent.map((m) => m.to)).toEqual(['conta-b@exemplo.com.br']);
    expect(reminders.claimed.has('conta-a')).toBe(false);
    expect(errors).toEqual(['EmailSendError']);
  });

  test('CT-LEM-34: sem candidatos, nada é enviado', async () => {
    const { service } = setup();
    expect(await service.runDailyEmails()).toEqual({ recipients: 0, sent: 0, failed: 0 });
  });
});

describe('e-mail de lembrete (privacidade)', () => {
  test('CT-LEM-40: o texto traz só quantidades, sem nome de pessoa nem de vacina', () => {
    const message = buildReminderEmail('x@exemplo.com.br', { today: 1, inAWeek: 0 });
    expect(message.subject).toBe('Lembrete de vacina no Vacina em Dia');
    expect(message.text).toContain('1 vacina é para hoje');
    expect(message.text).toContain('desligue os lembretes por e-mail na aba Conta');
    expect(message.text).toContain('não substitui a caderneta oficial');
    expect(message.html).not.toContain('href=');
  });

  test('CT-LEM-41: com o endereço do app, o e-mail leva o link sem barra final', () => {
    const message = buildReminderEmail(
      'x@exemplo.com.br',
      { today: 0, inAWeek: 2 },
      'https://a.b/',
    );
    expect(message.text).toContain('2 vacinas são para daqui a 7 dias');
    expect(message.html).toContain('href="https://a.b"');
  });
});

describe('handlers dos lembretes', () => {
  test('CT-LEM-50: PUT de preferências valida o corpo e grava', async () => {
    const { service } = setup();
    const handlers = createReminderHandlers(service);
    expect(await handlers.setPreferences(OWNER, { emailEnabled: false })).toEqual({
      status: 200,
      jsonBody: { emailEnabled: false },
    });
    expect((await handlers.setPreferences(OWNER, { emailEnabled: 'não' })).status).toBe(400);
    expect((await handlers.setPreferences(OWNER, undefined)).status).toBe(400);
    expect((await handlers.setPreferences(OWNER, { emailEnabled: true, extra: 1 })).status).toBe(
      400,
    );
  });

  test('CT-LEM-51: GET devolve a lista', async () => {
    const { service } = setup();
    const result = await createReminderHandlers(service).list(OWNER);
    expect(result.status).toBe(200);
    expect(result.jsonBody).toMatchObject({ leadDays: 7, emailEnabled: true, items: [] });
  });
});
