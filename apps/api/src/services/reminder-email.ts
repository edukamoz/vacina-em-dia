import type { EmailMessage } from './email-ports';

/** Quantidade de doses que motivam o e-mail de lembrete. */
export interface ReminderCounts {
  /** Doses com data de hoje. */
  readonly today: number;
  /** Doses com data daqui a 7 dias. */
  readonly inAWeek: number;
}

/**
 * Monta o e-mail de lembrete. O texto é **genérico**: traz só quantas doses pedem atenção, sem nome
 * de pessoa nem de vacina, porque o e-mail passa por um serviço externo e pode ser lido por quem
 * vê a caixa de entrada. Os detalhes aparecem no app, depois do login.
 *
 * @param to - Endereço da conta.
 * @param counts - Quantas doses são para hoje e quantas para daqui a 7 dias.
 * @param baseUrl - Endereço do app web, sem barra final; sem ele, o e-mail não traz o link.
 */
export function buildReminderEmail(
  to: string,
  counts: ReminderCounts,
  baseUrl?: string,
): EmailMessage {
  const parts: string[] = [];
  if (counts.today > 0) {
    parts.push(
      counts.today === 1 ? '1 vacina é para hoje' : `${counts.today} vacinas são para hoje`,
    );
  }
  if (counts.inAWeek > 0) {
    parts.push(
      counts.inAWeek === 1
        ? '1 vacina é para daqui a 7 dias'
        : `${counts.inAWeek} vacinas são para daqui a 7 dias`,
    );
  }
  const resumo = parts.join(' e ');
  const link = baseUrl ? baseUrl.replace(/\/+$/, '') : undefined;
  const text = [
    'Olá!',
    '',
    `Lembrete do Vacina em Dia: ${resumo}.`,
    link ? `Abra o aplicativo para ver quais: ${link}` : 'Abra o aplicativo para ver quais.',
    '',
    'Para não receber mais este aviso, desligue os lembretes por e-mail na aba Conta.',
    '',
    'Vacina em Dia',
    'O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.',
  ].join('\n');
  const botao = link
    ? `<p><a href="${link}" style="display:inline-block;padding:14px 24px;background:#0b6b52;color:#ffffff;font-weight:bold;text-decoration:none;border-radius:14px">Abrir o aplicativo</a></p>`
    : '<p>Abra o aplicativo para ver quais.</p>';
  const html = `<p>Olá!</p>
<p>Lembrete do Vacina em Dia: ${resumo}.</p>
${botao}
<p>Para não receber mais este aviso, desligue os lembretes por e-mail na aba Conta.</p>
<p>Vacina em Dia<br>O aplicativo não substitui a caderneta oficial nem a orientação de profissionais de saúde.</p>`;
  return { to, subject: 'Lembrete de vacina no Vacina em Dia', text, html };
}
