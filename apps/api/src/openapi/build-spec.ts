import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import {
  apiErrorSchema,
  doseEventInputSchema,
  doseIdSchema,
  doseListResponseSchema,
  doseResponseSchema,
} from '@vacina/shared';
import { z } from 'zod';

/** Versão da API (acompanha o `package.json` do `apps/api`). */
const API_VERSION = '0.1.0';

const jsonContent = (schema: z.ZodType) => ({ 'application/json': { schema } });
const errorResponse = (description: string) => ({
  description,
  content: jsonContent(apiErrorSchema),
});

/**
 * Registra as rotas e gera o documento OpenAPI 3.1 a partir dos mesmos esquemas Zod que validam a
 * entrada (ADR-012). Endpoint novo precisa ser registrado aqui; um teste confere que toda função
 * HTTP em `src/functions` aparece na especificação.
 *
 * @returns O documento OpenAPI como objeto (serializável em JSON).
 */
export function buildOpenApiDocument(): object {
  const registry = new OpenAPIRegistry();
  // Os esquemas do `shared` levam `.meta({ id })`, que vira componente nomeado (`#/components/schemas`).
  const Dose = doseResponseSchema;
  const DoseList = doseListResponseSchema;

  const pathParams = z.object({ id: doseIdSchema });
  const internalError = errorResponse('Falha interna. A mensagem não traz detalhes técnicos.');

  registry.registerPath({
    method: 'get',
    path: '/health',
    tags: ['Sistema'],
    summary: 'Verificar se a API está no ar',
    description:
      'Devolve o estado do serviço e a hora do servidor. Não exige login e não traz dados pessoais.',
    responses: {
      200: {
        description: 'A API está funcionando.',
        content: jsonContent(
          z.object({
            status: z.literal('ok'),
            service: z.string().meta({ example: 'vacina-em-dia-api' }),
            time: z.string().meta({ example: '2026-10-06T15:00:00.000Z' }),
          }),
        ),
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/openapi.json',
    tags: ['Sistema'],
    summary: 'Obter a especificação OpenAPI',
    description:
      'Devolve esta especificação em JSON, para importar em Postman, Insomnia ou gerar clientes. Só responde quando a documentação está ligada (`DOCS_ENABLED`).',
    responses: {
      200: {
        description: 'A especificação OpenAPI 3.1.',
        content: jsonContent(z.object({}).loose()),
      },
      404: errorResponse('A documentação está desligada neste ambiente.'),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/doses',
    tags: ['Doses'],
    summary: 'Listar as doses',
    description:
      'Lista as doses de exemplo, junto com a fonte e a versão do calendário. Enquanto não houver dado oficial do PNI, o conjunto é fictício (`isFictitious: true`). O aplicativo não substitui a caderneta oficial.',
    responses: {
      200: { description: 'Lista de doses.', content: jsonContent(DoseList) },
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/doses/{id}',
    tags: ['Doses'],
    summary: 'Consultar uma dose',
    description: 'Devolve uma dose pelo identificador.',
    request: { params: pathParams },
    responses: {
      200: { description: 'A dose.', content: jsonContent(Dose) },
      400: errorResponse('Identificador inválido.'),
      404: errorResponse('Dose não encontrada.'),
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/doses/{id}/events',
    tags: ['Doses'],
    summary: 'Mudar o estado de uma dose',
    description:
      'Aplica um evento do usuário à dose pela máquina de estados do ciclo de vida (RF04): agendar, desmarcar, reagendar, registrar a aplicação ou cancelar. O atraso não é um evento do cliente: só a rotina de prazo o aplica. Em caso de erro, o estado da dose permanece o mesmo.',
    request: {
      params: pathParams,
      body: {
        required: true,
        content: {
          'application/json': {
            schema: doseEventInputSchema,
            examples: {
              agendar: {
                summary: 'Agendar (dose pendente)',
                value: { type: 'SCHEDULE', date: '2026-11-04' },
              },
              desmarcar: { summary: 'Desmarcar o agendamento', value: { type: 'UNSCHEDULE' } },
              reagendar: {
                summary: 'Reagendar (dose atrasada)',
                value: { type: 'RESCHEDULE', date: '2026-11-10' },
              },
              aplicar: {
                summary: 'Registrar a aplicação',
                value: { type: 'APPLY', date: '2026-10-06' },
              },
              cancelar: {
                summary: 'Cancelar (exige confirmação)',
                value: { type: 'CANCEL', confirmed: true },
              },
            },
          },
        },
      },
    },
    responses: {
      200: { description: 'A dose com o novo estado.', content: jsonContent(Dose) },
      400: errorResponse(
        'Identificador ou corpo inválido (a resposta lista só os nomes dos campos).',
      ),
      404: errorResponse('Dose não encontrada.'),
      409: errorResponse('`INVALID_TRANSITION`: a ação não é possível no estado atual da dose.'),
      422: errorResponse(
        '`GUARD_VIOLATION`: regra de data ou de confirmação violada (agendar no passado, aplicar no futuro, cancelar sem confirmar).',
      ),
      500: internalError,
    },
  });

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Vacina em Dia: API',
      version: API_VERSION,
      description:
        'API do Vacina em Dia. Esqueleto com doses de exemplo (FICTITIOUS), sem login e sem dados pessoais. Autenticação, rate limit (429) e acesso por usuário (401 e 403) entram com o SCRUM-13.',
    },
    servers: [{ url: '/api', description: 'Prefixo das Azure Functions' }],
    tags: [
      { name: 'Sistema', description: 'Verificação e documentação.' },
      { name: 'Doses', description: 'Ciclo de vida da dose (RF04).' },
    ],
  });
}
