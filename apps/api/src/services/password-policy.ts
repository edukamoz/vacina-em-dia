/**
 * Senhas comuns recusadas (a lista é pequena de propósito: o NIST SP 800-63B pede para recusar as
 * mais conhecidas, não para impor regras de composição). Todas em minúsculas.
 */
const COMMON_PASSWORDS: ReadonlySet<string> = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '87654321',
  '11111111',
  '00000000',
  'qwertyui',
  'qwerty123',
  'qwertyuiop',
  'asdfghjk',
  'abcd1234',
  'abc12345',
  'password',
  'password1',
  'password123',
  'senha123',
  'senha1234',
  'senhasenha',
  'minhasenha',
  'mudar123',
  'brasil123',
  'brasileiro',
  'corinthians',
  'flamengo123',
  'palmeiras',
  'iloveyou',
  'admin123',
  'letmein1',
  'welcome1',
  'vacina123',
  'vacinaemdia',
]);

/**
 * Diz se a senha é fraca demais: está na lista de senhas comuns, é só um caractere repetido, ou é
 * igual ao e-mail (ou à parte antes do `@`). Não impõe maiúsculas, números ou símbolos.
 *
 * @param password - Senha em texto, só em memória.
 * @param email - E-mail da conta.
 */
export function isWeakPassword(password: string, email: string): boolean {
  const lower = password.toLowerCase();
  const address = email.toLowerCase();
  const localPart = address.split('@')[0] ?? address;
  if (COMMON_PASSWORDS.has(lower)) return true;
  if (lower === address || lower === localPart) return true;
  return new Set(lower).size === 1;
}
