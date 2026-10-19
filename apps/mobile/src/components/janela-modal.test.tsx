import { fireEvent, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider } from '../theme/theme-provider';
import { JanelaModal } from './janela-modal';

const mockBack = jest.fn();
const mockReplace = jest.fn();
let mockPodeVoltar = true;
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    replace: mockReplace,
    canGoBack: () => mockPodeVoltar,
  }),
}));

async function abrir(largura?: number) {
  await render(
    <ThemeProvider>
      <JanelaModal titulo="Adicionar pessoa" subtitulo="Só o essencial" largura={largura}>
        <Text>Conteúdo da janela</Text>
      </JanelaModal>
    </ThemeProvider>,
  );
}

describe('JanelaModal', () => {
  beforeEach(() => {
    mockBack.mockClear();
    mockReplace.mockClear();
    mockPodeVoltar = true;
  });

  test('CT-APP-MOD01: tem papel de diálogo com o título como nome e mostra o conteúdo', async () => {
    await abrir();
    expect(screen.getByLabelText('Adicionar pessoa')).toBeOnTheScreen();
    expect(screen.getByRole('header', { name: 'Adicionar pessoa' })).toBeOnTheScreen();
    expect(screen.getByText('Só o essencial')).toBeOnTheScreen();
    expect(screen.getByText('Conteúdo da janela')).toBeOnTheScreen();
  });

  test.each([
    ['o botão Fechar', 'Fechar'],
    ['o véu atrás da janela', 'Fechar a janela'],
  ])('CT-APP-MOD02: %s volta à tela anterior', async (_nome, rotulo) => {
    await abrir();
    // O véu fica fora do diálogo (que é modal para o leitor de tela), por isso `hidden`.
    await fireEvent.press(screen.getByRole('button', { name: rotulo, hidden: true }));
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  test('CT-APP-MOD03: sem histórico (aberta pelo endereço), fechar vai ao início', async () => {
    mockPodeVoltar = false;
    await abrir();
    await fireEvent.press(screen.getByRole('button', { name: 'Fechar' }));
    expect(mockReplace).toHaveBeenCalledWith('/');
    expect(mockBack).not.toHaveBeenCalled();
  });

  test.each([360, 820, 1280])(
    'CT-APP-MOD04: abre também com a largura de %i px',
    async (largura) => {
      await abrir(largura);
      expect(screen.getByLabelText('Adicionar pessoa')).toBeOnTheScreen();
    },
  );
});
