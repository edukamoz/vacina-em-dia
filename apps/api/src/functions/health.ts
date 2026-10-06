import { app } from '@azure/functions';
import type { HttpResponseInit } from '@azure/functions';
import { buildHealthResponse } from '../handlers/health';

/**
 * Endpoint HTTP `GET /api/health`. Handler fino: só adapta o HTTP e delega à regra.
 * O relógio real é criado aqui, na borda, e injetado na regra.
 */
export async function health(): Promise<HttpResponseInit> {
  return buildHealthResponse(() => new Date().toISOString());
}

app.http('health', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'health',
  handler: health,
});
