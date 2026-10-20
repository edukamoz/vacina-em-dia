import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authenticated, profilePhotoHandlers } from './composition';

/** `GET /api/account/photo`: devolve a foto de perfil da conta. */
export async function getProfilePhoto(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) => profilePhotoHandlers.get(ownerId));
}

/** `PUT /api/account/photo`: guarda (ou troca) a foto de perfil. */
export async function putProfilePhoto(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, async (ownerId) => {
    const body: unknown = await request.json().catch(() => undefined);
    return profilePhotoHandlers.put(ownerId, body);
  });
}

/** `DELETE /api/account/photo`: remove a foto de perfil. */
export async function deleteProfilePhoto(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) => profilePhotoHandlers.remove(ownerId));
}

app.http('getProfilePhoto', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'account/photo',
  handler: getProfilePhoto,
});

app.http('putProfilePhoto', {
  methods: ['PUT'],
  authLevel: 'anonymous',
  route: 'account/photo',
  handler: putProfilePhoto,
});

app.http('deleteProfilePhoto', {
  methods: ['DELETE'],
  authLevel: 'anonymous',
  route: 'account/photo',
  handler: deleteProfilePhoto,
});
