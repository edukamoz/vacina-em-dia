import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';
import { Inclinar } from './inclinar';

describe('inclinação 3D (CT-ANIM)', () => {
  test('CT-ANIM-20: fora da web o conteúdo aparece como está, sem camada extra', async () => {
    await render(
      <Inclinar graus={10}>
        <Text>cartões</Text>
      </Inclinar>,
    );
    expect(screen.getByText('cartões')).toBeOnTheScreen();
  });
});
