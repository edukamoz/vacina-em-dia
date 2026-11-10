import { MAX_CUSTOM_DOSES } from '@vacina/shared';
import { INVITE_VALID_DAYS, MAX_ACTIVE_INVITES } from './household-service';
import { OTHER_OWNER, OWNER, buildApp } from '../test-support';

type App = ReturnType<typeof buildApp>;

const CONTAS = [
  [OWNER, 'mariana@exemplo.com.br'],
  [OTHER_OWNER, 'jose@exemplo.com.br'],
  ['sessao-de-teste-0003', 'carla@exemplo.com.br'],
  ['sessao-de-teste-0004', 'paulo@exemplo.com.br'],
] as const;
const [DONA, JOSE, CARLA, PAULO] = CONTAS.map(([id]) => id) as [string, string, string, string];

/** App com quatro contas cadastradas e com consentimento. */
async function setup() {
  const app = buildApp();
  for (const [id, email] of CONTAS) {
    await app.auth.createAccount({
      id,
      email,
      passwordHash: 'h',
      createdAt: '2026-11-01T12:00:00.000Z',
    });
    await app.consent(id);
  }
  return app;
}

const ADULTA = { name: 'Ana', birthDate: '1990-05-20', isPregnant: false };

async function convite(app: App, dono: string): Promise<string> {
  const r = await app.household.createInvite(dono);
  if (!r.ok) throw new Error(`convite não gerado: ${r.error.code}`);
  return r.value.code;
}

