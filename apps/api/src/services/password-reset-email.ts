import type { EmailMessage } from './email-ports';

/** Validade do link de redefinição, em minutos. */
export const RESET_TOKEN_TTL_MINUTES = 60;

/**
 * Monta o e-mail de redefinição de senha, em linguagem simples. O token vai no **fragmento** do
 * endereço (`#token=`), que o navegador não envia ao servidor nem no cabeçalho `Referer`; assim ele
 * não aparece em registros de acesso. O e-mail não traz nome nem outro dado da pessoa.
 *
 * @param to - Endereço de quem pediu.
 * @param baseUrl - Endereço do app web, sem barra final.
 * @param token - Token de redefinição (só o hash fica guardado).
 */
export function buildPasswordResetEmail(to: string, baseUrl: string, token: string): EmailMessage {
  const link = `${baseUrl.replace(/\/+$/, '')}/redefinir-senha#token=${encodeURIComponent(token)}`;
  const text = [
    'Olá!',
    '',
    'Recebemos um pedido para criar uma nova senha no Vacina em Dia.',
    `Para continuar, abra este endereço (vale por ${RESET_TOKEN_TTL_MINUTES} minutos e só pode ser usado uma vez):`,
    '',
    link,
    '',
    'Se você não pediu isso, ignore este e-mail: sua senha continua a mesma.',
    '',
    'Vacina em Dia',
  ].join('\n');
  const html = `<p>Olá!</p>
<p>Recebemos um pedido para criar uma nova senha no Vacina em Dia.</p>
<p>Para continuar, use o botão abaixo. O link vale por ${RESET_TOKEN_TTL_MINUTES} minutos e só pode ser usado uma vez.</p>
<p><a href="${link}" style="display:inline-block;padding:14px 24px;background:#0b6b52;color:#ffffff;font-weight:bold;text-decoration:none;border-radius:14px">Criar nova senha</a></p>
<p>Se o botão não abrir, copie este endereço no navegador:<br>${link}</p>
<p>Se você não pediu isso, ignore este e-mail: sua senha continua a mesma.</p>
<p>Vacina em Dia</p>`;
  return { to, subject: 'Criar nova senha no Vacina em Dia', text, html };
}
