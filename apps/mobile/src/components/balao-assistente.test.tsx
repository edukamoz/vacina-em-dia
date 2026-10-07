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

describe('balão do assistente', () => {
  test('CT-LAY-07: é um botão com texto que abre a conversa com o assistente', async () => {
    await render(<BalaoAssistente />);
    const balao = screen.getByRole('button', { name: 'Abrir o assistente' });
    expect(screen.getByText('Assistente')).toBeOnTheScreen();
    await fireEvent.press(balao);
    expect(mockPush).toHaveBeenCalledWith('/assistente');
  });

  test('CT-LAY-08: some na própria tela do assistente', async () => {
    mockPath = '/assistente';
    await render(<BalaoAssistente />);
    expect(screen.queryByRole('button', { name: 'Abrir o assistente' })).not.toBeOnTheScreen();
  });
});
