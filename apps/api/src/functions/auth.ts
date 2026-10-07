import { app } from '@azure/functions';
import type { HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { authHandlers, authenticated, guarded, originOf } from './composition';

/** `POST /api/auth/register`: cria a conta e abre a sessão. */
export async function register(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return guarded(context, async () => {
    const body: unknown = await request.json().catch(() => undefined);
    return authHandlers.register(originOf(request), body);
  });
}

/** `POST /api/auth/login`: confere e-mail e senha e abre a sessão. */
export async function login(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return guarded(context, async () => {
    const body: unknown = await request.json().catch(() => undefined);
    return authHandlers.login(originOf(request), body);
  });
}

/** `POST /api/auth/refresh`: troca o token de renovação por uma sessão nova. */
export async function refresh(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return guarded(context, async () => {
    const body: unknown = await request.json().catch(() => undefined);
    return authHandlers.refresh(body);
  });
}

/** `POST /api/auth/logout`: encerra a sessão. */
export async function logout(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return guarded(context, async () => {
    const body: unknown = await request.json().catch(() => undefined);
    return authHandlers.logout(body);
  });
}

/** `POST /api/auth/forgot-password`: pede o e-mail de recuperação de senha. */
export async function forgotPassword(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return guarded(context, async () => {
    const body: unknown = await request.json().catch(() => undefined);
    return authHandlers.forgotPassword(originOf(request), body);
  });
}

/** `POST /api/auth/reset-password`: cria a nova senha com o token do e-mail. */
export async function resetPassword(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return guarded(context, async () => {
    const body: unknown = await request.json().catch(() => undefined);
    return authHandlers.resetPassword(body);
  });
}

/** `GET /api/auth/me`: dados da conta da sessão atual. */
export async function me(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return authenticated(request, context, (ownerId) => authHandlers.me(ownerId));
}

app.http('authRegister', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/register',
  handler: register,
});

app.http('authLogin', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/login',
  handler: login,
});

app.http('authRefresh', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/refresh',
  handler: refresh,
});

app.http('authLogout', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/logout',
  handler: logout,
});

app.http('authMe', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'auth/me',
  handler: me,
});

app.http('authForgotPassword', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/forgot-password',
  handler: forgotPassword,
});

app.http('authResetPassword', {
  methods: ['POST'],
  authLevel: 'anonymous',
  route: 'auth/reset-password',
  handler: resetPassword,
});
