import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { doseHandlers, guarded } from './composition';

/** `GET /api/doses`: lista as doses de exemplo. */
export async function listDoses(
  _request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return guarded(context, () => doseHandlers.list());
}

/** `GET /api/doses/{id}`: consulta uma dose. */
export async function getDose(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return guarded(context, () => doseHandlers.get(request.params['id']));
}

/** `POST /api/doses/{id}/events`: aplica um evento à dose. */
export async function applyDoseEvent(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return guarded(context, async () => {
    // Corpo que não é JSON vira `undefined` e cai na validação (400), sem expor o erro de leitura.
    const body: unknown = await request.json().catch(() => undefined);
    return doseHandlers.applyEvent(request.params['id'], body);
  });
}

app.http('listDoses', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'doses',
  handler: listDoses,
});

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
