import { lerConfigPix } from './config-pix';

describe('lerConfigPix', () => {
  test('CT-APP-PIX10: com os três valores devolve os dados sem espaços nas pontas', () => {
    expect(lerConfigPix({ chave: ' abc ', nome: 'Ana Souza', cidade: 'Sorocaba ' })).toEqual({
      chave: 'abc',
      nome: 'Ana Souza',
      cidade: 'Sorocaba',
    });
  });

  test.each([
    ['sem chave', { chave: undefined, nome: 'Ana', cidade: 'Sorocaba' }],
    ['chave em branco', { chave: '  ', nome: 'Ana', cidade: 'Sorocaba' }],
    ['sem nome', { chave: 'abc', nome: undefined, cidade: 'Sorocaba' }],
    ['sem cidade', { chave: 'abc', nome: 'Ana', cidade: '' }],
  ])('CT-APP-PIX11: %s desliga a doação', (_n, env) => {
    expect(lerConfigPix(env)).toBeNull();
  });
});
