import { DEMO_SESSION_HEADER, resolveDemoOwner } from './identity';

describe('identificação da sessão de demonstração', () => {
  test('CT-SEG-01: o cabeçalho tem o nome esperado', () => {
    expect(DEMO_SESSION_HEADER).toBe('x-demo-session');
  });

  test.each(['3f1c2d4e-5a6b-4c7d-8e9f-0a1b2c3d4e5f', 'a'.repeat(16), 'a'.repeat(64)])(
    'CT-SEG-02: aceita %s',
    (value) => {
      expect(resolveDemoOwner(value)).toBe(value);
    },
  );

  test.each([
    undefined,
    null,
    '',
    'curto',
    'a'.repeat(65),
    'MAIUSCULAS-NAO-VALEM-0001',
    '../../etc/passwd-0000',
    "x'; DROP TABLE users;--",
  ])('CT-SEG-03: recusa %p', (value) => {
    expect(resolveDemoOwner(value)).toBeUndefined();
  });
});
