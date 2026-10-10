import { app } from '@azure/functions';
import type { HttpResponseInit } from '@azure/functions';
import { withSecurityHeaders } from '../http';
import { warmupHandler } from './composition';

/** `GET /api/warmup`: acorda o banco pausado enquanto a pessoa ainda está na tela de entrada. */
export async function warmup(): Promise<HttpResponseInit> {
  return withSecurityHeaders(await warmupHandler());
}

app.http('warmup', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'warmup',
  handler: warmup,
});
