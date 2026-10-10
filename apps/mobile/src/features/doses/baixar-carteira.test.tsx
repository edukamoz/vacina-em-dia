import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createFakeFetch, renderScreen } from '../../test-utils';
import { BaixarCarteira, nomeDoArquivoDaCarteira } from './baixar-carteira';

const mockSalvar = jest.fn();
jest.mock('../../lib/salvar-arquivo', () => ({
  salvarArquivo: (...args: unknown[]) => mockSalvar(...args),
}));

const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]);

beforeEach(() => jest.clearAllMocks());

describe('carteira em PDF (RF11)', () => {
  test('CT-APP-PDF01: baixa o PDF da pessoa escolhida e entrega o arquivo com o nome certo', async () => {
    mockSalvar.mockResolvedValue(true);
    const fake = createFakeFetch({ 'GET /members/m-1/doses/pdf': { status: 200, body: PDF } });
    await renderScreen(<BaixarCarteira memberId="m-1" nome="Maria Clara" />, fake.fetchFn);
    expect(screen.getByText(/PDF das doses de Maria Clara/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Baixar PDF' }));
    expect(await screen.findByText(/Pronto\. O PDF está com você/)).toBeOnTheScreen();
    expect(fake.calls[0]?.key).toBe('GET /members/m-1/doses/pdf');
    expect(mockSalvar).toHaveBeenCalledWith(
      expect.any(Uint8Array),
      'carteira-vacinacao-maria-clara.pdf',
      'application/pdf',
    );
    expect(Array.from(mockSalvar.mock.calls[0]?.[0] as Uint8Array)).toEqual(Array.from(PDF));
  });

  test('CT-APP-PDF02: aparelho que não consegue compartilhar recebe um aviso claro', async () => {
    mockSalvar.mockResolvedValue(false);
    const fake = createFakeFetch({ 'GET /members/m-1/doses/pdf': { status: 200, body: PDF } });
    await renderScreen(<BaixarCarteira memberId="m-1" nome="Maria" />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar PDF' }));
    expect(await screen.findByText(/não consegue compartilhá-lo/)).toBeOnTheScreen();
  });

  test('CT-APP-PDF03: erro da API mostra a mensagem em linguagem simples e nada é salvo', async () => {
    const fake = createFakeFetch({
      'GET /members/m-1/doses/pdf': {
        status: 404,
        body: { code: 'NOT_FOUND', message: 'Pessoa não encontrada.' },
      },
    });
    await renderScreen(<BaixarCarteira memberId="m-1" nome="Maria" />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar PDF' }));
    expect(await screen.findByText('Pessoa não encontrada.')).toBeOnTheScreen();
    expect(mockSalvar).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Baixar PDF' })).toBeEnabled());
  });

  test('CT-APP-PDF04: falha ao gravar o arquivo mostra a mensagem do erro', async () => {
    mockSalvar.mockRejectedValue(new Error('Sem espaço no aparelho.'));
    const fake = createFakeFetch({ 'GET /members/m-1/doses/pdf': { status: 200, body: PDF } });
    await renderScreen(<BaixarCarteira memberId="m-1" nome="Maria" />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar PDF' }));
    expect(await screen.findByText('Sem espaço no aparelho.')).toBeOnTheScreen();
  });

  test('CT-APP-PDF05: resposta sem bytes legíveis vira erro de resposta inesperada', async () => {
    const fake = createFakeFetch({
      'GET /members/m-1/doses/pdf': { status: 200, body: { nao: 'e pdf' } },
    });
    await renderScreen(<BaixarCarteira memberId="m-1" nome="Maria" />, fake.fetchFn);
    await fireEvent.press(screen.getByRole('button', { name: 'Baixar PDF' }));
    expect(await screen.findByText(/resposta inesperada/)).toBeOnTheScreen();
    expect(mockSalvar).not.toHaveBeenCalled();
  });

  test.each([
    ['João Pedro', 'carteira-vacinacao-joao-pedro.pdf'],
    ['  Zé  da Silva!! ', 'carteira-vacinacao-ze-da-silva.pdf'],
    ['😀', 'carteira-vacinacao-pessoa.pdf'],
    ['a'.repeat(80), `carteira-vacinacao-${'a'.repeat(40)}.pdf`],
  ])('CT-APP-PDF06: nome do arquivo de "%s" é %s', (nome, esperado) => {
    expect(nomeDoArquivoDaCarteira(nome)).toBe(esperado);
  });
});
