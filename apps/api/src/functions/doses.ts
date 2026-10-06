import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticated, doseHandlers } from './composition';

/** `GET /api/doses/{id}`: consulta uma dose do usuário. */
export async function getDose(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) =>
    doseHandlers.get(ownerId, request.params['id']),
  );
}

/** `POST /api/doses/{id}/events`: aplica um evento à dose. */
export async function applyDoseEvent(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, async (ownerId) => {
    // Corpo que não é JSON vira `undefined` e cai na validação (400), sem expor o erro de leitura.
    const body: unknown = await request.json().catch(() => undefined);
    return doseHandlers.applyEvent(ownerId, request.params['id'], body);
  });
}

app.http('getDose', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'doses/{id}',
  handler: getDose,
});

app.http('applyDoseEvent', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'doses/{id}/events',
  handler: applyDoseEvent,
});
