import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import {
  apiErrorSchema,
  consentInputSchema,
  consentResponseSchema,
  doseEventInputSchema,
  doseIdSchema,
  doseResponseSchema,
  memberDosesResponseSchema,
  memberIdSchema,
  memberInputSchema,
  memberListResponseSchema,
  memberResponseSchema,
} from '@vacina/shared';
import { z } from 'zod';

/** Versão da API (acompanha o `package.json` do `apps/api`). */
const API_VERSION = '0.2.0';

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

  const dosePathParams = z.object({ id: doseIdSchema });
  const memberPathParams = z.object({ id: memberIdSchema });
  const internalError = errorResponse('Falha interna. A mensagem não traz detalhes técnicos.');
  const unauthorized = errorResponse(
    '`UNAUTHORIZED`: o cabeçalho `x-demo-session` não foi enviado ou está fora do formato.',
  );
  const secured = [{ demoSession: [] }];
  const validationError = errorResponse(
    'Corpo inválido (a resposta lista só os nomes dos campos).',
  );

  registry.registerComponent('securitySchemes', 'demoSession', {
    type: 'apiKey',
    in: 'header',
    name: 'x-demo-session',
    description:
      'Provisório (sessão de demonstração): identificador aleatório gerado pelo navegador. Não é autenticação; será trocado pelo login do Microsoft Entra External ID (SCRUM-13).',
  });

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
    path: '/consent',
    tags: ['Conta e privacidade'],
    summary: 'Consultar o consentimento',
    description:
      'Informa se o usuário já aceitou o termo de consentimento (RF09), com a versão e o horário. Sem registro, devolve `accepted: false`.',
    security: secured,
    responses: {
      200: {
        description: 'Situação do consentimento.',
        content: jsonContent(consentResponseSchema),
      },
      401: unauthorized,
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'put',
    path: '/consent',
    tags: ['Conta e privacidade'],
    summary: 'Registrar o consentimento',
    description:
      'Registra o aceite explícito do termo (LGPD), com a versão do termo e, se for o caso, a declaração de que a pessoa é responsável legal pelos menores que cadastrar. Sem esse registro, a API não cadastra membros.',
    security: secured,
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: consentInputSchema,
            examples: {
              aceite: {
                summary: 'Aceite com declaração de responsável',
                value: {
                  acceptedTerms: true,
                  termVersion: '2026-10-06',
                  guardianDeclaration: true,
                },
              },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Consentimento registrado.',
        content: jsonContent(consentResponseSchema),
      },
      400: validationError,
      401: unauthorized,
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/account',
    tags: ['Conta e privacidade'],
    summary: 'Excluir a conta e todos os dados',
    description:
      'Remove de forma definitiva todos os dados do usuário: membros, doses e consentimento (RF09). Não há como desfazer.',
    security: secured,
    responses: {
      204: { description: 'Dados excluídos.' },
      401: unauthorized,
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/members',
    tags: ['Família'],
    summary: 'Listar os membros da família',
    description: 'Lista as pessoas cadastradas pelo usuário, na ordem de cadastro (RF02).',
    security: secured,
    responses: {
      200: { description: 'Lista de membros.', content: jsonContent(memberListResponseSchema) },
      401: unauthorized,
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/members',
    tags: ['Família'],
    summary: 'Cadastrar um membro da família',
    description:
      'Cadastra uma pessoa (nome ou apelido e data de nascimento; opcionalmente, gestante) e gera as doses do calendário oficial para a faixa etária dela (RF02 e RF03). Exige o consentimento; para menores de 18 anos, exige a declaração de responsável. Coleta só o mínimo: não pede documentos de identificação nem o cartão de saúde.',
    security: secured,
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: memberInputSchema,
            examples: {
              crianca: {
                summary: 'Criança',
                value: { name: 'Maria', birthDate: '2025-05-20', isPregnant: false },
              },
            },
          },
        },
      },
    },
    responses: {
      201: { description: 'Membro cadastrado.', content: jsonContent(memberResponseSchema) },
      400: validationError,
      401: unauthorized,
      403: errorResponse('`CONSENT_REQUIRED`: o consentimento ainda não foi dado.'),
      422: errorResponse(
        '`INVALID_BIRTH_DATE`, `GUARDIAN_DECLARATION_REQUIRED` ou `LIMIT_REACHED` (máximo de 20 pessoas).',
      ),
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/members/{id}',
    tags: ['Família'],
    summary: 'Consultar um membro',
    description: 'Devolve um membro do usuário pelo identificador.',
    security: secured,
    request: { params: memberPathParams },
    responses: {
      200: { description: 'O membro.', content: jsonContent(memberResponseSchema) },
      400: errorResponse('Identificador inválido.'),
      401: unauthorized,
      404: errorResponse('Membro não encontrado (ou de outro usuário).'),
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'put',
    path: '/members/{id}',
    tags: ['Família'],
    summary: 'Editar um membro',
    description:
      'Altera nome, data de nascimento e grupo gestante. As doses já registradas são mantidas; as que passarem a ser indicadas pela nova situação são geradas.',
    security: secured,
    request: {
      params: memberPathParams,
      body: { required: true, content: jsonContent(memberInputSchema) },
    },
    responses: {
      200: { description: 'Membro atualizado.', content: jsonContent(memberResponseSchema) },
      400: errorResponse('Identificador ou corpo inválido.'),
      401: unauthorized,
      403: errorResponse('`CONSENT_REQUIRED`: o consentimento ainda não foi dado.'),
      404: errorResponse('Membro não encontrado (ou de outro usuário).'),
      422: errorResponse('`INVALID_BIRTH_DATE` ou `GUARDIAN_DECLARATION_REQUIRED`.'),
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/members/{id}',
    tags: ['Família'],
    summary: 'Excluir um membro',
    description: 'Remove o membro e, em cascata, todas as doses dele.',
    security: secured,
    request: { params: memberPathParams },
    responses: {
      204: { description: 'Membro excluído.' },
      400: errorResponse('Identificador inválido.'),
      401: unauthorized,
      404: errorResponse('Membro não encontrado (ou de outro usuário).'),
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/members/{id}/doses',
    tags: ['Calendário e doses'],
    summary: 'Calendário vacinal do membro',
    description:
      'Devolve as doses do membro, ordenadas pela data prevista, com a fonte e a versão do calendário oficial (RF03, RF04 e RF08). As doses vencidas aparecem como atrasadas. O aplicativo não substitui a caderneta oficial.',
    security: secured,
    request: { params: memberPathParams },
    responses: {
      200: {
        description: 'Calendário do membro.',
        content: jsonContent(memberDosesResponseSchema),
      },
      400: errorResponse('Identificador inválido.'),
      401: unauthorized,
      404: errorResponse('Membro não encontrado (ou de outro usuário).'),
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/doses/{id}',
    tags: ['Calendário e doses'],
    summary: 'Consultar uma dose',
    description: 'Devolve uma dose do usuário pelo identificador.',
    security: secured,
    request: { params: dosePathParams },
    responses: {
      200: { description: 'A dose.', content: jsonContent(doseResponseSchema) },
      400: errorResponse('Identificador inválido.'),
      401: unauthorized,
      404: errorResponse('Dose não encontrada (ou de outro usuário).'),
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/doses/{id}/events',
    tags: ['Calendário e doses'],
    summary: 'Mudar o estado de uma dose',
    description:
      'Aplica um evento do usuário à dose pela máquina de estados do ciclo de vida (RF04): agendar, desmarcar, reagendar, registrar a aplicação ou cancelar. O atraso não é um evento do cliente: só a rotina de prazo o aplica. Em caso de erro, o estado da dose permanece o mesmo.',
    security: secured,
    request: {
      params: dosePathParams,
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
      200: { description: 'A dose com o novo estado.', content: jsonContent(doseResponseSchema) },
      400: errorResponse(
        'Identificador ou corpo inválido (a resposta lista só os nomes dos campos).',
      ),
      401: unauthorized,
      404: errorResponse('Dose não encontrada (ou de outro usuário).'),
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
        'API do Vacina em Dia: membros da família, calendário vacinal oficial (PNI 2026), ciclo de vida das doses e consentimento. Os dados ficam em memória (demonstração) e o acesso usa uma sessão de demonstração provisória; login do Entra External ID, banco e limite de taxa (429) entram nos próximos itens.',
    },
    servers: [{ url: '/api', description: 'Prefixo das Azure Functions' }],
    tags: [
      { name: 'Sistema', description: 'Verificação e documentação.' },
      { name: 'Conta e privacidade', description: 'Consentimento e exclusão de dados (RF09).' },
      { name: 'Família', description: 'Membros da família (RF02).' },
      {
        name: 'Calendário e doses',
        description: 'Calendário vacinal e ciclo de vida da dose (RF03 e RF04).',
      },
    ],
  });
}
