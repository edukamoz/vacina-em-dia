/** Mensagem de e-mail transacional (texto simples e HTML). */
export interface EmailMessage {
  readonly to: string;
  readonly subject: string;
  readonly text: string;
  readonly html: string;
}

/** Falha ao enviar o e-mail. Não carrega detalhe: o endereço do destinatário é dado pessoal. */
export class EmailSendError extends Error {
  constructor() {
    super('Não foi possível enviar o e-mail.');
    this.name = 'EmailSendError';
  }
}

/** Cliente de envio de e-mail (a implementação real usa o Brevo). */
export interface EmailClient {
  /**
   * Envia a mensagem.
   *
   * @throws EmailSendError se o provedor recusar, não responder ou não estiver configurado.
   */
  send(message: EmailMessage): Promise<void>;
}
