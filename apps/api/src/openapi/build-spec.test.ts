import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildOpenApiDocument } from './build-spec';

type Operation = {
  summary?: string;
  description?: string;
  tags?: string[];
  responses: Record<string, unknown>;
  security?: unknown;
};
type Doc = {
  openapi: string;
  info: { title: string; version: string };
  servers: { url: string }[];
  paths: Record<string, Record<string, Operation>>;
};
const doc = buildOpenApiDocument() as unknown as Doc;

/** Lê `src/functions/*.ts` e devolve as rotas HTTP registradas com `app.http`. */
function registeredRoutes(): { name: string; method: string; path: string }[] {
  const dir = join(__dirname, '..', 'functions');
  const found: { name: string; method: string; path: string }[] = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.ts'))) {
    const source = readFileSync(join(dir, file), 'utf8');
    const pattern = /app\.http\(\s*'([^']+)'\s*,\s*\{([\s\S]*?)\n\}\)/g;
    for (const [, name, body] of source.matchAll(pattern)) {
      const methods = /methods:\s*\[([^\]]*)\]/.exec(body ?? '')?.[1] ?? '';
      const route = /route:\s*'([^']+)'/.exec(body ?? '')?.[1] ?? '';
      for (const m of methods.matchAll(/'([A-Z]+)'/g)) {
        found.push({ name: name ?? '', method: (m[1] ?? '').toLowerCase(), path: `/${route}` });
      }
    }
  }
  return found;
}

// A página do Swagger UI (HTML) não é um endpoint de dados; a especificação em JSON é documentada.
const NOT_IN_SPEC = new Set(['docs']);

describe('especificação OpenAPI', () => {
  test('CT-API-O01: é OpenAPI 3.1 com título, versão e servidor em /api', () => {
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.info.title).toBe('Vacina em Dia: API');
    expect(doc.info.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(doc.servers).toEqual([expect.objectContaining({ url: '/api' })]);
  });

  test('CT-API-O02: toda função HTTP registrada está documentada (e vice-versa)', () => {
    const routes = registeredRoutes().filter((r) => !NOT_IN_SPEC.has(r.name));
    expect(routes.length).toBeGreaterThanOrEqual(12);
    for (const r of routes) {
      expect(doc.paths[r.path]?.[r.method]).toBeDefined();
    }
    const documented = Object.entries(doc.paths).flatMap(([p, ops]) =>
      Object.keys(ops).map((m) => `${m} ${p}`),
    );
    const registered = routes.map((r) => `${r.method} ${r.path}`);
    expect(documented.sort()).toEqual(registered.sort());
  });

  test('CT-API-O03: toda operação tem resumo, descrição e etiqueta em português', () => {
    for (const [path, ops] of Object.entries(doc.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        const where = `${method} ${path}`;
        expect([where, Boolean(op.summary)]).toEqual([where, true]);
        expect([where, Boolean(op.description)]).toEqual([where, true]);
        expect([where, (op.tags ?? []).length > 0]).toEqual([where, true]);
      }
    }
  });

  test.each([
    ['get', '/consent', ['200', '401', '500']],
    ['put', '/consent', ['200', '400', '401', '500']],
    ['delete', '/account', ['204', '401', '500']],
    ['get', '/members', ['200', '401', '500']],
    ['post', '/members', ['201', '400', '401', '403', '422', '500']],
    ['get', '/members/{id}', ['200', '400', '401', '404', '500']],
    ['put', '/members/{id}', ['200', '400', '401', '403', '404', '422', '500']],
    ['delete', '/members/{id}', ['204', '400', '401', '404', '500']],
    ['get', '/members/{id}/doses', ['200', '400', '401', '404', '500']],
    ['get', '/doses/{id}', ['200', '400', '401', '404', '500']],
    ['post', '/doses/{id}/events', ['200', '400', '401', '404', '409', '422', '500']],
  ])('CT-API-O04: %s %s documenta os códigos %j', (method, path, codes) => {
    const responses = Object.keys(doc.paths[path]?.[method]?.responses ?? {});
    expect(responses).toEqual(expect.arrayContaining(codes));
  });

  test('CT-API-O08: toda rota de dados exige a sessão e declara o esquema de segurança', () => {
    const open = new Set(['/health', '/openapi.json']);
    for (const [path, ops] of Object.entries(doc.paths)) {
      if (open.has(path)) continue;
      for (const [method, op] of Object.entries(ops)) {
        expect([`${method} ${path}`, JSON.stringify(op)]).toEqual([
          `${method} ${path}`,
          expect.stringContaining('demoSession'),
        ]);
      }
    }
  });

  test('CT-API-O05: o corpo do evento tem exemplos e usa os esquemas compartilhados', () => {
    const json = JSON.stringify(doc.paths['/doses/{id}/events']?.post);
    expect(json).toContain('"examples"');
    for (const type of ['SCHEDULE', 'UNSCHEDULE', 'RESCHEDULE', 'APPLY', 'CANCEL']) {
      expect(json).toContain(`"${type}"`);
    }
    // O cliente nunca envia o atraso: só a rotina de prazo (CLAUDE.md §8).
    expect(json).not.toContain('MARK_OVERDUE');
  });

  test('CT-API-O06: as respostas de dose referenciam componentes nomeados', () => {
    const json = JSON.stringify(doc);
    for (const name of ['Dose', 'Member', 'MemberDoses', 'Consent', 'ApiError']) {
      expect(json).toContain(`#/components/schemas/${name}`);
    }
  });

  test('CT-API-O07: não expõe segredos nem dados pessoais', () => {
    expect(JSON.stringify(doc)).not.toMatch(/password|secret|connection ?string|@gmail|CPF/i);
  });
});
