import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useState } from 'react';
import { AvisoDeConfirmacao, TEMPO_DO_AVISO } from './aviso-de-confirmacao';
import { Chave } from './chave';
import { Segmentado } from './segmentado';
import { Aparecer, Giro } from './animacao';
import { Texto } from './texto';

describe('movimento v4 (ADR-037)', () => {
  test('CT-UI-25: o aviso de confirmação mostra a mensagem e some sozinho depois do tempo', async () => {
    jest.useFakeTimers();
    const sumiu = jest.fn();
    await render(<AvisoDeConfirmacao mensagem="BCG: dose aplicada" aoSumir={sumiu} />);
    expect(screen.getByText('BCG: dose aplicada')).toBeOnTheScreen();
    expect(screen.getByRole('alert')).toBeOnTheScreen();
    await act(async () => {
      jest.advanceTimersByTime(TEMPO_DO_AVISO + 10);
    });
    expect(sumiu).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });

  test('CT-UI-26: sem mensagem o aviso não aparece', async () => {
    await render(<AvisoDeConfirmacao mensagem={null} aoSumir={() => undefined} />);
    expect(screen.queryByRole('alert')).not.toBeOnTheScreen();
  });

  test('CT-UI-27: a chave continua anunciando ligada e desligada e avisa a troca', async () => {
    const aoAlterar = jest.fn();
    function Exemplo() {
      const [ligada, setLigada] = useState(false);
      return (
        <Chave
          rotulo="Receber lembretes"
          ligada={ligada}
          aoAlterar={(valor) => {
            aoAlterar(valor);
            setLigada(valor);
          }}
        />
      );
    }
    await render(<Exemplo />);
    expect(screen.getByRole('switch', { name: 'Receber lembretes' })).not.toBeChecked();
    expect(screen.getByText('Desligado')).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole('switch', { name: 'Receber lembretes' }));
    expect(aoAlterar).toHaveBeenCalledWith(true);
    expect(screen.getByRole('switch', { name: 'Receber lembretes' })).toBeChecked();
    expect(screen.getByText('Ligado')).toBeOnTheScreen();
  });

  test('CT-UI-28: o segmentado com a pílula continua sendo um grupo de rádios com um só marcado', async () => {
    const aoEscolher = jest.fn();
    await render(
      <Segmentado
        rotulo="Tipo"
        valor="A"
        opcoes={[
          { valor: 'A', rotulo: 'Pessoa' },
          { valor: 'B', rotulo: 'Animal' },
        ]}
        aoEscolher={aoEscolher}
      />,
    );
    expect(screen.getByRole('radio', { name: 'Pessoa' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Animal' })).not.toBeChecked();
    await fireEvent.press(screen.getByRole('radio', { name: 'Animal' }));
    expect(aoEscolher).toHaveBeenCalledWith('B');
  });

  test('CT-UI-29: Aparecer e Giro mostram o conteúdo sem esconder nada', async () => {
    await render(
      <>
        <Aparecer>
          <Texto>Lista aberta</Texto>
        </Aparecer>
        <Giro ligado>
          <Texto>Seta</Texto>
        </Giro>
      </>,
    );
    expect(screen.getByText('Lista aberta')).toBeOnTheScreen();
    expect(screen.getByText('Seta')).toBeOnTheScreen();
  });
});
