import type { ApiError } from '@vacina/shared';
import type { HttpResult } from '../http';
import type { ServiceError } from '../services/errors';

/**
 * Único ponto que converte erros de domínio em respostas HTTP (CLAUDE.md §7): 403 para falta de
 * consentimento, 404 para recurso inexistente (ou de outro dono), 409 para transição inválida e 422
 * para regra violada (data, confirmação, declaração de responsável, limite). As mensagens são em
 * linguagem simples; nada interno é devolvido.
 *
 * @param error - Erro devolvido pelo serviço.
 */
export function toErrorResult(error: ServiceError): HttpResult {
  switch (error.code) {
    case 'NOT_FOUND':
      return json(404, { code: 'NOT_FOUND', message: 'Não encontramos o que você procura.' });
    case 'CONSENT_REQUIRED':
      return json(403, {
        code: 'CONSENT_REQUIRED',
        message: 'Para continuar, é preciso aceitar o termo de consentimento.',
      });
    case 'INVALID_TRANSITION':
      return json(409, { code: 'INVALID_TRANSITION', message: error.message });
    case 'GUARD_VIOLATION':
      return json(422, { code: 'GUARD_VIOLATION', message: error.message });
    case 'GUARDIAN_DECLARATION_REQUIRED':
      return json(422, {
        code: 'GUARDIAN_DECLARATION_REQUIRED',
        message:
          'Para cadastrar uma criança ou adolescente, confirme que você é o responsável legal.',
      });
    case 'INVALID_BIRTH_DATE':
      return json(422, {
        code: 'INVALID_BIRTH_DATE',
        message: 'A data de nascimento não pode ser no futuro.',
      });
    case 'LIMIT_REACHED':
      return json(422, {
        code: 'LIMIT_REACHED',
        message: 'Você chegou ao limite de pessoas cadastradas.',
      });
    case 'RATE_LIMITED':
      return {
        ...json(429, { code: 'RATE_LIMITED', message: rateLimitedMessage(error.scope) }),
        headers: { 'retry-after': String(error.retryAfterSeconds) },
      };
    case 'INVALID_CREDENTIALS':
      return json(401, {
        code: 'INVALID_CREDENTIALS',
        message: 'E-mail ou senha incorretos. Confira e tente de novo.',
      });
    case 'EMAIL_ALREADY_REGISTERED':
      return json(409, {
        code: 'EMAIL_ALREADY_REGISTERED',
        message: 'Já existe uma conta com este e-mail. Entre ou use outro e-mail.',
      });
    case 'WEAK_PASSWORD':
      return json(422, {
        code: 'WEAK_PASSWORD',
        message: 'Essa senha é fácil de adivinhar. Use uma frase longa ou outra senha.',
      });
    case 'INVALID_TOKEN':
      return json(401, {
        code: 'INVALID_TOKEN',
        message: 'Sua sessão terminou. Entre de novo.',
      });
    case 'INVALID_RESET_TOKEN':
      return json(400, {
        code: 'INVALID_RESET_TOKEN',
        message: 'Este link não vale mais. Peça uma nova senha para receber outro.',
      });
    case 'AUTH_UNAVAILABLE':
      return json(503, {
        code: 'AUTH_UNAVAILABLE',
        message: 'A entrada na conta não está disponível agora. Tente de novo em instantes.',
      });
    case 'ASSISTANT_UNAVAILABLE':
      return json(503, {
        code: 'ASSISTANT_UNAVAILABLE',
        message: 'O assistente não está disponível agora. Tente de novo em instantes.',
      });
    case 'SPEECH_NOT_RECOGNIZED':
      return json(422, {
        code: 'SPEECH_NOT_RECOGNIZED',
        message:
          'Não consegui entender o áudio. Fale mais perto do microfone ou digite a sua pergunta.',
      });
    case 'UNSUPPORTED_AUDIO':
      return json(415, {
        code: 'UNSUPPORTED_AUDIO',
        message: 'O áudio não está em um formato aceito. Digite a sua pergunta.',
      });
    case 'AUDIO_TOO_LARGE':
      return json(413, {
        code: 'AUDIO_TOO_LARGE',
        message: 'O áudio é longo demais. Fale por até 30 segundos ou digite a sua pergunta.',
      });
  }
}

function rateLimitedMessage(
  scope: 'assistant' | 'login' | 'register' | 'reset' | undefined,
): string {
  switch (scope) {
    case 'reset':
      return 'Muitos pedidos de nova senha. Tente de novo mais tarde.';
    case 'login':
      return 'Muitas tentativas de entrar. Aguarde um pouco e tente de novo.';
    case 'register':
      return 'Muitos cadastros em pouco tempo. Tente de novo mais tarde.';
    default:
      return 'Você fez muitas perguntas em pouco tempo. Tente de novo mais tarde.';
  }
}

/**
 * Resposta 400 de validação. Lista só os nomes dos campos inválidos, nunca os valores enviados.
 *
 * @param fields - Nomes dos campos que não passaram na validação.
 */
export function validationErrorResult(fields: readonly string[]): HttpResult {
  return json(400, {
    code: 'VALIDATION_ERROR',
    message: 'Confira os dados informados e tente de novo.',
    fields: [...fields],
  });
}

/** Resposta 401: a sessão não foi informada ou não é válida. */
export function unauthorizedResult(): HttpResult {
  return json(401, {
    code: 'UNAUTHORIZED',
    message: 'Não foi possível identificar a sua sessão. Abra o aplicativo de novo.',
  });
}

/** Resposta 500 genérica: o detalhe da falha vai para o log, nunca para o cliente. */
export function internalErrorResult(): HttpResult {
  return json(500, {
    code: 'INTERNAL_ERROR',
    message: 'Algo deu errado. Tente de novo em instantes.',
  });
}

function json(status: number, body: ApiError): HttpResult {
  return { status, jsonBody: body };
}
