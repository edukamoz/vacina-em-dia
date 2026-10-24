import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { ESTADOS_DO_GRAFICO } from '../../lib/estatisticas';
import { TEXTURA_DO_ESTADO, usarPadrao, usePrefixoDePadroes } from './padroes';

function Prefixo({ nome }: { nome: string }) {
  return <Text testID={nome}>{usePrefixoDePadroes()}</Text>;
}

describe('texturas dos estados nos gráficos (CT-A11Y)', () => {
  test('CT-A11Y-06: cada estado do gráfico tem uma textura diferente, para não depender da cor', () => {
    const texturas = ESTADOS_DO_GRAFICO.map((estado) => TEXTURA_DO_ESTADO[estado]);
    expect(new Set(texturas).size).toBe(ESTADOS_DO_GRAFICO.length);
  });

  test('CT-A11Y-07: cada gráfico usa um prefixo próprio, senão os padrões de dois SVGs se confundem na web', async () => {
    await render(
      <>
        <Prefixo nome="a" />
        <Prefixo nome="b" />
      </>,
    );
    expect(screen.getByTestId('a').props.children).not.toBe(screen.getByTestId('b').props.children);
  });

  test('CT-A11Y-08: o preenchimento aponta para o padrão do estado', () => {
    expect(usarPadrao('padrao3', 'OVERDUE')).toBe('url(#padrao3-OVERDUE)');
  });
});
