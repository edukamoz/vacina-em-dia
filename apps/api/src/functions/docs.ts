import { app } from '@azure/functions';
import type { HttpResponseInit } from '@azure/functions';
import { buildDocsPageResponse, buildOpenApiResponse } from '../handlers/docs';

/** `GET /api/openapi.json`: especificação OpenAPI (só com `DOCS_ENABLED=true`). */
export async function openapi(): Promise<HttpResponseInit> {
  return buildOpenApiResponse(process.env);
}

/** `GET /api/docs`: página do Swagger UI (só com `DOCS_ENABLED=true`). */
export async function docs(): Promise<HttpResponseInit> {
  return buildDocsPageResponse(process.env);
}

app.http('openapi', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'openapi.json',
  handler: openapi,
});

app.http('docs', {
  methods: ['GET'],
  authLevel: 'anonymous',
  route: 'docs',
  handler: docs,
});
