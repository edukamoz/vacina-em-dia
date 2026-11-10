/**
 * Oculta parte do e-mail para reconhecer a pessoa sem mostrar o endereço inteiro: a primeira letra
 * antes do `@`, a primeira do domínio e o final do domínio (por exemplo, `m***@g***.com`).
 *
 * @param email - Endereço completo.
 * @returns O e-mail parcialmente oculto; `***` quando não parece um endereço.
 */
export function maskEmail(email: string): string {
  const at = email.lastIndexOf('@');
  if (at < 1 || at === email.length - 1) return '***';
  const local = email.slice(0, at);
  const domain = email.slice(at + 1);
  const dot = domain.indexOf('.');
  const first = domain.slice(0, 1);
  const tail = dot > 0 ? domain.slice(dot) : '';
  return `${local.slice(0, 1)}***@${first}***${tail}`;
}
