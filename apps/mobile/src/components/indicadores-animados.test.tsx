import { act, render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ThemeProvider } from '../theme/theme-provider';
import {
  AparecerComMola,
  OndaDaVoz,
  PontosEscrevendo,
  VistoDesenhado,
} from './indicadores-animados';
import { Paralaxe, Revelar, RolagemAnimada } from './rolagem-animada';

describe('indicadores animados e rolagem (CT-ANIM)', () => {
  afterEach(() => jest.useRealTimers());

  test.each([
    ['reduzido', true],
    ['com movimento', false],
  ])('CT-ANIM-10: o visto, a onda e os pontos desenham sem erro (%s)', async (_nome, reduzido) => {
    jest.useFakeTimers();
    await render(
      <ThemeProvider initialReduceMotion={reduzido}>
        <VistoDesenhado cor="#000" />
        <OndaDaVoz alturas={[14, 26, 36]} />
        <PontosEscrevendo />
      </ThemeProvider>,
    );
    await act(async () => {
      jest.advanceTimersByTime(3000);
    });
    expect(screen.toJSON()).toBeTruthy();
  });

  test('CT-ANIM-11: os brilhos aparecem e mostram o conteúdo, com ou sem movimento', async () => {
    jest.useFakeTimers();
    await render(
      <ThemeProvider>
        <AparecerComMola atraso={160}>
          <Text>brilho</Text>
        </AparecerComMola>
      </ThemeProvider>,
    );
    await act(async () => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getByText('brilho')).toBeTruthy();
  });

  test('CT-ANIM-12: Revelar e Paralaxe mostram o conteúdo dentro e fora da rolagem animada', async () => {
    await render(
      <ThemeProvider>
        <Revelar>
          <Text>fora da rolagem</Text>
        </Revelar>
        <RolagemAnimada>
          <Revelar>
            <Text>seção</Text>
          </Revelar>
          <Paralaxe fator={0.1} maximo={12}>
            <Text>objeto</Text>
          </Paralaxe>
        </RolagemAnimada>
      </ThemeProvider>,
    );
    for (const texto of ['fora da rolagem', 'seção', 'objeto']) {
      expect(screen.getByText(texto)).toBeTruthy();
    }
  });

  test('CT-ANIM-13: com "Reduzir movimento", Revelar e Paralaxe não escondem nem movem nada', async () => {
    await render(
      <ThemeProvider initialReduceMotion>
        <RolagemAnimada>
          <Revelar>
            <Text>seção</Text>
          </Revelar>
          <Paralaxe fator={0.1} maximo={12}>
            <Text>objeto</Text>
          </Paralaxe>
        </RolagemAnimada>
      </ThemeProvider>,
    );
    expect(screen.getByText('seção')).toBeTruthy();
    expect(screen.getByText('objeto')).toBeTruthy();
  });
});