describe('serviço da família com vários responsáveis (B15)', () => {
  test('CT-FAMR-110: sem consentimento nenhuma operação da família funciona', async () => {
    const app = buildApp();
    const esperado = { ok: false, error: { code: 'CONSENT_REQUIRED' } };
    expect(await app.household.get(DONA)).toEqual(esperado);
    expect(await app.household.createInvite(DONA)).toEqual(esperado);
    expect(await app.household.revokeInvites(DONA)).toEqual(esperado);
    expect(await app.household.join(DONA, { code: 'ABCDE-FGHJK' })).toEqual(esperado);
    expect(await app.household.leave(DONA)).toEqual(esperado);
    expect(await app.household.removeGuardian(DONA, 'x')).toEqual(esperado);
    expect(await app.household.transfer(DONA, { guardianId: 'x' })).toEqual(esperado);
  });

  test('CT-FAMR-111: a conta começa dona da própria família, com o e-mail oculto', async () => {
    const app = await setup();
    const r = await app.household.get(DONA);
    expect(r).toMatchObject({
      ok: true,
      value: { role: 'OWNER', memberCount: 0, activeInvites: 0 },
    });
    if (!r.ok) return;
    expect(r.value.guardians).toHaveLength(1);
    expect(r.value.guardians[0]).toMatchObject({
      role: 'OWNER',
      isYou: true,
      emailHint: 'm***@e***.com.br',
    });
  });

  test('CT-FAMR-112: a resposta nunca traz o identificador da conta nem o e-mail inteiro', async () => {
    const app = await setup();
    const hash = await convite(app, DONA);
    await app.household.join(JOSE, { code: hash });
    const r = await app.household.get(DONA);
    const texto = JSON.stringify(r);
    for (const [id, email] of CONTAS) {
      expect(texto).not.toContain(id);
      expect(texto).not.toContain(email);
    }
  });

  test('CT-FAMR-113: o convite devolve o código formatado e vale 7 dias', async () => {
    const app = await setup();
    const r = await app.household.createInvite(DONA);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.code).toMatch(/^[A-Z2-9]{5}-[A-Z2-9]{5}$/);
    const dias = (Date.parse(r.value.expiresAt) - Date.parse('2026-10-06T15:00:00.000Z')) / 864e5;
    expect(dias).toBe(INVITE_VALID_DAYS);
    expect(await app.household.get(DONA)).toMatchObject({ value: { activeInvites: 1 } });
  });

  test('CT-FAMR-114: só o dono convida, cancela convites, remove e passa a propriedade', async () => {
    const app = await setup();
    await app.household.join(JOSE, { code: await convite(app, DONA) });
    const dele = await app.household.get(JOSE);
    expect(dele).toMatchObject({ value: { role: 'GUARDIAN', activeInvites: 0 } });
    const nao = { ok: false, error: { code: 'OWNER_ONLY' } };
    expect(await app.household.createInvite(JOSE)).toEqual(nao);
    expect(await app.household.revokeInvites(JOSE)).toEqual(nao);
    expect(await app.household.removeGuardian(JOSE, 'qualquer')).toEqual(nao);
    expect(await app.household.transfer(JOSE, { guardianId: 'qualquer' })).toEqual(nao);
  });

  test('CT-FAMR-115: o código funciona em minúsculas e sem hífen, e só uma vez', async () => {
    const app = await setup();
    const codigo = await convite(app, DONA);
    const digitado = codigo.replace('-', '').toLowerCase();
    expect(await app.household.join(JOSE, { code: digitado })).toMatchObject({
      ok: true,
      value: { moved: 0, household: { role: 'GUARDIAN' } },
    });
    expect(await app.household.join(CARLA, { code: codigo })).toEqual({
      ok: false,
      error: { code: 'INVALID_INVITE' },
    });
  });

  test.each([
    ['CT-FAMR-116', 'curto'],
    ['CT-FAMR-117', 'ABCDEFGHJK'],
    ['CT-FAMR-118', ''],
    ['CT-FAMR-119', 'AAAAA-0OIL1'],
  ])('%s: código %j é inválido, sem dizer por quê', async (_id, code) => {
    const app = await setup();
    expect(await app.household.join(JOSE, { code })).toEqual({
      ok: false,
      error: { code: 'INVALID_INVITE' },
    });
  });

  test('CT-FAMR-120: convite vencido não vale', async () => {
    const app = await setup();
    const codigo = await convite(app, DONA);
    app.setNow('2026-10-14T15:00:00.000Z'); // 8 dias depois
    expect(await app.household.join(JOSE, { code: codigo })).toEqual({
      ok: false,
      error: { code: 'INVALID_INVITE' },
    });
  });

  test('CT-FAMR-121: no máximo 5 convites abertos; cancelar libera', async () => {
    const app = await setup();
    for (let i = 0; i < MAX_ACTIVE_INVITES; i += 1) await convite(app, DONA);
    expect(await app.household.createInvite(DONA)).toEqual({
      ok: false,
      error: { code: 'LIMIT_REACHED', scope: 'invites' },
    });
    expect(await app.household.revokeInvites(DONA)).toEqual({ ok: true, value: null });
    expect((await app.household.createInvite(DONA)).ok).toBe(true);
  });

  test('CT-FAMR-122: a 11ª tentativa de código na hora é barrada', async () => {
    const app = await setup();
    for (let i = 0; i < 10; i += 1) {
      expect((await app.household.join(JOSE, { code: 'AAAAA-AAAAA' })).ok).toBe(false);
    }
    expect(await app.household.join(JOSE, { code: 'AAAAA-AAAAA' })).toMatchObject({
      ok: false,
      error: { code: 'RATE_LIMITED', scope: 'household' },
    });
  });

  test('CT-FAMR-123: quem tem pessoas só entra confirmando; as pessoas passam para a família', async () => {
    const app = await setup();
    await app.members.create(JOSE, ADULTA);
    await app.members.create(JOSE, { ...ADULTA, name: 'Bia' });
    const codigo = await convite(app, DONA);
    expect(await app.household.join(JOSE, { code: codigo })).toEqual({
      ok: false,
      error: { code: 'HOUSEHOLD_HAS_MEMBERS', memberCount: 2 },
    });
    expect(await app.members.list(DONA)).toEqual([]);
    expect(await app.household.join(JOSE, { code: codigo, moveMembers: true })).toMatchObject({
      ok: true,
      value: { moved: 2, household: { memberCount: 2 } },
    });
    expect((await app.members.list(DONA)).map((m) => m.name).sort()).toEqual(['Ana', 'Bia']);
  });

  test('CT-FAMR-124: quem divide a família com outros não entra em outra', async () => {
    const app = await setup();
    await app.household.join(JOSE, { code: await convite(app, DONA) });
    const outro = await convite(app, CARLA);
    expect(await app.household.join(DONA, { code: outro })).toEqual({
      ok: false,
      error: { code: 'NOT_ALONE' },
    });
  });

  test('CT-FAMR-125: entrar na própria família é recusado', async () => {
    const app = await setup();
    const codigo = await convite(app, DONA);
    expect(await app.household.join(DONA, { code: codigo })).toEqual({
      ok: false,
      error: { code: 'ALREADY_IN_HOUSEHOLD' },
    });
  });

  test('CT-FAMR-126: sair devolve uma família vazia; o dono precisa passar a propriedade antes', async () => {
    const app = await setup();
    await app.household.join(JOSE, { code: await convite(app, DONA) });
    await app.members.create(DONA, ADULTA);
    expect(await app.household.leave(DONA)).toEqual({
      ok: false,
      error: { code: 'OWNER_MUST_TRANSFER' },
    });
    expect(await app.household.leave(JOSE)).toEqual({ ok: true, value: null });
    expect(await app.members.list(JOSE)).toEqual([]);
    expect(await app.household.get(JOSE)).toMatchObject({
      value: { role: 'OWNER', memberCount: 0 },
    });
    // Agora ele está só: não há de quem sair.
    expect(await app.household.leave(JOSE)).toEqual({ ok: false, error: { code: 'NOT_FOUND' } });
  });

  test('CT-FAMR-127: o dono remove um responsável e a família dele fica vazia', async () => {
    const app = await setup();
    await app.household.join(JOSE, { code: await convite(app, DONA) });
    await app.members.create(DONA, ADULTA);
    const familia = await app.household.get(DONA);
    if (!familia.ok) throw new Error('falhou');
    const jose = familia.value.guardians.find((g) => !g.isYou);
    expect(await app.household.removeGuardian(DONA, String(jose?.id))).toEqual({
      ok: true,
      value: null,
    });
    expect(await app.members.list(JOSE)).toEqual([]);
    expect((await app.members.list(DONA)).map((m) => m.name)).toEqual(['Ana']);
    expect(await app.household.removeGuardian(DONA, String(jose?.id))).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });

  test('CT-FAMR-128: passar a propriedade troca os papéis e libera o antigo dono para sair', async () => {
    const app = await setup();
    await app.household.join(JOSE, { code: await convite(app, DONA) });
    const antes = await app.household.get(DONA);
    if (!antes.ok) throw new Error('falhou');
    const jose = antes.value.guardians.find((g) => !g.isYou);
    const depois = await app.household.transfer(DONA, { guardianId: String(jose?.id) });
    expect(depois).toMatchObject({ ok: true, value: { role: 'GUARDIAN' } });
    expect(await app.household.get(JOSE)).toMatchObject({ value: { role: 'OWNER' } });
    expect(await app.household.leave(DONA)).toEqual({ ok: true, value: null });
  });

  test('CT-FAMR-129: ninguém passa a propriedade nem remove a si mesmo', async () => {
    const app = await setup();
    const familia = await app.household.get(DONA);
    if (!familia.ok) throw new Error('falhou');
    const meu = String(familia.value.guardians[0]?.id);
    expect(await app.household.transfer(DONA, { guardianId: meu })).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(await app.household.removeGuardian(DONA, meu)).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
  });

  test('CT-FAMR-130: o responsável vê, edita e aplica doses das pessoas que o dono cadastrou', async () => {
    const app = await setup();
    await app.household.join(JOSE, { code: await convite(app, DONA) });
    const criada = await app.members.create(DONA, ADULTA);
    if (!criada.ok) throw new Error('falhou');
    const doses = await app.doses.listForMember(JOSE, criada.value.id);
    expect(doses.ok).toBe(true);
    if (!doses.ok) return;
    const alvo = doses.value.items.find((d) => d.status === 'OVERDUE' || d.status === 'PENDING');
    const r = await app.doses.applyEvent(JOSE, String(alvo?.id), {
      type: 'APPLY',
      date: '2026-10-06',
    });
    expect(r).toMatchObject({ ok: true, value: { status: 'APPLIED' } });
    const vista = await app.doses.get(DONA, String(alvo?.id));
    expect(vista).toMatchObject({ ok: true, value: { status: 'APPLIED' } });
  });

  test('CT-FAMR-131: uma família não alcança as pessoas e doses de outra', async () => {
    const app = await setup();
    const criada = await app.members.create(DONA, ADULTA);
    if (!criada.ok) throw new Error('falhou');
    const id = criada.value.id;
    expect(await app.members.get(CARLA, id)).toEqual({ ok: false, error: { code: 'NOT_FOUND' } });
    expect(await app.doses.listForMember(CARLA, id)).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(await app.members.remove(CARLA, id)).toEqual({
      ok: false,
      error: { code: 'NOT_FOUND' },
    });
    expect(await app.members.get(DONA, id)).toMatchObject({ ok: true });
  });

  test('CT-FAMR-132: o limite de pessoas e de doses avulsas vale por família, não por conta', async () => {
    const app = await setup();
    await app.household.join(JOSE, { code: await convite(app, DONA) });
    const criada = await app.members.create(DONA, ADULTA);
    if (!criada.ok) throw new Error('falhou');
    for (let i = 0; i < MAX_CUSTOM_DOSES; i += 1) {
      const quem = i % 2 === 0 ? DONA : JOSE;
      await app.members.addCustomDose(quem, criada.value.id, {
        vaccine: `Vacina ${i}`,
        doseLabel: '1ª',
        dueDate: '2026-11-04',
      });
    }
    expect(
      await app.members.addCustomDose(JOSE, criada.value.id, {
        vaccine: 'Demais',
        doseLabel: '1ª',
        dueDate: '2026-11-04',
      }),
    ).toEqual({ ok: false, error: { code: 'LIMIT_REACHED', scope: 'customDoses' } });
  });

  test('CT-FAMR-133: excluir a conta do responsável não apaga as pessoas da família', async () => {
    const app = await setup();
    await app.household.join(JOSE, { code: await convite(app, DONA) });
    await app.members.create(JOSE, ADULTA);
    await app.accounts.deleteAccount(JOSE);
    expect((await app.members.list(DONA)).map((m) => m.name)).toEqual(['Ana']);
    expect(await app.household.get(DONA)).toMatchObject({ value: { memberCount: 1 } });
  });

  test('CT-FAMR-134: excluir a conta que está só apaga tudo dela', async () => {
    const app = await setup();
    await app.members.create(PAULO, ADULTA);
    await app.accounts.deleteAccount(PAULO);
    expect(await app.members.list(PAULO)).toEqual([]);
  });
});

