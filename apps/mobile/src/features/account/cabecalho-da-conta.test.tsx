import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { createFakeFetch, renderScreen } from '../../test-utils';
import { escolherFotoDePerfil } from '../../lib/escolher-foto';
import { CabecalhoDaConta } from './cabecalho-da-conta';

jest.mock('../../lib/escolher-foto', () => ({
  escolherFotoDePerfil: jest.fn(),
  podeTirarFoto: true,
  enderecoDaFoto: (foto: { contentType: string; data: string }) =>
    `data:${foto.contentType};base64,${foto.data}`,
}));

const escolher = escolherFotoDePerfil as jest.MockedFunction<typeof escolherFotoDePerfil>;
const FOTO = { contentType: 'image/jpeg', data: '/9j/4AAQSkZJRg==' } as const;
const SEM_FOTO = { status: 404, body: { code: 'NOT_FOUND', message: 'Não encontramos.' } };

beforeEach(() => escolher.mockReset());

const abrir = (routes: Parameters<typeof createFakeFetch>[0]) => {
  const fake = createFakeFetch(routes);
  return {
    fake,
    pronto: renderScreen(<CabecalhoDaConta email="ana@exemplo.com.br" />, fake.fetchFn),
  };
};

describe('foto de perfil na aba Conta', () => {
  test('CT-APP-FOTO01: sem foto mostra o e-mail, a inicial e só o botão de escolher', async () => {
    const { pronto } = abrir({ 'GET /account/photo': SEM_FOTO });
    await pronto;
    expect(await screen.findByRole('button', { name: 'Escolher foto' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Tirar foto' })).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: 'Remover foto' })).not.toBeOnTheScreen();
    expect(screen.getByText('ana@exemplo.com.br')).toBeOnTheScreen();
    expect(screen.getByText('A', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.getByText(/apagada se você excluir a conta/)).toBeOnTheScreen();
  });

  test('CT-APP-FOTO02: com foto oferece trocar e remover, e mostra a imagem no lugar da inicial', async () => {
    const { pronto } = abrir({ 'GET /account/photo': { status: 200, body: FOTO } });
    await pronto;
    expect(await screen.findByRole('button', { name: 'Trocar foto' })).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Remover foto' })).toBeOnTheScreen();
    expect(screen.queryByText('A', { includeHiddenElements: true })).not.toBeOnTheScreen();
  });

  test.each([
    ['Escolher foto', 'galeria'],
    ['Tirar foto', 'camera'],
  ] as const)(
    'CT-APP-FOTO03: "%s" pede a foto da %s e a envia reduzida à API',
    async (botao, origem) => {
      escolher.mockResolvedValue({ tipo: 'foto', foto: FOTO });
      const { fake, pronto } = abrir({
        'GET /account/photo': SEM_FOTO,
        'PUT /account/photo': { status: 204 },
      });
      await pronto;
      await fireEvent.press(await screen.findByRole('button', { name: botao }));
      expect(escolher).toHaveBeenCalledWith(origem);
      expect(await screen.findByRole('button', { name: 'Trocar foto' })).toBeOnTheScreen();
      expect(fake.calls.find((c) => c.key === 'PUT /account/photo')?.body).toEqual(FOTO);
    },
  );

  test('CT-APP-FOTO04: escolher e cancelar não envia nada', async () => {
    escolher.mockResolvedValue({ tipo: 'cancelado' });
    const { fake, pronto } = abrir({ 'GET /account/photo': SEM_FOTO });
    await pronto;
    await fireEvent.press(await screen.findByRole('button', { name: 'Escolher foto' }));
    await waitFor(() => expect(escolher).toHaveBeenCalled());
    expect(fake.calls.some((c) => c.key === 'PUT /account/photo')).toBe(false);
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  test.each([
    ['Escolher foto', /ver as suas fotos/],
    ['Tirar foto', /usar a câmera/],
  ] as const)('CT-APP-FOTO05: sem permissão ("%s") explica como liberar', async (botao, texto) => {
    escolher.mockResolvedValue({ tipo: 'negado' });
    const { pronto } = abrir({ 'GET /account/photo': SEM_FOTO });
    await pronto;
    await fireEvent.press(await screen.findByRole('button', { name: botao }));
    expect(await screen.findByText(texto)).toBeOnTheScreen();
  });

  test('CT-APP-FOTO06: erro da API ao guardar mostra a mensagem dela e mantém o estado', async () => {
    escolher.mockResolvedValue({ tipo: 'foto', foto: FOTO });
    const { pronto } = abrir({
      'GET /account/photo': SEM_FOTO,
      'PUT /account/photo': {
        status: 415,
        body: { code: 'INVALID_IMAGE', message: 'Esta imagem não pôde ser usada.' },
      },
    });
    await pronto;
    await fireEvent.press(await screen.findByRole('button', { name: 'Escolher foto' }));
    expect(await screen.findByText('Esta imagem não pôde ser usada.')).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Escolher foto' })).toBeOnTheScreen();
  });

  test('CT-APP-FOTO07: falha inesperada ao escolher mostra uma mensagem simples', async () => {
    escolher.mockRejectedValue(new Error('arquivo corrompido'));
    const { pronto } = abrir({ 'GET /account/photo': SEM_FOTO });
    await pronto;
    await fireEvent.press(await screen.findByRole('button', { name: 'Escolher foto' }));
    expect(
      await screen.findByText('Não foi possível usar essa foto. Tente outra.'),
    ).toBeOnTheScreen();
  });

  test('CT-APP-FOTO08: remover apaga a foto na API e volta ao botão de escolher', async () => {
    const { fake, pronto } = abrir({
      'GET /account/photo': { status: 200, body: FOTO },
      'DELETE /account/photo': { status: 204 },
    });
    await pronto;
    await fireEvent.press(await screen.findByRole('button', { name: 'Remover foto' }));
    expect(await screen.findByRole('button', { name: 'Escolher foto' })).toBeOnTheScreen();
    expect(fake.calls.some((c) => c.key === 'DELETE /account/photo')).toBe(true);
  });

  test('CT-APP-FOTO09: falha ao remover mostra o aviso e mantém a foto', async () => {
    const { pronto } = abrir({
      'GET /account/photo': { status: 200, body: FOTO },
      'DELETE /account/photo': { status: 503, body: { code: 'STORAGE_UNAVAILABLE', message: 'x' } },
    });
    await pronto;
    await fireEvent.press(await screen.findByRole('button', { name: 'Remover foto' }));
    expect(await screen.findByText(/Não foi possível remover a foto agora/)).toBeOnTheScreen();
    expect(screen.getByRole('button', { name: 'Trocar foto' })).toBeOnTheScreen();
  });
});
