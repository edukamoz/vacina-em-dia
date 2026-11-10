import { endpoints } from './endpoints';
import {
  createFakeFetch,
  ACCEPTED,
  MEMBER,
  SOURCE,
  TEST_BASE_URL,
  TEST_SESSION,
  dose,
  memberDoses,
} from '../test-utils';

describe('endpoints da API', () => {
  test('CT-APP-E01: cada função chama o método e o caminho certos, com o id codificado', async () => {
    const fake = createFakeFetch({
      'GET /consent': { status: 200, body: ACCEPTED },
      'PUT /consent': { status: 200, body: ACCEPTED },
      'DELETE /account': { status: 204 },
      'GET /members': { status: 200, body: { items: [MEMBER] } },
      'POST /members': { status: 201, body: MEMBER },
      'PUT /members/a%2Fb': { status: 200, body: MEMBER },
      'DELETE /members/a%2Fb': { status: 204 },
      'GET /members/a%2Fb/doses': { status: 200, body: memberDoses([dose()]) },
      'GET /doses/a%2Fb': { status: 200, body: dose() },
      'POST /doses/a%2Fb/events': { status: 200, body: dose({ status: 'APPLIED' }) },
    });
    const ctx = { baseUrl: TEST_BASE_URL, sessionId: TEST_SESSION, fetchFn: fake.fetchFn };
    const signal = new AbortController().signal;
    const input = {
      name: 'Maria',
      birthDate: '2025-05-20',
      isPregnant: false,
      relationship: 'SON' as const,
    };

    await endpoints.getConsent(ctx, signal);
    await endpoints.acceptConsent(ctx, {
      acceptedTerms: true,
      termVersion: '1',
      guardianDeclaration: false,
    });
    await endpoints.listMembers(ctx);
    await endpoints.createMember(ctx, input);
    await endpoints.updateMember(ctx, 'a/b', input);
    await endpoints.deleteMember(ctx, 'a/b');
    await endpoints.getMemberDoses(ctx, 'a/b', signal);
    await endpoints.getDose(ctx, 'a/b');
    await endpoints.sendDoseEvent(ctx, 'a/b', { type: 'APPLY', date: '2026-10-06' });
    await endpoints.deleteAccount(ctx);

    expect(fake.calls.map((c) => c.key)).toEqual([
      'GET /consent',
      'PUT /consent',
      'GET /members',
      'POST /members',
      'PUT /members/a%2Fb',
      'DELETE /members/a%2Fb',
      'GET /members/a%2Fb/doses',
      'GET /doses/a%2Fb',
      'POST /doses/a%2Fb/events',
      'DELETE /account',
    ]);
    expect(fake.calls.every((c) => c.headers['x-demo-session'] === TEST_SESSION)).toBe(true);
    expect(SOURCE.version).toBe('2026');
  });

  test('CT-APP-E02: o aceite exige o termo marcado antes de sair do aparelho', () => {
    const ctx = { baseUrl: TEST_BASE_URL, sessionId: TEST_SESSION };
    expect(() =>
      endpoints.acceptConsent(ctx, {
        acceptedTerms: false,
        termVersion: '1',
        guardianDeclaration: false,
      } as never),
    ).toThrow();
  });
});

describe('endpoints da família (B15)', () => {
  test('CT-FAMR-232: cada função da família chama o método e o caminho certos', async () => {
    const familia = {
      role: 'OWNER',
      guardians: [
        {
          id: 'v/1',
          role: 'OWNER',
          emailHint: 'm***@e***.com',
          joinedAt: '2026-11-01T12:00:00.000Z',
          isYou: true,
        },
      ],
      memberCount: 0,
      activeInvites: 0,
    };
    const fake = createFakeFetch({
      'GET /family': { status: 200, body: familia },
      'POST /family/invites': {
        status: 201,
        body: { code: 'ABCDE-FGHJK', expiresAt: '2026-11-17T12:00:00.000Z' },
      },
      'DELETE /family/invites': { status: 204 },
      'POST /family/join': { status: 200, body: { household: familia, moved: 0 } },
      'POST /family/leave': { status: 204 },
      'DELETE /family/guardians/v%2F1': { status: 204 },
      'POST /family/transfer': { status: 200, body: familia },
    });
    const ctx = { baseUrl: TEST_BASE_URL, sessionId: TEST_SESSION, fetchFn: fake.fetchFn };

    await endpoints.getHousehold(ctx);
    await endpoints.createHouseholdInvite(ctx);
    await endpoints.revokeHouseholdInvites(ctx);
    await endpoints.joinHousehold(ctx, { code: 'ABCDE-FGHJK', moveMembers: true });
    await endpoints.leaveHousehold(ctx);
    await endpoints.removeGuardian(ctx, 'v/1');
    await endpoints.transferHousehold(ctx, { guardianId: 'v/1' });

    expect(fake.calls.map((c) => c.key)).toEqual([
      'GET /family',
      'POST /family/invites',
      'DELETE /family/invites',
      'POST /family/join',
      'POST /family/leave',
      'DELETE /family/guardians/v%2F1',
      'POST /family/transfer',
    ]);
    expect(fake.calls[3]?.body).toEqual({ code: 'ABCDE-FGHJK', moveMembers: true });
    expect(fake.calls[6]?.body).toEqual({ guardianId: 'v/1' });
  });
});
