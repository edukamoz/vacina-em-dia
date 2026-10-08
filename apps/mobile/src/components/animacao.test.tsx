import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider } from '../theme/theme-provider';
import { AnelProgresso } from './anel-progresso';
import { Entrada, useProgresso } from './animacao';

function Contador({ alvo }: { alvo: number }) {
  return <Text>{`valor=${useProgresso(alvo, 600).toFixed(0)}`}</Text>;
}

describe('animações (CT-ANIM)', () => {
  afterEach(() => jest.useRealTimers());

  test('CT-ANIM-01: com "Reduzir movimento" o conteúdo aparece pronto, sem camada extra', async () => {
    await render(
      <ThemeProvider initialReduceMotion>
        <Entrada>
          <Text>pronto</Text>
        </Entrada>
      </ThemeProvider>,
    );
    expect(screen.getByText('pronto')).toBeTruthy();
  });

  test('CT-ANIM-02: sem reduzir, a entrada começa invisível, 14 px abaixo, e conclui sem erro', async () => {
    jest.useFakeTimers();
    await render(
      <ThemeProvider>
        <Entrada indice={2}>
          <Text testID="x">bloco</Text>
        </Entrada>
      </ThemeProvider>,
    );
    const opacidade = () => {
      let no = screen.getByTestId('x').parent;
      while (no && !JSON.stringify(no.props.style ?? '').includes('opacity')) no = no.parent;
      return JSON.stringify(no?.props.style);
    };
    expect(opacidade()).toContain('"opacity":0');
    expect(opacidade()).toContain('"translateY":14');
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('bloco')).toBeTruthy();
  });

  test('CT-ANIM-03: o contador sobe até o valor final e, reduzido, já começa nele', async () => {
    jest.useFakeTimers();
    await render(
      <ThemeProvider>
        <Contador alvo={5} />
      </ThemeProvider>,
    );
    expect(screen.getByText('valor=0')).toBeTruthy();
    await act(async () => {
      jest.advanceTimersByTime(1200);
    });
    expect(screen.getByText('valor=5')).toBeTruthy();
  });

  test('CT-ANIM-04: reduzido, o contador mostra o final sem esperar', async () => {
    await render(
      <ThemeProvider initialReduceMotion>
        <Contador alvo={7} />
      </ThemeProvider>,
    );
    expect(screen.getByText('valor=7')).toBeTruthy();
  });

  test('CT-ANIM-05: o anel mostra o número final e o rótulo de acessibilidade completo', async () => {
    await render(
      <ThemeProvider initialReduceMotion>
        <AnelProgresso aplicadas={2} total={5} />
      </ThemeProvider>,
    );
    expect(screen.getByLabelText('2 de 5 doses aplicadas')).toBeTruthy();
    expect(screen.getByText('2')).toBeTruthy();
  });
});
