import { OpenAPIRegistry, OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import {
  accountInfoSchema,
  apiErrorSchema,
  assistantMessageInputSchema,
  assistantResponseSchema,
  authSessionSchema,
  consentInputSchema,
  reminderListResponseSchema,
  reminderPreferencesInputSchema,
  reminderPreferencesResponseSchema,
  consentResponseSchema,
  doseEventInputSchema,
  doseIdSchema,
  doseResponseSchema,
  forgotPasswordInputSchema,
  loginInputSchema,
  customDoseInputSchema,
  memberDosesResponseSchema,
  memberIdSchema,
  memberInputSchema,
  memberListResponseSchema,
  nearbyUnitsQuerySchema,
  nearbyUnitsResponseSchema,
  memberResponseSchema,
  refreshInputSchema,
  registerInputSchema,
  resetPasswordInputSchema,
} from '@vacina/shared';
import { z } from 'zod';

/** Versão da API (acompanha o `package.json` do `apps/api`). */
const API_VERSION = '0.4.0';

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
    '`UNAUTHORIZED`: falta o cabeçalho `Authorization: Bearer` ou o token é inválido ou venceu.',
  );
  const secured = [{ bearerAuth: [] }, { demoSession: [] }];
  const validationError = errorResponse(
    'Corpo inválido (a resposta lista só os nomes dos campos).',
  );

  registry.registerComponent('securitySchemes', 'bearerAuth', {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description:
      'Token de acesso (15 minutos) obtido em `/auth/login` ou `/auth/register`. Renove com `/auth/refresh` (ADR-014).',
  });

  registry.registerComponent('securitySchemes', 'demoSession', {
    type: 'apiKey',
    in: 'header',
    name: 'x-demo-session',
    description:
      'Provisório (sessão de demonstração): identificador aleatório gerado pelo navegador. Não é autenticação; só vale enquanto `DEMO_SESSION_ENABLED` não for `false` e será removido quando o app usar o login (ADR-014).',
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
    path: '/warmup',
    tags: ['Sistema'],
    summary: 'Acordar o banco de dados',
    description:
      'O app chama ao abrir a tela de entrada para acordar o banco gratuito, que pausa quando fica parado, antes de a pessoa fazer o login. Não exige login, não traz dados pessoais e, para não gastar a franquia do banco, consulta no máximo uma vez por minuto em cada instância.',
    responses: {
      200: {
        description:
          'Aquecimento feito. `database` diz se o banco já respondeu ou ainda está acordando.',
        content: jsonContent(
          z.object({
            status: z.literal('ok'),
            database: z.enum(['ready', 'waking']).meta({ example: 'ready' }),
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

  const tooMany = errorResponse(
    '`RATE_LIMITED`: muitas tentativas. O cabeçalho `Retry-After` diz em quantos segundos tentar de novo.',
  );
  const unavailable = errorResponse(
    '`AUTH_UNAVAILABLE`: o login não está configurado neste ambiente.',
  );
  const sessionOk = (description: string) => ({
    description,
    content: jsonContent(authSessionSchema),
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/register',
    tags: ['Login'],
    summary: 'Criar conta',
    description:
      'Cria a conta com e-mail e senha (RF01) e já abre a sessão. A senha nunca é guardada, só o hash (scrypt). Recusa senhas comuns. Limite de 10 cadastros por hora por origem.',
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: registerInputSchema,
            examples: {
              cadastro: {
                summary: 'Cadastro',
                value: { email: 'mariana@exemplo.com.br', password: 'uma frase longa é melhor' },
              },
            },
          },
        },
      },
    },
    responses: {
      201: sessionOk('Conta criada e sessão aberta.'),
      400: validationError,
      409: errorResponse('`EMAIL_ALREADY_REGISTERED`: já existe uma conta com este e-mail.'),
      422: errorResponse('`WEAK_PASSWORD`: senha comum demais ou igual ao e-mail.'),
      429: tooMany,
      500: internalError,
      503: unavailable,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/login',
    tags: ['Login'],
    summary: 'Entrar',
    description:
      'Confere e-mail e senha e abre a sessão. Conta inexistente e senha errada têm a mesma resposta. Depois de 5 falhas em 15 minutos, o e-mail fica bloqueado até o fim da janela.',
    request: {
      body: { required: true, content: jsonContent(loginInputSchema) },
    },
    responses: {
      200: sessionOk('Sessão aberta.'),
      400: validationError,
      401: errorResponse('`INVALID_CREDENTIALS`: e-mail ou senha incorretos.'),
      429: tooMany,
      500: internalError,
      503: unavailable,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/refresh',
    tags: ['Login'],
    summary: 'Renovar a sessão',
    description:
      'Troca o token de renovação por uma sessão nova. Cada token só vale uma vez; apresentar um token já usado encerra todas as sessões da conta.',
    request: {
      body: { required: true, content: jsonContent(refreshInputSchema) },
    },
    responses: {
      200: sessionOk('Sessão renovada.'),
      400: validationError,
      401: errorResponse('`INVALID_TOKEN`: token inválido, vencido ou já usado.'),
      500: internalError,
      503: unavailable,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/logout',
    tags: ['Login'],
    summary: 'Sair',
    description: 'Revoga o token de renovação. Responde 204 mesmo que o token já não valha.',
    request: {
      body: { required: true, content: jsonContent(refreshInputSchema) },
    },
    responses: {
      204: { description: 'Sessão encerrada.' },
      400: validationError,
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/forgot-password',
    tags: ['Login'],
    summary: 'Pedir nova senha por e-mail',
    description:
      'Se existir uma conta com o e-mail, envia um link para criar nova senha (vale por 1 hora e só pode ser usado uma vez). A resposta é sempre a mesma, exista a conta ou não, para não revelar quais e-mails têm conta. Limite de 3 pedidos por hora por e-mail e 10 por origem.',
    request: {
      body: { required: true, content: jsonContent(forgotPasswordInputSchema) },
    },
    responses: {
      202: { description: 'Pedido recebido (um e-mail é enviado só se a conta existir).' },
      400: validationError,
      429: tooMany,
      500: internalError,
      503: unavailable,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/reset-password',
    tags: ['Login'],
    summary: 'Criar nova senha com o link do e-mail',
    description:
      'Troca a senha usando o token do link. O token só vale uma vez e por 1 hora. Ao trocar, todas as sessões da conta são encerradas.',
    request: {
      body: { required: true, content: jsonContent(resetPasswordInputSchema) },
    },
    responses: {
      204: { description: 'Senha trocada.' },
      400: errorResponse(
        '`VALIDATION_ERROR` (campos inválidos) ou `INVALID_RESET_TOKEN` (link vencido, já usado ou inválido).',
      ),
      422: errorResponse('`WEAK_PASSWORD`: senha comum demais ou igual ao e-mail.'),
      500: internalError,
      503: unavailable,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/auth/me',
    tags: ['Login'],
    summary: 'Consultar a conta da sessão',
    description: 'Devolve o identificador e o e-mail da conta dona do token.',
    security: secured,
    responses: {
      200: { description: 'Dados da conta.', content: jsonContent(accountInfoSchema) },
      401: unauthorized,
      500: internalError,
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
    method: 'get',
    path: '/units/nearby',
    tags: ['Postos de saúde'],
    summary: 'Unidades básicas de saúde perto de uma posição',
    description:
      'Mapa de postos (RF10). Devolve, da mais perto para a mais longe, as unidades básicas de saúde do cadastro oficial (CNES, Ministério da Saúde) dentro do raio. Usa o arquivo de unidades que acompanha a API e, se a API oficial responder em até 4 s, acrescenta telefone, turno e número do endereço (`source.live`). A posição não é guardada nem registrada em log. A lista não diz quais unidades têm sala de vacina.',
    security: secured,
    request: { query: nearbyUnitsQuerySchema },
    responses: {
      200: {
        description: 'Unidades encontradas (a lista pode vir vazia).',
        content: jsonContent(nearbyUnitsResponseSchema),
      },
      400: errorResponse('Parâmetros inválidos (a resposta lista só os nomes dos campos).'),
      401: unauthorized,
      429: errorResponse('`RATE_LIMITED`: mais de 60 buscas em 10 minutos.'),
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/reminders',
    tags: ['Lembretes'],
    summary: 'Listar os lembretes de hoje',
    description:
      'Doses que pedem atenção (RF05): atrasadas, para hoje e com data nos próximos 7 dias, de todas as pessoas cadastradas. Aplicadas e canceladas não entram. Aplica o atraso antes de listar.',
    security: secured,
    responses: {
      200: {
        description: 'Lembretes e preferência de e-mail.',
        content: jsonContent(reminderListResponseSchema),
      },
      401: unauthorized,
      500: internalError,
    },
  });

  registry.registerPath({
    method: 'put',
    path: '/reminders/preferences',
    tags: ['Lembretes'],
    summary: 'Ligar ou desligar os lembretes por e-mail',
    description:
      'Os e-mails de lembrete saem às 8h (Brasília), no máximo um por dia, e trazem só a quantidade de vacinas, sem nome de pessoa nem de vacina. Vêm ligados por padrão.',
    security: secured,
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: reminderPreferencesInputSchema,
            examples: {
              desligar: { summary: 'Desligar o e-mail', value: { emailEnabled: false } },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'Preferência gravada.',
        content: jsonContent(reminderPreferencesResponseSchema),
      },
      400: validationError,
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
                value: {
                  name: 'Maria',
                  birthDate: '2025-05-20',
                  isPregnant: false,
                  relationship: 'DAUGHTER',
                },
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
    method: 'post',
    path: '/members/{id}/doses',
    tags: ['Calendário e doses'],
    summary: 'Cadastrar uma dose avulsa',
    description:
      'Cadastra uma dose que não consta no calendário oficial, mas que a pessoa precisa acompanhar (por exemplo, por indicação de um profissional). O nome da vacina e a dose são texto livre e a data prevista é de hoje em diante. A dose nasce Pendente (T1), segue o mesmo ciclo de estados das oficiais e aparece com origem `CUSTOM`. Para o que já foi tomado, cadastre e depois registre a aplicação. Máximo de 30 doses avulsas por pessoa.',
    security: secured,
    request: {
      params: memberPathParams,
      body: {
        required: true,
        content: {
          'application/json': {
            schema: customDoseInputSchema,
            examples: {
              viagem: {
                summary: 'Vacina indicada para uma viagem',
                value: { vaccine: 'Febre tifoide', doseLabel: '1ª dose', dueDate: '2026-11-04' },
              },
            },
          },
        },
      },
    },
    responses: {
      201: { description: 'Dose cadastrada.', content: jsonContent(doseResponseSchema) },
      400: validationError,
      401: unauthorized,
      403: errorResponse('`CONSENT_REQUIRED`: o consentimento ainda não foi dado.'),
      404: errorResponse('Membro não encontrado (ou de outro usuário).'),
      422: errorResponse(
        '`INVALID_DOSE_DATE` (data anterior a hoje ou distante demais) ou `LIMIT_REACHED` (máximo de 30 doses avulsas por pessoa).',
      ),
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

  const assistantErrors = {
    401: unauthorized,
    429: errorResponse(
      '`RATE_LIMITED`: limite de uso atingido (cabeçalho `Retry-After` com os segundos de espera).',
    ),
    500: internalError,
    503: errorResponse('`ASSISTANT_UNAVAILABLE`: o serviço de PLN ou de voz não respondeu.'),
  };

  registry.registerPath({
    method: 'post',
    path: '/assistant/message',
    tags: ['Assistente'],
    summary: 'Perguntar ao assistente por texto',
    description:
      'Chatbot por regras com classificação de intenções (TF-IDF e SVM), sem IA generativa (RF07). Responde dúvidas sobre o aplicativo e sobre o Calendário Nacional de Vacinação, sempre com a fonte citada. Perguntas sobre saúde individual são encaminhadas a um profissional (`safety: true`); abaixo do limiar de confiança, devolve a resposta padrão (`fallback: true`). Devolve também as vacinas parecidas com a pergunta. O texto não é guardado nem registrado em log. Limite: 60 perguntas por hora por usuário.',
    security: secured,
    request: {
      body: {
        required: true,
        content: {
          'application/json': {
            schema: assistantMessageInputSchema,
            examples: {
              pergunta: { summary: 'Pergunta', value: { text: 'Para que serve a BCG?' } },
            },
          },
        },
      },
    },
    responses: {
      200: {
        description: 'A resposta do assistente.',
        content: jsonContent(assistantResponseSchema),
      },
      400: validationError,
      ...assistantErrors,
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/assistant/voice',
    tags: ['Assistente'],
    summary: 'Perguntar ao assistente por voz',
    description:
      'Recebe o áudio da pergunta (WAV PCM de 16 kHz, mono, até 60 s, enviado como `audio/wav` no corpo), transcreve com o Azure AI Speech em português do Brasil (RF06) e responde como em `/assistant/message`, incluindo a transcrição e a busca por vacinas. O áudio é processado em memória e descartado: nunca é gravado. Limite: 20 por hora e 60 por dia por usuário.',
    security: secured,
    request: {
      body: {
        required: true,
        content: { 'audio/wav': { schema: z.string().meta({ format: 'binary' }) } },
      },
    },
    responses: {
      200: {
        description: 'A transcrição e a resposta do assistente.',
        content: jsonContent(assistantResponseSchema),
      },
      413: errorResponse('`AUDIO_TOO_LARGE`: áudio maior que o limite.'),
      415: errorResponse('`UNSUPPORTED_AUDIO`: o corpo não é um WAV aceito.'),
      422: errorResponse(
        '`SPEECH_NOT_RECOGNIZED`: a fala não foi entendida; peça para tentar de novo ou digitar.',
      ),
      ...assistantErrors,
    },
  });

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'Vacina em Dia: API',
      version: API_VERSION,
      description:
        'API do Vacina em Dia: membros da família, calendário vacinal oficial (PNI 2026), ciclo de vida das doses e consentimento. Os dados ficam em memória (demonstração) e o acesso usa o login próprio (e-mail e senha, ADR-014) ou, enquanto estiver habilitada, a sessão de demonstração provisória; o banco entra no próximo item.',
    },
    servers: [{ url: '/api', description: 'Prefixo das Azure Functions' }],
    tags: [
      { name: 'Sistema', description: 'Verificação e documentação.' },
      { name: 'Conta e privacidade', description: 'Consentimento e exclusão de dados (RF09).' },
      { name: 'Família', description: 'Membros da família (RF02).' },
      { name: 'Assistente', description: 'Chatbot e busca por voz (RF06 e RF07).' },
      {
        name: 'Calendário e doses',
        description: 'Calendário vacinal e ciclo de vida da dose (RF03 e RF04).',
      },
    ],
  });
}
