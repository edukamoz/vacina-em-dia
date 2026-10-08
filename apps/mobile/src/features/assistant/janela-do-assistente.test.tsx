import { fireEvent, screen } from '@testing-library/react-native';
import { Pressable, Text } from 'react-native';
import { createFakeFetch, renderScreen } from '../../test-utils';
import { AssistenteProvider, useAssistente } from './assistente-contexto';
import { JanelaDoAssistente } from './janela-do-assistente';

jest.mock('./voice-recorder', () => ({
  isVoiceSupported: () => false,
  useVoiceRecorder: () => ({ start: jest.fn(), stop: jest.fn(), cancel: jest.fn() }),
}));

function Abridor() {
  const { abrir } = useAssistente();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel="abrir-teste" onPress={abrir}>
      <Text>abrir</Text>
    </Pressable>
  );
}

describe('janela do assistente', () => {
  test('CT-ASS-01: fica escondida até abrir; abre como diálogo e fecha pelo botão', async () => {
    await renderScreen(
      <AssistenteProvider>
        <Abridor />
        <JanelaDoAssistente largura={1280} />
      </AssistenteProvider>,
      createFakeFetch({}).fetchFn,
    );
    expect(screen.queryByLabelText('Assistente')).not.toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'abrir-teste' }));
    expect(screen.getByLabelText('Assistente', { exact: true })).toBeOnTheScreen();
    expect(screen.getByText(/Eu sou o assistente do Vacina em Dia/)).toBeOnTheScreen();

    await fireEvent.press(screen.getByRole('button', { name: 'Fechar o assistente' }));
    expect(screen.queryByText(/Eu sou o assistente do Vacina em Dia/)).not.toBeVisible();
  });

  test('CT-ASS-02: no celular o véu fora da folha também fecha o assistente', async () => {
    await renderScreen(
      <AssistenteProvider inicialmenteAberto>
        <JanelaDoAssistente largura={390} />
      </AssistenteProvider>,
      createFakeFetch({}).fetchFn,
    );
    const fechar = screen.getAllByRole('button', {
      name: 'Fechar o assistente',
      includeHiddenElements: true,
    });
    expect(fechar).toHaveLength(2);
    await fireEvent.press(fechar[0]!);
    expect(screen.queryByText(/Eu sou o assistente do Vacina em Dia/)).not.toBeVisible();
  });

  test('CT-ASS-03: o contexto só funciona dentro do provedor', async () => {
    const erro = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(renderScreen(<Abridor />, createFakeFetch({}).fetchFn)).rejects.toThrow(
      'AssistenteProvider',
    );
    erro.mockRestore();
  });
});
