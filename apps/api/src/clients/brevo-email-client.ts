import { EmailSendError, type EmailClient } from '../services/email-ports';

/** Tempo máximo de espera pelo Brevo. */
export const EMAIL_TIMEOUT_MS = 10000;

/** Endereço da API de e-mail transacional do Brevo. */
export const BREVO_SEND_URL = 'https://api.brevo.com/v3/smtp/email';

/** Configuração do cliente do Brevo. */
export interface BrevoConfig {
  /** Chave da API v3 do Brevo; vem do Key Vault ou das configurações, nunca do repositório. */
  readonly apiKey: string;
  /** Remetente, que precisa estar verificado no Brevo. */
  readonly senderEmail: string;
  readonly senderName: string;
  readonly fetchFn?: typeof fetch;
}

/**
 * Cliente de e-mail transacional do Brevo (`POST /v3/smtp/email`, cabeçalho `api-key`). Qualquer
 * falha vira {@link EmailSendError}, sem detalhe: nem o endereço do destinatário nem a resposta do
 * provedor podem aparecer em mensagem de erro ou em log.
 *
 * @param config - Chave, remetente e `fetch` (injetável nos testes).
 */
export function createBrevoEmailClient({
  apiKey,
  senderEmail,
  senderName,
  fetchFn = fetch,
}: BrevoConfig): EmailClient {
  return {
    async send({ to, subject, text, html }) {
      let response: Response;
      try {
        response = await fetchFn(BREVO_SEND_URL, {
          method: 'POST',
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            sender: { email: senderEmail, name: senderName },
            to: [{ email: to }],
            subject,
            textContent: text,
            htmlContent: html,
          }),
          signal: AbortSignal.timeout(EMAIL_TIMEOUT_MS),
        });
      } catch {
        throw new EmailSendError();
      }
      if (response.status !== 201 && response.status !== 202) throw new EmailSendError();
    },
  };
}

/** Cliente usado quando o e-mail não está configurado: toda tentativa de envio falha. */
export const unavailableEmailClient: EmailClient = {
  async send() {
    throw new EmailSendError();
  },
};
