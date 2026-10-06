import { createHash } from 'node:crypto';
import type { HttpResult } from '../http';
import { buildOpenApiDocument } from '../openapi/build-spec';

/** Variáveis de ambiente lidas pelos handlers de documentação. */
export type DocsEnv = Readonly<Record<string, string | undefined>>;

// Swagger UI em versão fixa, carregado da CDN com verificação de integridade (ADR-012). Ao mudar a
// versão, recalcule os hashes (sha384 dos dois arquivos) e atualize também `docs/tech-versions.md`.
const SWAGGER_UI_VERSION = '5.33.1';
const CDN = `https://cdn.jsdelivr.net/npm/swagger-ui-dist@${SWAGGER_UI_VERSION}`;
const CSS_SRI = 'sha384-Ov4/wv3j2bmct8cDc5X4ngJZohVPzEmc6uDPH8WeljUxO5vtoykvMEfbu9Vh6RaW';
const JS_SRI = 'sha384-ZPehFMQommnnuaZ4rpxgkgTT2DKFVp4hZC/7pLit+9Lek9T1YGSo23eHFbvNkXkw';

// O caminho é relativo: a página fica em /api/docs e a especificação em /api/openapi.json.
const INIT_SCRIPT =
  "window.ui = SwaggerUIBundle({ url: './openapi.json', dom_id: '#swagger-ui' });";

/** A documentação só responde quando `DOCS_ENABLED` é exatamente `true` (desligada por padrão). */
export function isDocsEnabled(env: DocsEnv): boolean {
  return env['DOCS_ENABLED'] === 'true';
}

const notFound = (): HttpResult => ({
  status: 404,
  jsonBody: { code: 'NOT_FOUND', message: 'Não encontrado.' },
});

/**
 * Resposta de `GET /api/openapi.json`: a especificação OpenAPI.
 *
 * @param env - Variáveis de ambiente (usa `DOCS_ENABLED`).
 */
export function buildOpenApiResponse(env: DocsEnv): HttpResult {
  if (!isDocsEnabled(env)) return notFound();
  return { status: 200, jsonBody: buildOpenApiDocument() };
}

/**
 * Resposta de `GET /api/docs`: página do Swagger UI. A política de segurança (CSP) só autoriza o
 * script inline pelo hash e os arquivos da CDN fixa; nada mais pode carregar.
 *
 * @param env - Variáveis de ambiente (usa `DOCS_ENABLED`).
 */
export function buildDocsPageResponse(env: DocsEnv): HttpResult {
  if (!isDocsEnabled(env)) return notFound();

  const scriptHash = createHash('sha256').update(INIT_SCRIPT).digest('base64');
  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Vacina em Dia: documentação da API</title>
<link rel="stylesheet" href="${CDN}/swagger-ui.css" integrity="${CSS_SRI}" crossorigin="anonymous">
</head>
<body>
<div id="swagger-ui"></div>
<script src="${CDN}/swagger-ui-bundle.js" integrity="${JS_SRI}" crossorigin="anonymous"></script>
<script>${INIT_SCRIPT}</script>
</body>
</html>
`;

  const csp = [
    "default-src 'none'",
    `script-src 'sha256-${scriptHash}' https://cdn.jsdelivr.net`,
    "style-src 'unsafe-inline' https://cdn.jsdelivr.net",
    'img-src data: https://cdn.jsdelivr.net',
    "connect-src 'self'",
    "base-uri 'none'",
    "frame-ancestors 'none'",
  ].join('; ');

  return {
    status: 200,
    body: html,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'content-security-policy': csp,
      'x-content-type-options': 'nosniff',
    },
  };
}
