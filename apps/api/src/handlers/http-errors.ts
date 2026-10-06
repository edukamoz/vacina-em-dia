import type { ApiError } from '@vacina/shared';
import type { HttpResult } from '../http';
import type { DoseServiceError } from '../services/dose-service';

/**
 * Único ponto que converte erros de domínio em respostas HTTP (CLAUDE.md §7): 404 para dose
 * inexistente, 409 para transição inválida e 422 para regra de data ou de confirmação violada.
 * As mensagens vêm do domínio, em linguagem simples; nada interno é devolvido.
 *
 * @param error - Erro devolvido pelo serviço.
 */
export function toErrorResult(error: DoseServiceError): HttpResult {
  switch (error.code) {
    case 'NOT_FOUND':
      return json(404, { code: 'NOT_FOUND', message: 'Dose não encontrada.' });
    case 'INVALID_TRANSITION':
      return json(409, { code: 'INVALID_TRANSITION', message: error.message });
    case 'GUARD_VIOLATION':
      return json(422, { code: 'GUARD_VIOLATION', message: error.message });
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
