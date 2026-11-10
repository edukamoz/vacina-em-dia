import {
  INVITE_CODE_ALPHABET,
  INVITE_CODE_LENGTH,
  formatInviteCode,
  generateInviteCode,
  normalizeInviteCode,
} from './invite-code';

describe('código de convite da família', () => {
  test('CT-FAMR-01: o alfabeto não tem caracteres que se confundem (0, O, 1, I, L)', () => {
    for (const confuso of ['0', 'O', '1', 'I', 'L']) {
      expect(INVITE_CODE_ALPHABET).not.toContain(confuso);
    }
    expect(new Set(INVITE_CODE_ALPHABET).size).toBe(INVITE_CODE_ALPHABET.length);
    expect(INVITE_CODE_LENGTH).toBe(10);
  });

  test('CT-FAMR-02: o gerador usa o sorteio recebido e devolve 10 caracteres do alfabeto', () => {
    let n = 0;
    const codigo = generateInviteCode(() => (n += 7) % INVITE_CODE_ALPHABET.length);
    expect(codigo).toHaveLength(INVITE_CODE_LENGTH);
    for (const letra of codigo) expect(INVITE_CODE_ALPHABET).toContain(letra);
  });

  test('CT-FAMR-03: o sorteio recebe o tamanho do alfabeto como limite', () => {
    const limites: number[] = [];
    generateInviteCode((max) => {
      limites.push(max);
      return 0;
    });
    expect(limites).toEqual(Array(INVITE_CODE_LENGTH).fill(INVITE_CODE_ALPHABET.length));
  });

  test('CT-FAMR-04: sorteio fora do intervalo é recusado', () => {
    expect(() => generateInviteCode(() => INVITE_CODE_ALPHABET.length)).toThrow(RangeError);
    expect(() => generateInviteCode(() => -1)).toThrow(RangeError);
    expect(() => generateInviteCode(() => 1.5)).toThrow(RangeError);
  });

  test.each([
    ['CT-FAMR-05', 'ABCDEFGHJK', 'ABCDEFGHJK'],
    ['CT-FAMR-06', 'abcde-fghjk', 'ABCDEFGHJK'],
    ['CT-FAMR-07', '  abcde fghjk  ', 'ABCDEFGHJK'],
    ['CT-FAMR-08', 'ABCDE-FGHJK', 'ABCDEFGHJK'],
  ])('%s: normaliza %j', (_id, entrada, esperado) => {
    expect(normalizeInviteCode(entrada)).toBe(esperado);
  });

  test.each([
    ['CT-FAMR-09', ''],
    ['CT-FAMR-10', 'ABCDEFGHJ'],
    ['CT-FAMR-11', 'ABCDEFGHJKM'],
    ['CT-FAMR-12', 'ABCDEFGHJ0'],
    ['CT-FAMR-13', 'ABCDEFGHJO'],
    ['CT-FAMR-14', 'ABCDE*GHJK'],
    ['CT-FAMR-15', 'ÁBCDEFGHJK'],
  ])('%s: recusa %j', (_id, entrada) => {
    expect(normalizeInviteCode(entrada)).toBeNull();
  });

  test('CT-FAMR-16: formata com hífen no meio para ficar fácil de ler e digitar', () => {
    expect(formatInviteCode('ABCDEFGHJK')).toBe('ABCDE-FGHJK');
  });
});
