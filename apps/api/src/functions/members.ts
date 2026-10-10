import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticated, memberHandlers } from './composition';

/** `GET /api/members`: lista os membros da família do usuário. */
export async function listMembers(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) => memberHandlers.list(ownerId));
}

/** `POST /api/members`: cadastra um membro. */
export async function createMember(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, async (ownerId) => {
    const body: unknown = await request.json().catch(() => undefined);
    return memberHandlers.create(ownerId, body);
  });
}

/** `GET /api/members/{id}`: consulta um membro. */
export async function getMember(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) =>
    memberHandlers.get(ownerId, request.params['id']),
  );
}

/** `PUT /api/members/{id}`: edita um membro. */
export async function updateMember(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, async (ownerId) => {
    const body: unknown = await request.json().catch(() => undefined);
    return memberHandlers.update(ownerId, request.params['id'], body);
  });
}

/** `DELETE /api/members/{id}`: exclui um membro e as doses dele. */
export async function deleteMember(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) =>
    memberHandlers.remove(ownerId, request.params['id']),
  );
}

/** `GET /api/members/{id}/doses`: calendário vacinal do membro. */
export async function listMemberDoses(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) =>
    memberHandlers.listDoses(ownerId, request.params['id']),
  );
}

app.http('listMembers', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'members',
  handler: listMembers,
});

app.http('createMember', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'members',
  handler: createMember,
});

app.http('getMember', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'members/{id}',
  handler: getMember,
});

app.http('updateMember', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'members/{id}',
  handler: updateMember,
});

app.http('deleteMember', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'members/{id}',
  handler: deleteMember,
});

/** `POST /api/members/{id}/doses`: cadastra uma dose avulsa (fora do calendário oficial). */
export async function addCustomDose(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, async (ownerId) => {
    const body: unknown = await request.json().catch(() => undefined);
    return memberHandlers.addCustomDose(ownerId, request.params['id'], body);
  });
}

/** `GET /api/members/{id}/doses/pdf`: a carteira de vacinação do membro em PDF. */
export async function exportMemberDosesPdf(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) =>
    memberHandlers.exportDosesPdf(ownerId, request.params['id']),
  );
}

app.http('exportMemberDosesPdf', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'members/{id}/doses/pdf',
  handler: exportMemberDosesPdf,
});

app.http('listMemberDoses', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'members/{id}/doses',
  handler: listMemberDoses,
});

app.http('addCustomDose', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'members/{id}/doses',
  handler: addCustomDose,
});
