import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticated, unitsHandlers } from './composition';

/** `GET /api/units/nearby`: unidades básicas de saúde perto de uma posição. */
export async function getNearbyUnits(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) =>
    unitsHandlers.nearby(ownerId, Object.fromEntries(request.query.entries())),
  );
}

app.http('getNearbyUnits', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'units/nearby',
  handler: getNearbyUnits,
});
