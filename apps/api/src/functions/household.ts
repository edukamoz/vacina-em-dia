import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticated, householdHandlers } from './composition';

/** `GET /api/family`: a família de quem pergunta (responsáveis e contagens). */
export async function getHousehold(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) => householdHandlers.get(ownerId));
}

/** `POST /api/family/invites`: o dono gera um código de convite. */
export async function createHouseholdInvite(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) => householdHandlers.createInvite(ownerId));
}

/** `DELETE /api/family/invites`: o dono cancela os convites ainda não usados. */
export async function revokeHouseholdInvites(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) => householdHandlers.revokeInvites(ownerId));
}

/** `POST /api/family/join`: entra numa família com um código de convite. */
export async function joinHousehold(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, async (ownerId) => {
    const body: unknown = await request.json().catch(() => undefined);
    return householdHandlers.join(ownerId, body);
  });
}

/** `POST /api/family/leave`: sai da família. */
export async function leaveHousehold(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) => householdHandlers.leave(ownerId));
}

/** `DELETE /api/family/guardians/{id}`: o dono remove um responsável. */
export async function removeHouseholdGuardian(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) =>
    householdHandlers.removeGuardian(ownerId, request.params['id']),
  );
}

/** `POST /api/family/transfer`: o dono passa a propriedade a outro responsável. */
export async function transferHousehold(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, async (ownerId) => {
    const body: unknown = await request.json().catch(() => undefined);
    return householdHandlers.transfer(ownerId, body);
  });
}

app.http('getHousehold', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'family',
  handler: getHousehold,
});

app.http('createHouseholdInvite', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'family/invites',
  handler: createHouseholdInvite,
});

app.http('revokeHouseholdInvites', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'family/invites',
  handler: revokeHouseholdInvites,
});

app.http('joinHousehold', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'family/join',
  handler: joinHousehold,
});

app.http('leaveHousehold', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'family/leave',
  handler: leaveHousehold,
});

app.http('removeHouseholdGuardian', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'family/guardians/{id}',
  handler: removeHouseholdGuardian,
});

app.http('transferHousehold', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'family/transfer',
  handler: transferHousehold,
});
