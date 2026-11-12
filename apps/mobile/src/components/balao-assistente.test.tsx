import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AssistenteProvider, useAssistente } from '../features/assistant/assistente-contexto';
import { definirBotaoRecolhido } from '../lib/rolagem-balao';
import { BalaoAssistente } from './balao-assistente';
import { Tela } from './tela';

jest.mock('expo-router', () => ({
  useRouter: () => ({ back: jest.fn(), replace: jest.fn(), canGoBack: () => true }),
}));

function Estado() {
  const { aberto } = useAssistente();
  return <Text>{aberto ? 'janela aberta' : 'janela fechada'}</Text>;
}

describe('botão flutuante do assistente', () => {
  test.each([390, 800, 1280])(
    'CT-LAY-07: com %i px é um botão com rótulo que abre a janela do assistente',
    async (largura) => {
      await render(
        <AssistenteProvider>
          <BalaoAssistente largura={largura} />
          <Estado />
        </AssistenteProvider>,
      );
      expect(screen.getByText('janela fechada')).toBeOnTheScreen();
      await fireEvent.press(screen.getByRole('button', { name: 'Abrir o assistente' }));
      expect(screen.getByText('janela aberta')).toBeOnTheScreen();
    },
  );

  test('CT-LAY-08: some enquanto a janela do assistente está aberta', async () => {
    await render(
      <AssistenteProvider inicialmenteAberto>
        <BalaoAssistente largura={390} />
      </AssistenteProvider>,
    );
    expect(screen.queryByRole('button', { name: 'Abrir o assistente' })).not.toBeOnTheScreen();
  });

  test('CT-BAL-09: rolando para baixo o botão se recolhe, continua tocável e volta ao rolar para cima', async () => {
    await render(
      <AssistenteProvider>
        <Tela titulo="Doses" reservaBalao>
          <Text>conteúdo</Text>
        </Tela>
        <BalaoAssistente largura={390} />
        <Estado />
      </AssistenteProvider>,
    );
    const botao = () => screen.getByRole('button', { name: 'Abrir o assistente' });
    expect(botao()).not.toHaveStyle({ opacity: 0.55 });
    const rolagem = screen.getByTestId('rolagem-da-tela');
    await fireEvent.scroll(rolagem, { nativeEvent: { contentOffset: { y: 300 } } });
    expect(botao()).toHaveStyle({ opacity: 0.55 });
    await fireEvent.scroll(rolagem, { nativeEvent: { contentOffset: { y: 200 } } });
    expect(botao()).not.toHaveStyle({ opacity: 0.55 });
    await fireEvent.scroll(rolagem, { nativeEvent: { contentOffset: { y: 400 } } });
    expect(botao()).toHaveStyle({ opacity: 0.55 });
    await fireEvent.press(botao());
    expect(screen.getByText('janela aberta')).toBeOnTheScreen();
    definirBotaoRecolhido(false);
  });

  test('CT-BAL-10: a tela sem a reserva do balão (telas fora das abas) não mexe no botão', async () => {
    await render(
      <AssistenteProvider>
        <Tela titulo="Detalhe">
          <Text>conteúdo</Text>
        </Tela>
        <BalaoAssistente largura={390} />
      </AssistenteProvider>,
    );
    await fireEvent.scroll(screen.getByTestId('rolagem-da-tela'), {
      nativeEvent: { contentOffset: { y: 500 } },
    });
    expect(screen.getByRole('button', { name: 'Abrir o assistente' })).not.toHaveStyle({
      opacity: 0.55,
    });
  });
});
