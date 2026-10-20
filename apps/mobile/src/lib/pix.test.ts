import { crc16, montarPix, normalizarTexto, valorValido } from './pix';

const BASE = {
  chave: '123e4567-e12b-12d1-a456-426655440000',
  nome: 'Fulano de Tal',
  cidade: 'Sao Paulo',
};

describe('crc16', () => {
  test('CT-APP-PIX01: bate com o valor de referência do CRC-16/CCITT-FALSE ("123456789" = 29B1)', () => {
    expect(crc16('123456789')).toBe('29B1');
  });
});

describe('normalizarTexto', () => {
  test.each([
    ['Eduardo Kamo Iguei', 25, 'EDUARDO KAMO IGUEI'],
    ['José da Conceição', 25, 'JOSE DA CONCEICAO'],
    ['Votorantim', 15, 'VOTORANTIM'],
    ['  Município   de  São Roque  ', 15, 'MUNICIPIO DE SA'],
    ['Nome muito comprido para caber', 10, 'NOME MUITO'],
  ])('CT-APP-PIX02: "%s" (limite %i) vira "%s" (sem acento, maiúsculo, cortado)', (e, n, s) => {
    expect(normalizarTexto(e, n)).toBe(s);
  });
});

describe('valorValido', () => {
  test.each([
    [10, true],
    [0.01, true],
    [99999.99, true],
    [0, false],
    [-5, false],
    [Number.NaN, false],
    [Number.POSITIVE_INFINITY, false],
    [1_000_000, false],
  ])('CT-APP-PIX03: %p é válido? %p', (valor, esperado) => {
    expect(valorValido(valor)).toBe(esperado);
  });
});

describe('montarPix', () => {
  test('CT-APP-PIX04: sem valor monta o código estático com a chave, o nome e a cidade', () => {
    const codigo = montarPix(BASE);
    expect(codigo.startsWith('000201010211')).toBe(true);
    expect(codigo).toContain('0014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000');
    expect(codigo).toContain('5303986');
    expect(codigo).toContain('5802BR');
    expect(codigo).toContain('5913FULANO DE TAL');
    expect(codigo).toContain('6009SAO PAULO');
    expect(codigo).toContain('62070503***');
    expect(codigo).not.toContain('5405');
  });

  test('CT-APP-PIX05: o código termina com o CRC16 correto sobre todo o texto anterior', () => {
    const codigo = montarPix(BASE);
    const corpo = codigo.slice(0, -4);
    expect(corpo.endsWith('6304')).toBe(true);
    expect(codigo.slice(-4)).toBe(crc16(corpo));
    expect(codigo.slice(-4)).toMatch(/^[0-9A-F]{4}$/);
  });

  test.each([
    [10, '540510.00'],
    [5.5, '54045.50'],
    [0.01, '54040.01'],
    [1234.5, '54071234.50'],
  ])('CT-APP-PIX06: o valor %p entra como campo 54 (%s)', (valor, campo) => {
    expect(montarPix({ ...BASE, valor })).toContain(campo);
  });

  test('CT-APP-PIX07: com valor o CRC continua correto', () => {
    const codigo = montarPix({ ...BASE, valor: 25 });
    expect(codigo.slice(-4)).toBe(crc16(codigo.slice(0, -4)));
  });

  test('CT-APP-PIX08: nome e cidade são normalizados e cortados nos limites do BR Code', () => {
    const codigo = montarPix({
      chave: BASE.chave,
      nome: 'Eduardo Kamo Iguei da Silva Pereira',
      cidade: 'São José do Rio Preto',
    });
    expect(codigo).toContain('5925EDUARDO KAMO IGUEI DA SIL');
    expect(codigo).toContain('6015SAO JOSE DO RIO');
  });

  test.each([
    ['chave vazia', { ...BASE, chave: '  ' }],
    ['nome vazio', { ...BASE, nome: '' }],
    ['cidade vazia', { ...BASE, cidade: '' }],
    ['valor zero', { ...BASE, valor: 0 }],
    ['valor negativo', { ...BASE, valor: -1 }],
    ['valor acima do limite', { ...BASE, valor: 2_000_000 }],
  ])('CT-APP-PIX09: %s é rejeitado', (_nome, entrada) => {
    expect(() => montarPix(entrada)).toThrow();
  });
});
