import { Text } from 'react-native';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { AssistenteProvider, useAssistente } from '../features/assistant/assistente-contexto';
import { BalaoAssistente } from './balao-assistente';

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
});
