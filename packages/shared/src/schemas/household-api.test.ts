import { apiErrorSchema } from './dose-api';
import {
  guardianResponseSchema,
  householdResponseSchema,
  inviteResponseSchema,
  joinInputSchema,
  transferInputSchema,
} from './household-api';

const responsavel = {
  id: 'v-1',
  role: 'OWNER',
  emailHint: 'm***@g***.com',
  joinedAt: '2026-11-10T12:00:00.000Z',
  isYou: true,
};

describe('esquemas da família com vários responsáveis', () => {
  test('CT-FAMR-20: a resposta da família traz o seu papel, os responsáveis e as contagens', () => {
    const ok = householdResponseSchema.safeParse({
      role: 'OWNER',
      guardians: [responsavel, { ...responsavel, id: 'v-2', role: 'GUARDIAN', isYou: false }],
      memberCount: 3,
      activeInvites: 1,
    });
    expect(ok.success).toBe(true);
  });

  test.each([
    ['CT-FAMR-21', { ...responsavel, role: 'ADMIN' }],
    ['CT-FAMR-22', { ...responsavel, joinedAt: 'ontem' }],
    ['CT-FAMR-23', { ...responsavel, id: undefined }],
  ])('%s: recusa responsável inválido', (_id, valor) => {
    expect(guardianResponseSchema.safeParse(valor).success).toBe(false);
  });

  test('CT-FAMR-24: o convite devolve o código e a validade', () => {
    expect(
      inviteResponseSchema.safeParse({ code: 'ABCDE-FGHJK', expiresAt: '2026-11-17T12:00:00.000Z' })
        .success,
    ).toBe(true);
  });

  test.each([
    ['CT-FAMR-25', { code: 'ABCDE-FGHJK' }, true],
    ['CT-FAMR-26', { code: 'abcdefghjk', moveMembers: true }, true],
    ['CT-FAMR-27', { code: '' }, false],
    ['CT-FAMR-28', { code: 'x'.repeat(40) }, false],
    ['CT-FAMR-29', { code: 'ABCDEFGHJK', moveMembers: 'sim' }, false],
    ['CT-FAMR-30', {}, false],
  ])('%s: entrada de "entrar" %j', (_id, valor, valido) => {
    expect(joinInputSchema.safeParse(valor).success).toBe(valido);
  });

  test.each([
    ['CT-FAMR-31', { guardianId: 'v-2' }, true],
    ['CT-FAMR-32', { guardianId: '' }, false],
    ['CT-FAMR-33', {}, false],
  ])('%s: entrada de passar a propriedade %j', (_id, valor, valido) => {
    expect(transferInputSchema.safeParse(valor).success).toBe(valido);
  });

  test.each([
    'INVALID_INVITE',
    'HOUSEHOLD_HAS_MEMBERS',
    'NOT_ALONE',
    'OWNER_ONLY',
    'OWNER_MUST_TRANSFER',
    'ALREADY_IN_HOUSEHOLD',
  ])('CT-FAMR-34: o erro %s é um código conhecido da API', (code) => {
    expect(apiErrorSchema.safeParse({ code, message: 'x' }).success).toBe(true);
  });
});