describe('respostas HTTP da família (B15)', () => {
  test('CT-FAMR-140: códigos de status de cada rota e do erro de confirmação', async () => {
    const app = await setup();
    const h = app.handlers.household;
    expect((await h.get(DONA)).status).toBe(200);
    const novo = await h.createInvite(DONA);
    expect(novo.status).toBe(201);
    const codigo = (novo.jsonBody as { code: string }).code;
    expect((await h.join(JOSE, { code: codigo })).status).toBe(200);
    expect((await h.createInvite(JOSE)).status).toBe(403);
    expect((await h.join(JOSE, { code: 'ruim' })).status).toBe(400);
    expect((await h.join(JOSE, {})).status).toBe(400);
    expect((await h.removeGuardian(DONA, 'não é um id!')).status).toBe(400);
    expect((await h.transfer(DONA, {})).status).toBe(400);
    expect((await h.revokeInvites(DONA)).status).toBe(204);
    expect((await h.leave(JOSE)).status).toBe(204);
    expect((await h.leave(JOSE)).status).toBe(404);
  });

  test('CT-FAMR-141: quem tem pessoas recebe 409 com a quantidade', async () => {
    const app = await setup();
    await app.members.create(JOSE, ADULTA);
    const codigo = await convite(app, DONA);
    const r = await app.handlers.household.join(JOSE, { code: codigo });
    expect(r.status).toBe(409);
    expect(r.jsonBody).toMatchObject({ code: 'HOUSEHOLD_HAS_MEMBERS', memberCount: 1 });
  });

  test('CT-FAMR-142: tentativas demais voltam 429 com Retry-After', async () => {
    const app = await setup();
    for (let i = 0; i < 10; i += 1)
      await app.handlers.household.join(JOSE, { code: 'AAAAA-AAAAA' });
    const r = await app.handlers.household.join(JOSE, { code: 'AAAAA-AAAAA' });
    expect(r.status).toBe(429);
    expect(r.headers?.['retry-after']).toBeDefined();
  });
});
