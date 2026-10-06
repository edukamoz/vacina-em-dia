import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { accountHandlers, authenticated, consentHandlers } from './composition';

/** `GET /api/consent`: consulta o consentimento do usuário. */
export async function getConsent(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) => consentHandlers.get(ownerId));
}

/** `PUT /api/consent`: registra o consentimento explícito. */
export async function acceptConsent(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, async (ownerId) => {
    const body: unknown = await request.json().catch(() => undefined);
    return consentHandlers.accept(ownerId, body);
  });
}

/** `DELETE /api/account`: exclui a conta e todos os dados do usuário. */
export async function deleteAccount(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) => accountHandlers.deleteAccount(ownerId));
}

app.http('getConsent', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'consent',
  handler: getConsent,
});

app.http('acceptConsent', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'consent',
  handler: acceptConsent,
});

app.http('deleteAccount', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'account',
  handler: deleteAccount,
});
