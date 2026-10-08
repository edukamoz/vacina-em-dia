import { fireEvent, render, screen } from '@testing-library/react-native';
import { BalaoAssistente } from './balao-assistente';

const mockPush = jest.fn();
let mockPath = '/';
jest.mock('expo-router', () => ({
  usePathname: () => mockPath,
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPath = '/';
});

describe('botão flutuante do assistente', () => {
  test('CT-LAY-07: no celular é um botão com rótulo que abre a conversa com o assistente', async () => {
    await render(<BalaoAssistente largura={390} />);
    const balao = screen.getByRole('button', { name: 'Abrir o assistente' });
    await fireEvent.press(balao);
    expect(mockPush).toHaveBeenCalledWith('/assistente');
  });

  test('CT-LAY-08: some na própria tela do assistente', async () => {
    mockPath = '/assistente';
    await render(<BalaoAssistente largura={390} />);
    expect(screen.queryByRole('button', { name: 'Abrir o assistente' })).not.toBeOnTheScreen();
  });

  test.each([800, 1280])(
    'CT-LAY-09: com %i px não aparece (o assistente é um item da barra lateral)',
    async (largura) => {
      await render(<BalaoAssistente largura={largura} />);
      expect(screen.queryByRole('button', { name: 'Abrir o assistente' })).not.toBeOnTheScreen();
    },
  );
});
