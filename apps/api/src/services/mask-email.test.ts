import { maskEmail } from './mask-email';

describe('e-mail parcialmente oculto', () => {
  test.each([
    ['CT-FAMR-100', 'mariana@gmail.com', 'm***@g***.com'],
    ['CT-FAMR-101', 'sr.jose@exemplo.com.br', 's***@e***.com.br'],
    ['CT-FAMR-102', 'a@b.co', 'a***@b***.co'],
    ['CT-FAMR-103', 'a@localhost', 'a***@l***'],
  ])('%s: %s', (_id, entrada, esperado) => {
    expect(maskEmail(entrada)).toBe(esperado);
  });

  test.each([
    ['CT-FAMR-104', ''],
    ['CT-FAMR-105', 'sem-arroba'],
    ['CT-FAMR-106', '@dominio.com'],
    ['CT-FAMR-107', 'fim@'],
  ])('%s: %j não parece um e-mail e vira ***', (_id, entrada) => {
    expect(maskEmail(entrada)).toBe('***');
  });

  test('CT-FAMR-108: o resultado nunca contém o endereço inteiro', () => {
    const email = 'mariana.silva@exemplo.com.br';
    const oculto = maskEmail(email);
    expect(oculto).not.toContain('ariana');
    expect(oculto).not.toContain('exemplo');
  });
});
