import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Grade } from './grade';

describe('Grade', () => {
  test('CT-UI-24: mostra todos os cartões, em duas colunas por padrão e em uma quando pedido', async () => {
    const { rerender } = await render(
      <Grade>
        <Text>um</Text>
        <Text>dois</Text>
      </Grade>,
    );
    expect(screen.getByText('um')).toBeOnTheScreen();
    expect(screen.getByText('dois')).toBeOnTheScreen();
    await rerender(
      <Grade colunas={1}>
        <Text>um</Text>
        <Text>dois</Text>
      </Grade>,
    );
    expect(screen.getByText('um')).toBeOnTheScreen();
    expect(screen.getByText('dois')).toBeOnTheScreen();
  });
});
