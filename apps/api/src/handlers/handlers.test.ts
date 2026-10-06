import { apiErrorSchema, doseResponseSchema, memberDosesResponseSchema } from '@vacina/shared';
import { OWNER, OTHER_OWNER, buildApp } from '../test-support';

const BODY = { name: 'Maria', birthDate: '2025-05-20', isPregnant: false };

async function withMember() {
  const app = buildApp();
  await app.consent();
  const created = await app.handlers.members.create(OWNER, BODY);
  const id = (created.jsonBody as { id: string }).id;
  return { app, id };
}

describe('handlers de membros', () => {
  test('CT-API-H01: cria um membro (201), lista e consulta', async () => {
    const { app, id } = await withMember();
    const list = await app.handlers.members.list(OWNER);
    expect(list.status).toBe(200);
    expect((list.jsonBody as { items: unknown[] }).items).toHaveLength(1);
    expect((await app.handlers.members.get(OWNER, id)).status).toBe(200);
    const created = await app.handlers.members.create(OWNER, BODY);
    expect(created.status).toBe(201);
  });

  test.each([
    ['corpo ausente', undefined],
    ['nome vazio', { ...BODY, name: ' ' }],
    ['data inexistente', { ...BODY, birthDate: '2025-02-30' }],
    ['gestante inválido', { ...BODY, isPregnant: 'sim' }],
  ])('CT-API-H02: corpo inválido (%s) devolve 400 sem expor valores', async (_nome, body) => {
    const { app } = await withMember();
    const res = await app.handlers.members.create(OWNER, body);
    expect(res.status).toBe(400);
    expect(apiErrorSchema.safeParse(res.jsonBody).success).toBe(true);
    expect(JSON.stringify(res.jsonBody)).not.toContain('Maria');
  });

  test('CT-API-H03: identificador inválido devolve 400 em todas as rotas de membro', async () => {
    const { app } = await withMember();
    const bad = '../etc';
    expect((await app.handlers.members.get(OWNER, bad)).status).toBe(400);
    expect((await app.handlers.members.update(OWNER, bad, BODY)).status).toBe(400);
    expect((await app.handlers.members.remove(OWNER, bad)).status).toBe(400);
    expect((await app.handlers.members.listDoses(OWNER, bad)).status).toBe(400);
  });

  test('CT-API-H04: editar valida o corpo e devolve o membro atualizado', async () => {
    const { app, id } = await withMember();
    expect((await app.handlers.members.update(OWNER, id, { name: '' })).status).toBe(400);
    const ok = await app.handlers.members.update(OWNER, id, { ...BODY, name: 'Maria Clara' });
    expect(ok.status).toBe(200);
    expect(ok.jsonBody).toMatchObject({ name: 'Maria Clara' });
  });

  test('CT-API-H05: excluir devolve 204 e depois 404', async () => {
    const { app, id } = await withMember();
    expect((await app.handlers.members.remove(OWNER, id)).status).toBe(204);
    expect((await app.handlers.members.remove(OWNER, id)).status).toBe(404);
    expect((await app.handlers.members.get(OWNER, id)).status).toBe(404);
  });

  test('CT-API-H06: sem consentimento, cadastrar devolve 403', async () => {
    const app = buildApp();
    const res = await app.handlers.members.create(OWNER, BODY);
    expect(res.status).toBe(403);
    expect(res.jsonBody).toMatchObject({ code: 'CONSENT_REQUIRED' });
  });

  test('CT-API-H07: calendário do membro cumpre o esquema e outro dono recebe 404', async () => {
    const { app, id } = await withMember();
    const res = await app.handlers.members.listDoses(OWNER, id);
    expect(res.status).toBe(200);
    expect(memberDosesResponseSchema.safeParse(res.jsonBody).success).toBe(true);
    expect((await app.handlers.members.listDoses(OTHER_OWNER, id)).status).toBe(404);
  });
});

describe('handlers de doses', () => {
  async function firstDoseId() {
    const { app, id } = await withMember();
    const res = await app.handlers.members.listDoses(OWNER, id);
    const items = (res.jsonBody as { items: { id: string; ruleId: string }[] }).items;
    return { app, doseId: items.find((d) => d.ruleId === 'crianca-scr-1')?.id ?? '' };
  }

  test('CT-API-H08: consulta uma dose e devolve 404 para inexistente', async () => {
    const { app, doseId } = await firstDoseId();
    const ok = await app.handlers.doses.get(OWNER, doseId);
    expect(ok.status).toBe(200);
    expect(doseResponseSchema.safeParse(ok.jsonBody).success).toBe(true);
    expect((await app.handlers.doses.get(OWNER, 'nao-existe')).status).toBe(404);
    expect((await app.handlers.doses.get(OWNER, 'Inválido!')).status).toBe(400);
  });

  test('CT-API-H09: aplica um evento (200), recusa transição (409) e regra (422)', async () => {
    const { app, doseId } = await firstDoseId();
    const apply = { type: 'APPLY', date: '2026-10-06' };
    expect((await app.handlers.doses.applyEvent(OWNER, doseId, apply)).status).toBe(200);
    expect(
      (await app.handlers.doses.applyEvent(OWNER, doseId, { type: 'CANCEL', confirmed: true }))
        .status,
    ).toBe(409);

    const other = await firstDoseId();
    expect(
      (
        await other.app.handlers.doses.applyEvent(OWNER, other.doseId, {
          type: 'RESCHEDULE',
          date: '2020-01-01',
        })
      ).status,
    ).toBe(422);
  });

  test.each([
    ['evento desconhecido', { type: 'EXPLODE' }],
    ['atraso enviado pelo cliente', { type: 'MARK_OVERDUE' }],
    ['data inexistente', { type: 'APPLY', date: '2026-02-30' }],
    ['corpo ausente', undefined],
  ])('CT-API-H10: %s devolve 400', async (_nome, body) => {
    const { app, doseId } = await firstDoseId();
    const res = await app.handlers.doses.applyEvent(OWNER, doseId, body);
    expect(res.status).toBe(400);
    expect((await app.handlers.doses.applyEvent(OWNER, 'ID Inválido', body)).status).toBe(400);
  });
});

describe('handlers de consentimento e conta', () => {
  test('CT-API-H11: consulta, registra e valida o consentimento', async () => {
    const app = buildApp();
    expect((await app.handlers.consent.get(OWNER)).jsonBody).toMatchObject({ accepted: false });
    expect((await app.handlers.consent.accept(OWNER, { acceptedTerms: false })).status).toBe(400);
    const ok = await app.handlers.consent.accept(OWNER, { acceptedTerms: true, termVersion: '1' });
    expect(ok.status).toBe(200);
    expect(ok.jsonBody).toMatchObject({ accepted: true, guardianDeclaration: false });
  });

  test('CT-API-H12: excluir a conta devolve 204 e apaga os dados', async () => {
    const { app } = await withMember();
    expect((await app.handlers.account.deleteAccount(OWNER)).status).toBe(204);
    expect((await app.handlers.members.list(OWNER)).jsonBody).toEqual({ items: [] });
  });
});
