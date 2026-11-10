/**
 * Alfabeto do código de convite da família: 31 caracteres sem os que se confundem ao ler ou digitar
 * (0, O, 1, I e L). Dez caracteres dão cerca de 49 bits, e o código vale uma vez e por 7 dias.
 */
export const INVITE_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Quantos caracteres tem o código de convite (sem o hífen de exibição). */
export const INVITE_CODE_LENGTH = 10;

/**
 * Gera um código de convite. O sorteio vem de fora para a regra ficar pura e testável: em produção
 * é um gerador seguro (`crypto.randomInt`), nunca `Math.random`.
 *
 * @param randomInt - Devolve um inteiro de 0 até `max - 1`.
 * @returns O código, com {@link INVITE_CODE_LENGTH} caracteres do {@link INVITE_CODE_ALPHABET}.
 * @throws RangeError se o sorteio devolver um valor fora de 0 até `max - 1`.
 */
export function generateInviteCode(randomInt: (max: number) => number): string {
  let code = '';
  for (let i = 0; i < INVITE_CODE_LENGTH; i += 1) {
    const index = randomInt(INVITE_CODE_ALPHABET.length);
    if (!Number.isInteger(index) || index < 0 || index >= INVITE_CODE_ALPHABET.length) {
      throw new RangeError('Sorteio fora do intervalo do alfabeto.');
    }
    code += INVITE_CODE_ALPHABET[index];
  }
  return code;
}

/**
 * Normaliza o que a pessoa digitou: tira espaços e hífens e usa maiúsculas. Só devolve o código
 * quando ele tem o tamanho certo e usa apenas caracteres do alfabeto.
 *
 * @param input - Texto digitado ou colado.
 * @returns O código normalizado, ou `null` se não for um código válido.
 */
export function normalizeInviteCode(input: string): string | null {
  const code = input.replace(/[\s-]/g, '').toUpperCase();
  if (code.length !== INVITE_CODE_LENGTH) return null;
  for (const letter of code) {
    if (!INVITE_CODE_ALPHABET.includes(letter)) return null;
  }
  return code;
}

/**
 * Formata o código para exibição, com um hífen no meio (`ABCDE-FGHJK`).
 *
 * @param code - Código normalizado.
 */
export function formatInviteCode(code: string): string {
  const half = INVITE_CODE_LENGTH / 2;
  return `${code.slice(0, half)}-${code.slice(half)}`;
}
