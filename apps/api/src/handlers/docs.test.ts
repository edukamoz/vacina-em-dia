import { createHash } from 'node:crypto';
import { buildDocsPageResponse, buildOpenApiResponse, isDocsEnabled } from './docs';

const on = { DOCS_ENABLED: 'true' };

describe('documentação da API (Swagger)', () => {
  test.each([
    [{ DOCS_ENABLED: 'true' }, true],
    [{ DOCS_ENABLED: 'false' }, false],
    [{ DOCS_ENABLED: 'TRUE' }, false],
    [{}, false],
  ])('CT-API-W01: isDocsEnabled(%j) é %s (desligado por padrão)', (env, expected) => {
    expect(isDocsEnabled(env)).toBe(expected);
  });

  test('CT-API-W02: com a documentação desligada, as duas rotas devolvem 404', () => {
    expect(buildOpenApiResponse({}).status).toBe(404);
    expect(buildDocsPageResponse({}).status).toBe(404);
  });

  test('CT-API-W03: /openapi.json devolve a especificação', () => {
    const res = buildOpenApiResponse(on);
    expect(res.status).toBe(200);
    expect(res.jsonBody).toMatchObject({ openapi: '3.1.0' });
  });

  test('CT-API-W04: /docs devolve HTML com Swagger UI de versão fixa e integridade (SRI)', () => {
    const res = buildDocsPageResponse(on);
    expect(res.status).toBe(200);
    expect(res.headers?.['content-type']).toMatch(/^text\/html/);
    const html = String(res.body);
    expect(html).toContain('swagger-ui-dist@5.33.1/swagger-ui-bundle.js');
    expect(html).toContain('swagger-ui-dist@5.33.1/swagger-ui.css');
    expect(html.match(/integrity="sha384-[A-Za-z0-9+/=]+"/g)).toHaveLength(2);
    expect(html).toContain('crossorigin="anonymous"');
    expect(html).toContain('./openapi.json');
    expect(html).not.toMatch(/@latest|swagger-ui-dist@5\//);
  });

  test('CT-API-W05: a política de segurança (CSP) autoriza só o script inline conferido por hash', () => {
    const res = buildDocsPageResponse(on);
    const html = String(res.body);
    const inline = /<script>([\s\S]*?)<\/script>/.exec(html)?.[1] ?? '';
    const hash = createHash('sha256').update(inline).digest('base64');
    const csp = res.headers?.['content-security-policy'] ?? '';
    expect(csp).toContain(`'sha256-${hash}'`);
    expect(csp).toContain("default-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).not.toContain("script-src 'unsafe-inline'");
  });
});
