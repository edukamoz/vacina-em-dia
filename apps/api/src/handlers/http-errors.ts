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
